import { createAgentUIStreamResponse, ToolLoopAgent } from 'ai'
import { MongoMemoryStore, buildMemoryTool } from '@/lib/memory'
import clientPromise from '@/lib/mongodb'

function buildMemoryAgent(store: MongoMemoryStore) {
  return new ToolLoopAgent({
    model: 'google/gemini-2.5-flash',
    tools: { memory: buildMemoryTool(store) },
    prepareCall: async (settings) => {
      const coreMemory = await store.readCore()
      return {
        ...settings,
        instructions: `Today is ${new Date().toISOString().slice(0, 10)}.

You are MemoryCell — an AI assistant with persistent long-term memory backed by MongoDB.

Core memory (always up-to-date facts about this user):
${coreMemory || '(no core memory stored yet)'}

Instructions:
- Before answering anything contextual, search your memory first.
- Proactively save important user facts to core memory (keep it concise).
- Save detailed information as notes.
- When the user references something from the past, search conversation history.
- Never mention the memory system or its operations to the user.
- Respond naturally and helpfully.`,
      }
    },
  })
}

// Cache store per-process (not per-request) so bootstrap runs once
let storeCache: MongoMemoryStore | null = null

async function getStore(): Promise<MongoMemoryStore> {
  if (storeCache) return storeCache
  const client = await clientPromise
  const store = new MongoMemoryStore(client)
  await store.bootstrap()
  storeCache = store
  return store
}

export async function POST(req: Request) {
  const { messages } = await req.json()

  const store = await getStore()

  // Persist the latest user message to conversation memory
  const lastMsg = messages[messages.length - 1]
  if (lastMsg?.role === 'user') {
    const text =
      lastMsg.parts
        ?.filter((p: { type: string }) => p.type === 'text')
        .map((p: { type: string; text: string }) => p.text)
        .join('') ?? lastMsg.content ?? ''

    if (text) {
      // Fire-and-forget — don't block the response
      store.appendConversation({ role: 'user', content: text }).catch(() => {})
    }
  }

  const agent = buildMemoryAgent(store)

  const response = createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    onFinish: async ({ messages: finalMessages }) => {
      // Persist the assistant reply
      const assistantMsg = [...finalMessages].reverse().find(
        (m) => m.role === 'assistant'
      )
      if (assistantMsg) {
        const text =
          assistantMsg.parts
            ?.filter((p: { type: string }) => p.type === 'text')
            .map((p: { type: string; text: string }) => p.text)
            .join('') ?? ''
        if (text) {
          store
            .appendConversation({ role: 'assistant', content: text })
            .catch(() => {})
        }
      }
    },
  })

  return response
}
