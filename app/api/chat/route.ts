import { createAgentUIStreamResponse, ToolLoopAgent, stepCountIs } from 'ai'
import { createMongoDBMemory } from '@mongodb-developer/vercel-ai-memory'
import { voyage } from 'voyage-ai-provider'
import { z } from 'zod'

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set')
}

// Module-level singleton — `createMongoDBMemory` manages its own MongoClient
// and bootstraps lazily on first tool use. Safe across hot-reloads in dev.
//
// `topology.hideToolCommands: ['session']` hides session_append / session_recent
// from the tool surface — the runtime handles them deterministically via the
// prepareCall / onFinish hooks below.
const mongodbMemory = createMongoDBMemory({
  uri: process.env.MONGODB_URI,
  embedder: voyage.textEmbeddingModel('voyage-3.5'),
  dbName: 'memory_cell_app', // optional, defaults to 'agent_memory'
  topology: { hideToolCommands: ['session'] },
})

const model = process.env.AI_MODEL ?? 'google/gemini-3.1-flash-lite-preview'

const INSTRUCTIONS = `You are MemoryCell — an AI assistant with persistent long-term memory backed by MongoDB.

Recent conversation history is automatically restored for you at the start of every turn, and every turn is automatically saved — you do NOT need to call any session tools.

Memory operations available to you:
- semantic_save / semantic_search  → store and recall facts about people, entities, and user preferences
- procedural_save / procedural_search → store and recall how-to knowledge and workflows
- episodic_save / episodic_search   → record and recall significant events and outcomes
- scratchpad_write / scratchpad_read / scratchpad_promote → temporary working notes

Instructions:
- At the start of each conversation, call semantic_search to recall relevant facts about the user.
- Proactively save important user facts with semantic_save (name, preferences, goals, etc.).
- Save significant events or outcomes with episodic_save.
- Use scratchpad_write for temporary working notes during multi-step tasks.
- Never expose memory operations or the memory system in your replies to the user.
- Respond naturally and helpfully.`

// ── Agent singleton ──────────────────────────────────────────────────────────
// Defined once at module scope. All per-request state (userId, sessionId,
// prompt) flows in through `options` on `createAgentUIStreamResponse`, so the
// agent itself is stateless and matches the `lib/test.ts` pattern exactly.
const agent = new ToolLoopAgent({
  model,
  providerOptions: {
    google: {
      thinkingConfig: {
        thinkingBudget: 8000,
        includeThoughts: false,
      },
    },
  },
  callOptionsSchema: z.object({
    userId: z.string(),
    sessionId: z.string(),
    prompt: z.string(),
  }),

  // ── PRE hook: read history + scope tools ───────────────────────────────────
  // Identical shape to lib/test.ts — we drop the incoming `messages` (useChat's
  // full UI history) and rebuild the model input from durable MongoDB history
  // plus the new user prompt coming from `options`.
  prepareCall: async ({ options, prompt: _p, messages: _m, ...settings }) => {
    const { userId, sessionId, prompt } = options!
    const history = await mongodbMemory.loadSession({ userId, sessionId })

    return {
      ...settings,
      tools: mongodbMemory({ userId, sessionId }),
      instructions: `Today is ${new Date().toISOString().slice(0, 10)}.\n\n${INSTRUCTIONS}`,
      messages: [...history, { role: 'user', content: prompt }],
      // per-call state flows to onFinish via experimental_context
      experimental_context: { userId, sessionId, prompt },
    }
  },

  // ── POST hook: write every turn exactly once ───────────────────────────────
  onFinish: mongodbMemory.onFinish(),

  stopWhen: stepCountIs(6),
})

// Extract plain text from a UIMessage's `parts` (falling back to `content`).
function uiMessageText(m: any): string {
  if (!m) return ''
  if (typeof m.content === 'string') return m.content
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p: any) => p?.type === 'text')
      .map((p: any) => p.text ?? '')
      .join('')
  }
  return ''
}

export async function POST(req: Request) {
  const body = await req.json()
  const { messages } = body

  // Support optional per-user/per-session scoping from the client.
  // Falls back to 'default' for single-user deployments.
  const userId: string = body.userId ?? 'default'
  const sessionId: string = body.sessionId ?? 'default'

  // useChat sends the entire UI history; the *new* user turn is the last
  // user-role message. We lift its text into `options.prompt` so the agent's
  // `prepareCall` hook stays byte-for-byte identical to lib/test.ts.
  const lastUser = [...(messages ?? [])]
    .reverse()
    .find((m: any) => m?.role === 'user')
  const prompt = uiMessageText(lastUser)

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    options: { userId, sessionId, prompt },
  })
}
