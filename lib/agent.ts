import { ToolLoopAgent } from 'ai'
import { MongoMemoryStore, buildMemoryTool } from '@/lib/memory'

export function buildMemoryAgent(store: MongoMemoryStore) {
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
