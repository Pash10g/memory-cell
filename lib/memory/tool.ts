import { tool } from 'ai'
import { z } from 'zod'
import { MongoMemoryStore } from './store'

const commandSchema = z.discriminatedUnion('command', [
  z.object({ command: z.literal('core_read') }),
  z.object({ command: z.literal('core_update'), content: z.string() }),
  z.object({ command: z.literal('core_append'), text: z.string() }),
  z.object({
    command: z.literal('note_add'),
    content: z.string(),
    tags: z.array(z.string()).optional(),
  }),
  z.object({ command: z.literal('note_search'), query: z.string() }),
  z.object({
    command: z.literal('conversation_search'),
    query: z.string(),
  }),
  z.object({ command: z.literal('conversation_recent') }),
])

export function buildMemoryTool(store: MongoMemoryStore) {
  return tool({
    description: `Read and write long-term memory backed by MongoDB.

Rules:
- Search before answering questions that might depend on past context.
- Store durable user facts via core_append or core_update. Keep core memory short.
- Store detailed notes via note_add.
- Search conversations via conversation_search when the user references past interactions.
- Never expose memory operations in user-facing replies.`,
    inputSchema: commandSchema,
    execute: async (input) => {
      try {
        switch (input.command) {
          case 'core_read': {
            const content = await store.readCore()
            return { output: content || '(empty)' }
          }
          case 'core_update': {
            await store.updateCore(input.content)
            return { output: 'Core memory updated.' }
          }
          case 'core_append': {
            await store.appendToCore(input.text)
            return { output: 'Appended to core memory.' }
          }
          case 'note_add': {
            await store.addNote(input.content, input.tags ?? [])
            return { output: 'Note saved.' }
          }
          case 'note_search': {
            const notes = await store.searchNotes(input.query)
            if (notes.length === 0) return { output: 'No relevant notes found.' }
            const formatted = notes
              .map((n, i) => `[${i + 1}] ${n.content}${n.tags?.length ? ` (tags: ${n.tags.join(', ')})` : ''}`)
              .join('\n')
            return { output: formatted }
          }
          case 'conversation_search': {
            const entries = await store.searchConversations(input.query)
            if (entries.length === 0) return { output: 'No relevant past conversations found.' }
            const formatted = entries
              .map((e) => `[${e.role}] ${e.content}`)
              .join('\n')
            return { output: formatted }
          }
          case 'conversation_recent': {
            const entries = await store.recentConversations(40)
            if (entries.length === 0) return { output: 'No conversation history.' }
            // Reverse to chronological order for the agent
            const formatted = [...entries]
              .reverse()
              .map((e) => `[${e.role}] ${e.content}`)
              .join('\n')
            return { output: formatted }
          }
          default:
            return { output: 'Unknown command.' }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { output: `Memory action failed: ${msg}` }
      }
    },
  })
}
