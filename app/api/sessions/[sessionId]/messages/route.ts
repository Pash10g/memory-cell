import { NextRequest } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const userId = req.nextUrl.searchParams.get('userId') ?? 'default'

  const client = await clientPromise
  const col = client.db('memory_cell_app').collection('session_memory')

  const turns = await col
    .find(
      { session_id: sessionId, user_id: userId },
      { projection: { embedding: 0 }, sort: { seq: 1 } }
    )
    .toArray()

  // Reconstruct as UIMessage-compatible objects (user + assistant turns only)
  const messages = turns
    .filter((t) => t.role === 'user' || t.role === 'assistant')
    .map((t) => ({
      id: t._id.toString(),
      role: t.role as 'user' | 'assistant',
      parts: [{ type: 'text', text: t.content as string }],
      metadata: {},
    }))

  return Response.json(messages)
}
