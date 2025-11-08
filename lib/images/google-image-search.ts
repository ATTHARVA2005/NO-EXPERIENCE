"use server"

/**
 * Consolidated Google Custom Search (image) helper for server-side use.
 * Uses env vars: GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID
 * 
 * Best practices:
 * - Uses URL/URLSearchParams for safe query building
 * - Includes optimal params: safe=active, imgType=photo, fileType, imgSize=medium
 * - Limits response fields to reduce payload size
 * - Returns structured metadata: url, thumbnail, title, source
 */

export interface ImageSearchResult {
  url: string
  thumbnail?: string
  title?: string
  source?: string
  contextLink?: string
}

export async function searchImages(query: string, num = 3): Promise<ImageSearchResult[]> {
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID

  if (!key || !cx) {
    throw new Error("Missing Google Custom Search API key or engine ID in environment")
  }

  // Build URL with URLSearchParams for safety
  const url = new URL("https://www.googleapis.com/customsearch/v1")
  url.searchParams.set("key", key)
  url.searchParams.set("cx", cx)
  url.searchParams.set("q", query)
  url.searchParams.set("searchType", "image")
  url.searchParams.set("num", String(num))
  url.searchParams.set("safe", "active")
  url.searchParams.set("imgSize", "medium")
  url.searchParams.set("imgType", "photo") // Prefer photos over clipart/lineart for educational content
  url.searchParams.set("fileType", "jpg,png")
  // Limit response fields to reduce payload
  url.searchParams.set("fields", "items(link,title,image/thumbnailLink,image/contextLink,displayLink)")

  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Google Custom Search failed: ${res.status} ${res.statusText} ${text}`)
  }

  const data = await res.json()
  const items = Array.isArray(data.items) ? data.items : []

  return items
    .map((it: any) => ({
      url: it.link,
      thumbnail: it.image?.thumbnailLink,
      title: it.title,
      source: it.displayLink,
      contextLink: it.image?.contextLink,
    }))
    .filter((item: ImageSearchResult) => item.url)
}
