import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

const CVE_DB = 'cve_demo'
const CVE_COLLECTION = 'vector_features'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(CVE_DB)
    const collection = db.collection(CVE_COLLECTION)

    // Get aggregated statistics
    const [stats] = await collection
      .aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            bySeverity: [
              { $group: { _id: '$severity', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            byExploitStatus: [
              { $group: { _id: '$exploit_status', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            byVulnerabilityType: [
              { $group: { _id: '$vulnerability_type', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 },
            ],
            anomalies: [
              { $match: { is_anomaly: true } },
              { $count: 'count' },
            ],
            cvssStats: [
              {
                $group: {
                  _id: null,
                  avg: { $avg: '$cvss_score' },
                  max: { $max: '$cvss_score' },
                  min: { $min: '$cvss_score' },
                },
              },
            ],
            criticalCves: [
              { $match: { severity: 'CRITICAL' } },
              { $sort: { cvss_score: -1 } },
              { $limit: 5 },
              {
                $project: {
                  cve_id: 1,
                  cvss_score: 1,
                  vulnerability_type: 1,
                  exploit_status: 1,
                },
              },
            ],
          },
        },
      ])
      .toArray()

    const totalCount = stats.total[0]?.count || 0
    const anomalyCount = stats.anomalies[0]?.count || 0
    const cvssStats = stats.cvssStats[0] || { avg: 0, max: 0, min: 0 }

    return NextResponse.json({
      total: totalCount,
      anomalies: anomalyCount,
      cvss: {
        average: Math.round(cvssStats.avg * 100) / 100,
        max: Math.round(cvssStats.max * 100) / 100,
        min: Math.round(cvssStats.min * 100) / 100,
      },
      bySeverity: stats.bySeverity.map((s: { _id: string; count: number }) => ({
        severity: s._id,
        count: s.count,
      })),
      byExploitStatus: stats.byExploitStatus.map(
        (s: { _id: string; count: number }) => ({
          status: s._id,
          count: s.count,
        })
      ),
      byVulnerabilityType: stats.byVulnerabilityType.map(
        (s: { _id: string; count: number }) => ({
          type: s._id,
          count: s.count,
        })
      ),
      criticalCves: stats.criticalCves,
    })
  } catch (error) {
    console.error('CVE stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CVE statistics' },
      { status: 500 }
    )
  }
}
