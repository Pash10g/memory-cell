import { tool } from 'ai'
import { z } from 'zod'
import { MongoMemoryStore } from './store'

// Flat schema — Gemini does not reliably handle discriminatedUnion.
// We use a single object with an enum command and nullable optional fields,
// then enforce per-command requirements manually in execute().
const commandSchema = z.object({
  command: z.enum([
    'core_read',
    'core_update',
    'core_append',
    'note_add',
    'note_search',
    'conversation_search',
    'conversation_recent',
  ]).describe(
    'The memory operation to perform. Always include this field.'
  ),
  // core_update: full replacement content
  content: z.string().nullable().optional().describe(
    'For core_update and note_add: the text content to save.'
  ),
  // core_append: text to append
  text: z.string().nullable().optional().describe(
    'For core_append: the text to append to core memory.'
  ),
  // note_add: optional tags
  tags: z.array(z.string()).nullable().optional().describe(
    'For note_add: optional list of tags.'
  ),
  // note_search / conversation_search: semantic query
  query: z.string().nullable().optional().describe(
    'For note_search and conversation_search: the search query string.'
  ),
})

export function buildMemoryTool(store: MongoMemoryStore) {
  return tool({
    description: `Read and write long-term persistent memory backed by MongoDB + Voyage AI embeddings.

Commands:
- core_read            → Read all stored facts about the user (no extra fields needed)
- core_update {content}→ Replace core memory with new content
- core_append {text}   → Append a new fact to core memory
- note_add {content, tags?} → Save a detailed note with optional tags
- note_search {query}  → Semantic search over saved notes
- conversation_search {query} → Semantic search over past conversations
- conversation_recent  → Fetch the 40 most recent conversation turns

Rules:
- Always call core_read at the start of a session before answering user questions.
- Use core_append to save new durable user facts (name, preferences, etc.).
- Never expose memory operations in your replies to the user.`,
    inputSchema: commandSchema,
    execute: async (input) => {
      try {
        switch (input.command) {
          case 'core_read': {
            const content = await store.readCore()
            return { output: content || '(empty)' }
          }
          case 'core_update': {
            const content = input.content ?? ''
            await store.updateCore(content)
            return { output: 'Core memory updated.' }
          }
          case 'core_append': {
            const text = input.text ?? input.content ?? ''
            if (!text) return { output: 'Nothing to append.' }
            await store.appendToCore(text)
            return { output: 'Appended to core memory.' }
          }
          case 'note_add': {
            const content = input.content ?? input.text ?? ''
            if (!content) return { output: 'Note content is empty.' }
            await store.addNote(content, input.tags ?? [])
            return { output: 'Note saved.' }
          }
          case 'note_search': {
            const query = input.query ?? ''
            if (!query) return { output: 'No query provided.' }
            const notes = await store.searchNotes(query)
            if (notes.length === 0) return { output: 'No relevant notes found.' }
            const formatted = notes
              .map((n, i) => `[${i + 1}] ${n.content}${n.tags?.length ? ` (tags: ${n.tags.join(', ')})` : ''}`)
              .join('\n')
            return { output: formatted }
          }
          case 'conversation_search': {
            const query = input.query ?? ''
            if (!query) return { output: 'No query provided.' }
            const entries = await store.searchConversations(query)
            if (entries.length === 0) return { output: 'No relevant past conversations found.' }
            const formatted = entries
              .map((e) => `[${e.role}] ${e.content}`)
              .join('\n')
            return { output: formatted }
          }
          case 'conversation_recent': {
            const entries = await store.recentConversations(40)
            if (entries.length === 0) return { output: 'No conversation history.' }
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
