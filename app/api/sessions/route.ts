import { NextRequest } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') ?? 'default'

  const client = await clientPromise
  const col = client.db('memory_cell_app').collection('session_memory')

  // Group by session_id: get first/last timestamp, preview, and message count
  const sessions = await col
    .aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: '$session_id',
          firstAt: { $min: '$created_at' },
          lastAt: { $max: '$created_at' },
          firstUserMsg: {
            $first: {
              $cond: [{ $eq: ['$role', 'user'] }, '$content', null],
            },
          },
          messageCount: { $sum: 1 },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: 50 },
    ])
    .toArray()

  // Enrich sessions that had no user message as their first document.
  // Skip internal tool-call / tool-result placeholders when picking a preview.
  const isToolPlaceholder = (content: unknown) =>
    typeof content === 'string' &&
    /^\[tool-(call|result)\b/i.test(content.trim())

  const enriched = await Promise.all(
    sessions.map(async (s) => {
      let preview = s.firstUserMsg as string | null
      if (!preview || isToolPlaceholder(preview)) {
        const firstUser = await col.findOne(
          {
            session_id: s._id,
            role: 'user',
            content: { $not: /^\[tool-(call|result)\b/i },
          },
          { sort: { created_at: 1 } }
        )
        preview = (firstUser?.content as string) ?? '(no messages)'
      }
      return {
        sessionId: s._id as string,
        firstAt: s.firstAt as Date,
        lastAt: s.lastAt as Date,
        messageCount: s.messageCount as number,
        preview: preview.slice(0, 80),
      }
    })
  )

  return Response.json(enriched)
}
