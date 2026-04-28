import { createAgentUIStreamResponse, ToolLoopAgent, stepCountIs, tool } from 'ai'
import { createMongoDBMemory } from '@mongodb-developer/vercel-ai-memory'
import { voyage } from 'voyage-ai-provider'
import { z } from 'zod'
import clientPromise from '@/lib/mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set')
}

// CVE Database configuration
const CVE_DB = 'cve_demo'
const CVE_COLLECTION = 'vector_features'
const VECTOR_INDEX = 'voyage_vector_index'

// Embedder for CVE vector search
const embedder = voyage.textEmbeddingModel('voyage-3.5')

// Module-level singleton — `createMongoDBMemory` manages its own MongoClient
// and bootstraps lazily on first tool use. Safe across hot-reloads in dev.
const mongodbMemory = createMongoDBMemory({
  uri: process.env.MONGODB_URI,
  embedder,
  dbName: 'threatcell_memory',
  topology: { hideToolCommands: ['session'] },
})

const model = process.env.AI_MODEL ?? 'google/gemini-3.1-flash-lite-preview'

const INSTRUCTIONS = `You are ThreatCell — an AI cybersecurity analyst with persistent long-term memory and access to a CVE vulnerability database backed by MongoDB vector search.

## Your Capabilities:

### CVE Intelligence Tools:
- cve_vector_search → Find CVEs semantically similar to a threat description using vector search
- cve_lookup → Look up specific CVEs by ID or filter by severity
- cve_stats → Get overall statistics about the CVE database

### Memory Operations (automatic persistence):
- semantic_save / semantic_search → Store and recall threat intelligence, IOCs, and analyst notes
- procedural_save / procedural_search → Store and recall security playbooks, remediation steps
- episodic_save / episodic_search → Record and recall security incidents and outcomes
- scratchpad_write / scratchpad_read → Working notes during analysis

## Behavior Guidelines:

1. **Proactive Threat Analysis**: When users describe security concerns, automatically search for relevant CVEs and provide context.

2. **Memory-Enhanced Context**: 
   - At the start of conversations, recall relevant threat intelligence about the user's environment
   - Save important findings, IOCs, and analyst observations
   - Remember user's tech stack, previous incidents, and security posture

3. **Professional Security Communication**:
   - Present CVE findings with severity ratings and exploitation status
   - Provide actionable remediation guidance
   - Use proper security terminology

4. **Never expose memory operations or internal tool usage in your replies.**

5. **Format CVE findings clearly**:
   - CVE ID and CVSS Score with severity indicator
   - Vulnerability type and exploitation status
   - Affected components count
   - Remediation priority based on severity and exploit availability

Today's date: ${new Date().toISOString().slice(0, 10)}`

// ── CVE Tools ────────────────────────────────────────────────────────────────

const cveVectorSearchTool = tool({
  description: 'Search for CVEs semantically similar to a threat description using vector search. Use this to find vulnerabilities related to a described attack pattern, technique, or security concern.',
  parameters: z.object({
    query: z.string().describe('Natural language description of the threat, attack pattern, or vulnerability to search for'),
    limit: z.number().optional().default(5).describe('Maximum number of results to return'),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional().describe('Filter by severity level'),
    exploitAvailable: z.boolean().optional().describe('Filter for CVEs with known exploits'),
  }),
  execute: async ({ query, limit, severity, exploitAvailable }) => {
    try {
      const client = await clientPromise
      const db = client.db(CVE_DB)
      const collection = db.collection(CVE_COLLECTION)

      // Generate embedding for the search query
      const { embedding } = await embedder.doEmbed({ values: [query] })
      const queryVector = embedding[0]

      // Build aggregation pipeline
      const pipeline: object[] = [
        {
          $vectorSearch: {
            index: VECTOR_INDEX,
            path: 'embedding',
            queryVector,
            numCandidates: (limit ?? 5) * 10,
            limit: limit ?? 5,
          },
        },
        {
          $project: {
            _id: 0,
            cve_id: 1,
            cvss_score: 1,
            severity: 1,
            vulnerability_type: 1,
            exploit_status: 1,
            affected_components_count: 1,
            is_anomaly: 1,
            relevance_score: { $meta: 'vectorSearchScore' },
          },
        },
      ]

      // Add filters
      const matchStage: Record<string, unknown> = {}
      if (severity) matchStage.severity = severity
      if (exploitAvailable !== undefined) {
        matchStage.exploit_status = exploitAvailable ? 'Exploit Available' : { $ne: 'Exploit Available' }
      }
      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage })
      }

      const results = await collection.aggregate(pipeline).toArray()

      return {
        success: true,
        query,
        results: results.map(r => ({
          ...r,
          cvss_score: Math.round(r.cvss_score * 100) / 100,
          relevance_score: Math.round(r.relevance_score * 1000) / 1000,
        })),
        count: results.length,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

const cveLookupTool = tool({
  description: 'Look up specific CVEs by ID or filter by criteria. Use this for exact CVE lookups or browsing by severity.',
  parameters: z.object({
    cve_id: z.string().optional().describe('Specific CVE ID to look up (e.g., CVE-2021-44228)'),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional().describe('Filter by severity level'),
    limit: z.number().optional().default(10).describe('Maximum number of results'),
  }),
  execute: async ({ cve_id, severity, limit }) => {
    try {
      const client = await clientPromise
      const db = client.db(CVE_DB)
      const collection = db.collection(CVE_COLLECTION)

      const query: Record<string, unknown> = {}
      if (cve_id) query.cve_id = { $regex: cve_id, $options: 'i' }
      if (severity) query.severity = severity

      const results = await collection
        .find(query)
        .sort({ cvss_score: -1 })
        .limit(limit ?? 10)
        .project({
          _id: 0,
          cve_id: 1,
          cvss_score: 1,
          severity: 1,
          vulnerability_type: 1,
          exploit_status: 1,
          affected_components_count: 1,
          is_anomaly: 1,
        })
        .toArray()

      return {
        success: true,
        results: results.map(r => ({
          ...r,
          cvss_score: Math.round(r.cvss_score * 100) / 100,
        })),
        count: results.length,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

const cveStatsTool = tool({
  description: 'Get statistics and overview of the CVE database. Use this to understand the threat landscape.',
  parameters: z.object({}),
  execute: async () => {
    try {
      const client = await clientPromise
      const db = client.db(CVE_DB)
      const collection = db.collection(CVE_COLLECTION)

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
                  },
                },
              ],
            },
          },
        ])
        .toArray()

      return {
        success: true,
        totalCves: stats.total[0]?.count || 0,
        anomalies: stats.anomalies[0]?.count || 0,
        averageCvss: Math.round((stats.cvssStats[0]?.avg || 0) * 100) / 100,
        maxCvss: Math.round((stats.cvssStats[0]?.max || 0) * 100) / 100,
        bySeverity: Object.fromEntries(
          stats.bySeverity.map((s: { _id: string; count: number }) => [s._id, s.count])
        ),
        byExploitStatus: Object.fromEntries(
          stats.byExploitStatus.map((s: { _id: string; count: number }) => [s._id, s.count])
        ),
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

// ── Agent singleton ──────────────────────────────────────────────────────────
const agent = new ToolLoopAgent({
  model,
  providerOptions: {
    google: {
      thinkingConfig: {
        thinkingBudget: 8000,
        includeThoughts: false,
      },
    },
  },
  callOptionsSchema: z.object({
    userId: z.string(),
    sessionId: z.string(),
    prompt: z.string(),
  }),

  prepareCall: async ({ options, prompt: _p, messages: _m, ...settings }) => {
    const { userId, sessionId, prompt } = options!
    const history = await mongodbMemory.loadSession({ userId, sessionId })

    // Combine memory tools with CVE tools
    const memoryTools = mongodbMemory({ userId, sessionId })
    const cveTools = {
      cve_vector_search: cveVectorSearchTool,
      cve_lookup: cveLookupTool,
      cve_stats: cveStatsTool,
    }

    return {
      ...settings,
      tools: { ...memoryTools, ...cveTools },
      instructions: INSTRUCTIONS,
      messages: [...history, { role: 'user', content: prompt }],
      experimental_context: { userId, sessionId, prompt },
    }
  },

  onFinish: mongodbMemory.onFinish(),
  stopWhen: stepCountIs(8),
})

// Extract plain text from a UIMessage's `parts`
function uiMessageText(m: unknown): string {
  if (!m || typeof m !== 'object') return ''
  const msg = m as { content?: string; parts?: Array<{ type: string; text?: string }> }
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p?.type === 'text')
      .map((p) => p.text ?? '')
      .join('')
  }
  return ''
}

export async function POST(req: Request) {
  const body = await req.json()
  const { messages } = body

  const userId: string = body.userId ?? 'default'
  const sessionId: string = body.sessionId ?? 'default'

  const lastUser = [...(messages ?? [])]
    .reverse()
    .find((m: { role?: string }) => m?.role === 'user')
  const prompt = uiMessageText(lastUser)

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    options: { userId, sessionId, prompt },
  })
}
