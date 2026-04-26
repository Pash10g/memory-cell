import { createMongoDBMemory } from '@mongodb-developer/vercel-ai-memory'
import { voyage } from 'voyage-ai-provider'
import { ToolLoopAgent } from 'ai'

// ── 1. Create the memory instance (once, at module/server level) ──────────────
const mongodbMemory = createMongoDBMemory({
  uri: process.env.MONGODB_URI!,
  embedder: voyage.textEmbeddingModel('voyage-3.5'),
  // optional:
  dbName: 'agent_memory_standalone',        // default: 'agent_memory'
})

// ── 2. Use per-request, scoped to a user and session ─────────────────────────
const agent = new ToolLoopAgent({
  model: 'google/gemini-3.1-flash-lite-preview',
  tools: mongodbMemory({ userId: 'alice', sessionId: 'sess-001' }),
})

async function main() {
 const result = await agent.generate({
    prompt: 'My name is Alice and I love hiking. Remember that.',
  })
    console.log(result.text)
}

main().catch(console.error)