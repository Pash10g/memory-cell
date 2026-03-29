import { createAgentUIStreamResponse } from 'ai'
import { MongoMemoryStore } from '@/lib/memory'
import { buildMemoryAgent } from '@/lib/agent'
import clientPromise from '@/lib/mongodb'

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
