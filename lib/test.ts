import { createMongoDBMemory } from '@mongodb-developer/vercel-ai-memory'
import { voyage } from 'voyage-ai-provider'
import { ToolLoopAgent,stepCountIs } from 'ai'
import { z } from 'zod'



// Usage

// ── 1. Create the memory instance (once, at module/server level) ──────────────
const mongodbMemory = createMongoDBMemory({
  uri: process.env.MONGODB_URI!,
  embedder: voyage.textEmbeddingModel('voyage-3.5'),
  // Remove session_append / session_recent from the tool surface —
  // the runtime will handle them deterministically.
  topology: { hideToolCommands: ['session'] },
  // optional:
  dbName: 'agent_memory_standalone',        // default: 'agent_memory'
})

// ── 2. Use per-request, scoped to a user and session ─────────────────────────
const agent = new ToolLoopAgent({
  model: 'google/gemini-3.1-flash-lite-preview',
   callOptionsSchema: z.object({
    userId: z.string(),
    sessionId: z.string(),
    prompt: z.string(),
  }),

  // ── PRE hook: read history + scope onFinish ─────────────────────────────────
  prepareCall: async ({ options, prompt: _p, messages: _m, ...settings }) => {
    const { userId, sessionId, prompt } = options!
    const history = await mongodbMemory.loadSession({ userId, sessionId })

    return {
      ...settings,
      tools: mongodbMemory({ userId, sessionId }),
      messages: [...history, { role: 'user', content: prompt }],
      // per-call state flows to onFinish via experimental_context
      experimental_context: { userId, sessionId, prompt },
    }
  },

  // ── POST hook: write every turn exactly once ────────────────────────────────
  onFinish: mongodbMemory.onFinish(),

  stopWhen: stepCountIs(6),
})

async function main() {
 const result = await agent.generate({
  prompt: 'Hi! My name is Alex.',
  options: { userId: 'alice', sessionId: 'sess-001', prompt: 'Hi! My name is Alex.' },
})
    console.log(result.text)
}

main().catch(console.error)