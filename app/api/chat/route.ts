import { createAgentUIStreamResponse, ToolLoopAgent } from 'ai'
import { createMongoDBMemory } from '@mongodb-developer/vercel-ai-memory'
import { voyage } from 'voyage-ai-provider'

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set')
}

// Module-level singleton — `createMongoDBMemory` manages its own MongoClient
// and bootstraps lazily on first tool use. Safe across hot-reloads in dev.
const mongodbMemory = createMongoDBMemory({
  uri: process.env.MONGODB_URI,
  embedder: voyage.textEmbeddingModel('voyage-3.5'),
  dbName: 'memory_cell_app', // optional, defaults to 'agent_memory'
})

export async function POST(req: Request) {
  const body = await req.json()
  const { messages } = body

  // Support optional per-user/per-session scoping from the client.
  // Falls back to 'default' for single-user deployments.
  const userId: string = body.userId ?? 'default'
  const sessionId: string = body.sessionId ?? 'default'

  const agent = new ToolLoopAgent({
    model: 'google/gemini-3.1-flash-lite-preview',
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 8000,
          includeThoughts: false,
        },
      },
    },
    tools: mongodbMemory({ userId, sessionId }),
    prepareCall: async (settings) => ({
      ...settings,
      instructions: `Today is ${new Date().toISOString().slice(0, 10)}.

You are MemoryCell — an AI assistant with persistent long-term memory backed by MongoDB.

At the start of each conversation:
1. Call memory with session_recent to restore recent conversation context.
2. Call memory with semantic_search to recall relevant facts about the user.

Memory operations available to you:
- session_append / session_recent  → save and restore conversation turns
- semantic_save / semantic_search  → store and recall facts about people, entities, and user preferences
- procedural_save / procedural_search → store and recall how-to knowledge and workflows
- episodic_save / episodic_search   → record and recall significant events and outcomes
- scratchpad_write / scratchpad_read / scratchpad_promote → temporary working notes

Instructions:
- Always search memory before answering questions that reference past context.
- Proactively save important user facts with semantic_save (name, preferences, goals, etc.).
- Save significant events or outcomes with episodic_save.
- Use scratchpad_write for temporary working notes during multi-step tasks.
- Never expose memory operations or the memory system in your replies to the user.
- Respond naturally and helpfully.`,
    }),
  })

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  })
}
