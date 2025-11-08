// Google Custom Search API for educational images
export async function searchEducationalImage(query: string, topic?: string): Promise<string | null> {
  try {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID

    if (!apiKey || !searchEngineId) {
      console.warn("[google-image-search] API credentials not configured")
      return null
    }

    const searchQuery = topic ? `${topic} ${query} educational diagram` : `${query} educational diagram`
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
      searchQuery
    )}&searchType=image&num=1&safe=active&imgSize=medium&fileType=jpg,png`

    const response = await fetch(url)
    
    if (!response.ok) {
      console.error("[google-image-search] API error:", response.statusText)
      return null
    }

    const data = await response.json()

    if (data.items && data.items.length > 0) {
      return data.items[0].link
    }

    return null
  } catch (error) {
    console.error("[google-image-search] Error:", error)
    return null
  }
}

// Search for multiple images
export async function searchEducationalImages(
  query: string,
  topic?: string,
  count: number = 3
): Promise<string[]> {
  try {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID

    if (!apiKey || !searchEngineId) {
      return []
    }

    const searchQuery = topic ? `${topic} ${query} educational diagram` : `${query} educational diagram`
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
      searchQuery
    )}&searchType=image&num=${count}&safe=active&imgSize=medium&fileType=jpg,png`

    const response = await fetch(url)
    
    if (!response.ok) {
      return []
    }

    const data = await response.json()

    if (data.items && data.items.length > 0) {
      return data.items.map((item: any) => item.link)
    }

    return []
  } catch (error) {
    console.error("[google-image-search] Error:", error)
    return []
  }
}
