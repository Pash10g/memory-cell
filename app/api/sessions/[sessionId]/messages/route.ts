import { NextRequest } from 'next/server'
import clientPromise from '@/lib/mongodb'

// Persisted session_memory rows look like:
//   { role: 'user',      content: '<text>' }
//   { role: 'assistant', content: '<text>' }                       // real reply
//   { role: 'assistant', content: '[tool-call: memory]' }          // stub: a tool was invoked
//   { role: 'tool',      tool_name: 'memory', content: '{"output":"…"}' }  // tool result
//
// We rebuild UIMessage[] so that the existing chat UI (MessageBubble +
// MemoryTrace) can render historical threads identically to a live chat:
// each assistant text message carries the tool-call/result parts produced
// during *its* turn.

type ToolPart = {
  type: string // e.g. 'tool-memory'
  toolCallId: string
  state: 'output-available' | 'output-error'
  input: Record<string, unknown>
  output?: unknown
  errorText?: string
}
type TextPart = { type: 'text'; text: string }
type UIPart = TextPart | ToolPart

const isToolPart = (p: UIPart): p is ToolPart =>
  typeof p.type === 'string' && p.type.startsWith('tool-')

type UIMessage = {
  id: string
  role: 'user' | 'assistant'
  parts: UIPart[]
  metadata: Record<string, unknown>
}

const isToolCallStub = (content: unknown) =>
  typeof content === 'string' &&
  /^\[tool-call\b/i.test(content.trim())

function parseToolOutput(raw: unknown): { output?: unknown; errorText?: string } {
  if (typeof raw !== 'string') return { output: raw }
  const trimmed = raw.trim()
  if (!trimmed) return { output: '' }
  try {
    const parsed = JSON.parse(trimmed)
    return { output: parsed }
  } catch {
    return { output: trimmed }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const userId = req.nextUrl.searchParams.get('userId') ?? 'default'

  const client = await clientPromise
  const col = client.db('memory_cell_app').collection('session_memory')

  const turns = await col
    .find(
      { session_id: sessionId, user_id: userId },
      { projection: { embedding: 0 }, sort: { seq: 1 } }
    )
    .toArray()

  const messages: UIMessage[] = []
  // Tool parts accumulated during the current assistant "turn", waiting to be
  // attached to the next real assistant text message.
  let pendingToolParts: UIPart[] = []
  // The most recent assistant tool-call stub row id, used as a stable key
  // when pairing with its following tool-result row.
  let pendingCallId: string | null = null
  let pendingToolName: string | null = null

  const flushOrphanToolParts = () => {
    if (pendingToolParts.length === 0) return
    // Orphan tool activity with no assistant text — surface it anyway as an
    // empty assistant bubble that only shows the memory trace.
    messages.push({
      id: `tools-${messages.length}`,
      role: 'assistant',
      parts: pendingToolParts,
      metadata: {},
    })
    pendingToolParts = []
    pendingCallId = null
    pendingToolName = null
  }

  for (const t of turns) {
    const role = t.role as string
    const content = t.content as unknown
    const toolName = (t.tool_name as string | null) ?? 'memory'

    if (role === 'user') {
      flushOrphanToolParts()
      if (typeof content === 'string' && content.trim().length > 0) {
        messages.push({
          id: t._id.toString(),
          role: 'user',
          parts: [{ type: 'text', text: content }],
          metadata: {},
        })
      }
      continue
    }

    if (role === 'assistant') {
      if (isToolCallStub(content)) {
        // Open a new tool-call slot; the result row that follows will fill it.
        pendingCallId = t._id.toString()
        pendingToolName = toolName
        pendingToolParts.push({
          type: `tool-${toolName}`,
          toolCallId: pendingCallId,
          state: 'output-available',
          input: {},
          output: undefined,
        })
        continue
      }

      // Real assistant text — attach any pending tool parts collected during
      // this turn so <MemoryTrace/> renders them under this bubble.
      if (typeof content === 'string' && content.trim().length > 0) {
        messages.push({
          id: t._id.toString(),
          role: 'assistant',
          parts: [
            ...pendingToolParts,
            { type: 'text', text: content },
          ],
          metadata: {},
        })
        pendingToolParts = []
        pendingCallId = null
        pendingToolName = null
      }
      continue
    }

    if (role === 'tool') {
      // Attach this tool result to the most recently opened tool-call slot.
      const { output, errorText } = parseToolOutput(content)
      const last = pendingToolParts[pendingToolParts.length - 1]
      if (last && isToolPart(last)) {
        last.output = output
        if (errorText) {
          last.state = 'output-error'
          last.errorText = errorText
        }
      } else {
        // No pending call for this result — synthesize a standalone tool part.
        pendingToolParts.push({
          type: `tool-${toolName}`,
          toolCallId: t._id.toString(),
          state: errorText ? 'output-error' : 'output-available',
          input: {},
          output,
          errorText,
        })
      }
      continue
    }
    // other roles (system etc.) — ignore
  }

  // Trailing tool activity with no closing assistant text.
  flushOrphanToolParts()

  return Response.json(messages)
}
