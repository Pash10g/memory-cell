import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { voyage } from 'voyage-ai-provider'

const CVE_DB = 'cve_demo'
const CVE_COLLECTION = 'vector_features'
const VECTOR_INDEX = 'voyage_vector_index'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { query, limit = 10, filters } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db(CVE_DB)
    const collection = db.collection(CVE_COLLECTION)

    // Generate embedding for the search query using Voyage AI
    const embedder = voyage.textEmbeddingModel('voyage-3.5')
    const { embedding } = await embedder.doEmbed({ values: [query] })
    const queryVector = embedding[0]

    // Build aggregation pipeline with vector search
    const pipeline: object[] = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: 'embedding',
          queryVector,
          numCandidates: limit * 10,
          limit: limit,
        },
      },
      {
        $project: {
          _id: 1,
          cve_id: 1,
          cvss_score: 1,
          severity: 1,
          vulnerability_type: 1,
          exploit_status: 1,
          affected_components_count: 1,
          is_anomaly: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]

    // Add filters if provided
    if (filters) {
      const matchStage: Record<string, unknown> = {}
      
      if (filters.severity) {
        matchStage.severity = filters.severity
      }
      if (filters.minCvss !== undefined) {
        matchStage.cvss_score = { $gte: filters.minCvss }
      }
      if (filters.maxCvss !== undefined) {
        matchStage.cvss_score = {
          ...(matchStage.cvss_score as object || {}),
          $lte: filters.maxCvss,
        }
      }
      if (filters.exploitStatus) {
        matchStage.exploit_status = filters.exploitStatus
      }
      if (filters.vulnerabilityType) {
        matchStage.vulnerability_type = filters.vulnerabilityType
      }
      if (filters.isAnomaly !== undefined) {
        matchStage.is_anomaly = filters.isAnomaly
      }

      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage })
      }
    }

    const results = await collection.aggregate(pipeline).toArray()

    return NextResponse.json({
      results,
      count: results.length,
      query,
    })
  } catch (error) {
    console.error('CVE vector search error:', error)
    return NextResponse.json(
      { error: 'Failed to search CVE database' },
      { status: 500 }
    )
  }
}

// GET endpoint for simple text-based CVE lookup
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const cveId = searchParams.get('cve_id')
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') || '20')

    const client = await clientPromise
    const db = client.db(CVE_DB)
    const collection = db.collection(CVE_COLLECTION)

    const query: Record<string, unknown> = {}
    
    if (cveId) {
      query.cve_id = { $regex: cveId, $options: 'i' }
    }
    if (severity) {
      query.severity = severity.toUpperCase()
    }

    const results = await collection
      .find(query)
      .sort({ cvss_score: -1 })
      .limit(limit)
      .project({
        _id: 1,
        cve_id: 1,
        cvss_score: 1,
        severity: 1,
        vulnerability_type: 1,
        exploit_status: 1,
        affected_components_count: 1,
        is_anomaly: 1,
      })
      .toArray()

    return NextResponse.json({
      results,
      count: results.length,
    })
  } catch (error) {
    console.error('CVE lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to lookup CVE' },
      { status: 500 }
    )
  }
}
