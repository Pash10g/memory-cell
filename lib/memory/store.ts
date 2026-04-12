import { MongoClient, Db, Collection, ObjectId } from 'mongodb'
import { embedDocument, embedQuery } from './embeddings'

export interface CoreMemory {
  _id: string
  content: string
  updatedAt: Date
}

export interface Note {
  _id: ObjectId
  content: string
  tags: string[]
  embedding?: number[]
  createdAt: Date
  score?: number
}

export interface ConversationEntry {
  _id: ObjectId
  role: 'user' | 'assistant'
  content: string
  embedding?: number[]
  timestamp: Date
  score?: number
}

const DB_NAME = 'agent_memory'
const COL_CORE = 'memory_core'
const COL_NOTES = 'memory_notes'
const COL_CONV = 'memory_conversations'
const NOTES_INDEX = 'notes_vector_index'
const CONV_INDEX = 'conversations_vector_index'
const VECTOR_DIMS = 1024

export class MongoMemoryStore {
  private db: Db
  private core: Collection<CoreMemory>
  private notes: Collection<Note>
  private conversations: Collection<ConversationEntry>

  constructor(client: MongoClient, dbName = DB_NAME) {
    this.db = client.db(dbName)
    this.core = this.db.collection<CoreMemory>(COL_CORE)
    this.notes = this.db.collection<Note>(COL_NOTES)
    this.conversations = this.db.collection<ConversationEntry>(COL_CONV)
  }

  /** Idempotent setup — creates indexes and ensures core singleton */
  async bootstrap(): Promise<void> {
    // TTL index for conversations (90 days)
    await this.conversations.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 7_776_000, background: true }
    )

    // Atlas Vector Search indexes (async on Atlas — may not be queryable immediately)
    const createVectorIndex = async (
      collection: string,
      indexName: string
    ) => {
      try {
        await this.db.command({
          createSearchIndexes: collection,
          indexes: [
            {
              name: indexName,
              type: 'vectorSearch',
              definition: {
                fields: [
                  {
                    type: 'vector',
                    path: 'embedding',
                    numDimensions: VECTOR_DIMS,
                    similarity: 'cosine',
                  },
                ],
              },
            },
          ],
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        // Ignore "already exists" errors
        if (!msg.includes('already exists') && !msg.includes('Duplicate')) {
          console.warn(`[MemoryCell] Vector index warning (${indexName}): ${msg}`)
        }
      }
    }

    await createVectorIndex(COL_NOTES, NOTES_INDEX)
    await createVectorIndex(COL_CONV, CONV_INDEX)

    // Ensure core singleton
    await this.core.updateOne(
      { _id: 'singleton' },
      {
        $setOnInsert: {
          _id: 'singleton',
          content: '',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )
  }

  // ---- Core memory --------------------------------------------------------

  async readCore(): Promise<string> {
    const doc = await this.core.findOne({ _id: 'singleton' })
    return doc?.content ?? ''
  }

  async updateCore(content: string): Promise<void> {
    await this.core.updateOne(
      { _id: 'singleton' },
      { $set: { content, updatedAt: new Date() } },
      { upsert: true }
    )
  }

  async appendToCore(text: string): Promise<void> {
    const current = await this.readCore()
    const updated = current ? `${current}\n${text}` : text
    await this.updateCore(updated)
  }

  // ---- Notes --------------------------------------------------------------

  async addNote(content: string, tags: string[] = []): Promise<void> {
    const embedding = await embedDocument(content)
    await this.notes.insertOne({
      _id: new ObjectId(),
      content,
      tags,
      embedding,
      createdAt: new Date(),
    })
  }

  async searchNotes(query: string, limit = 5): Promise<Note[]> {
    const queryVector = await embedQuery(query)
    const results = await this.notes
      .aggregate<Note>([
        {
          $vectorSearch: {
            index: NOTES_INDEX,
            path: 'embedding',
            queryVector,
            numCandidates: limit * 10,
            limit,
          },
        },
        {
          $project: {
            embedding: 0,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray()
    return results
  }

  // ---- Conversations ------------------------------------------------------

  async appendConversation(entry: {
    role: 'user' | 'assistant'
    content: string
  }): Promise<void> {
    const embedding = await embedDocument(entry.content)
    await this.conversations.insertOne({
      _id: new ObjectId(),
      role: entry.role,
      content: entry.content,
      embedding,
      timestamp: new Date(),
    })
  }

  async searchConversations(
    query: string,
    limit = 10
  ): Promise<ConversationEntry[]> {
    const queryVector = await embedQuery(query)
    const results = await this.conversations
      .aggregate<ConversationEntry>([
        {
          $vectorSearch: {
            index: CONV_INDEX,
            path: 'embedding',
            queryVector,
            numCandidates: limit * 10,
            limit,
          },
        },
        {
          $project: {
            embedding: 0,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray()
    return results
  }

  async recentConversations(limit = 40): Promise<ConversationEntry[]> {
    return this.conversations
      .find(
        {},
        {
          projection: { embedding: 0 },
          sort: { timestamp: -1 },
          limit,
        }
      )
      .toArray()
  }
}
