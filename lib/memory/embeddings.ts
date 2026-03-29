const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'

interface VoyageResponse {
  data: { embedding: number[] }[]
}

async function embed(
  text: string,
  model: string,
  inputType: 'document' | 'query'
): Promise<number[]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: [text], model, input_type: inputType }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage AI error ${res.status}: ${err}`)
  }

  const json: VoyageResponse = await res.json()
  return json.data[0].embedding
}

/** Embed a document (note or conversation turn) using voyage-4 */
export async function embedDocument(text: string): Promise<number[]> {
  return embed(text, 'voyage-4', 'document')
}

/** Embed a search query using voyage-4-lite (same vector space, faster) */
export async function embedQuery(text: string): Promise<number[]> {
  return embed(text, 'voyage-4-lite', 'query')
}
