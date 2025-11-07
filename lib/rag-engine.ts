import { google } from "@ai-sdk/google"
import { cosineSimilarity, embed } from "ai"

export interface RagChunk {
  id: string
  source: string
  content: string
  score?: number
}

const EMBEDDING_MODEL = "text-embedding-005"

const hasEmbeddingSupport = Boolean(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY,
)

export function splitIntoChunks(text: string, chunkSize = 750, overlap = 100): string[] {
  if (!text) return []
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim()

  if (!normalized) return []

  const chunks: string[] = []
  let start = 0
  const length = normalized.length

  while (start < length) {
    const end = Math.min(start + chunkSize, length)
    const chunk = normalized.slice(start, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }
    if (end === length) {
      break
    }
    start = end - overlap
    if (start < 0) {
      start = 0
    }
  }

  return chunks
}

export async function rankRagChunks(query: string, candidates: RagChunk[], maxResults = 4): Promise<RagChunk[]> {
  if (!query.trim() || candidates.length === 0) {
    return []
  }

  if (!hasEmbeddingSupport) {
    return candidates.slice(0, maxResults)
  }

  try {
    const { embedding: queryEmbedding } = await embed({
      model: google(EMBEDDING_MODEL),
      value: query,
    })

    const scored = await Promise.all(
      candidates.map(async (chunk) => {
        const { embedding } = await embed({
          model: google(EMBEDDING_MODEL),
          value: chunk.content,
        })

        return {
          chunk,
          score: cosineSimilarity(queryEmbedding, embedding),
        }
      }),
    )

    return scored
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, maxResults)
      .map(({ chunk, score }) => ({ ...chunk, score }))
  } catch (error) {
    console.warn("[rag] Failed to compute embeddings, falling back to naive selection", error)
    return candidates.slice(0, maxResults)
  }
}
