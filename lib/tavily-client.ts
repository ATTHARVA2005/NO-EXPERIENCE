// Tavily API client for real resource search

export interface RealResource {
  title: string
  url: string
  content: string
  score: number
  publishedDate?: string
  type: "article" | "video" | "documentation" | "interactive"
}

/**
 * Search for educational resources using Tavily API directly
 */
export async function searchEducationalResources(
  topic: string,
  count: number = 5
): Promise<RealResource[]> {
  try {
    // Enhanced search query for better results
    const searchQuery = `${topic} tutorial learn explained step by step`
    
    console.log("[Tavily] Searching for:", searchQuery)
    
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY!,
        query: searchQuery,
        search_depth: "advanced",
        max_results: count * 3, // Get more results to filter
        include_answer: false,
        include_raw_content: false,
        include_domains: [
          "youtube.com",
          "youtu.be",
          "khanacademy.org",
          "developer.mozilla.org",
          "w3schools.com",
          "codecademy.com",
          "freecodecamp.org",
          "coursera.org",
          "udemy.com",
          "edx.org",
          "docs.python.org",
          "reactjs.org",
          "docs.oracle.com",
          "medium.com",
          "dev.to",
          "stackoverflow.com",
          "github.com",
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Tavily] API error:", response.status, errorText)
      throw new Error(`Tavily API error: ${response.status}`)
    }

    const data = await response.json()
    
    console.log("[Tavily] Results found:", data.results?.length || 0)
    
    const resources: RealResource[] = (data.results || [])
      .map((result: any) => {
        // Determine resource type based on URL
        let type: "article" | "video" | "documentation" | "interactive" = "article"
        let priority = 0
        
        if (result.url.includes("youtube.com") || result.url.includes("youtu.be")) {
          type = "video"
          priority = 10 // Highest priority for videos
        } else if (
          result.url.includes("developer.mozilla.org") ||
          result.url.includes("docs.") ||
          result.url.includes("/documentation") ||
          result.url.includes("oracle.com/javase")
        ) {
          type = "documentation"
          priority = 8 // High priority for official docs
        } else if (
          result.url.includes("codecademy.com") ||
          result.url.includes("khanacademy.org") ||
          result.url.includes("freecodecamp.org")
        ) {
          type = "interactive"
          priority = 7
        } else if (
          result.url.includes("medium.com") ||
          result.url.includes("dev.to") ||
          result.url.includes("stackoverflow.com")
        ) {
          type = "article"
          priority = 5
        }

        return {
          title: result.title,
          url: result.url,
          content: result.content || "",
          score: (result.score || 0) + priority, // Boost score with priority
          publishedDate: result.published_date,
          type,
        }
      })
      .sort((a: RealResource, b: RealResource) => b.score - a.score) // Sort by score (highest first)
      .slice(0, count)

    return resources
  } catch (error) {
    console.error("[Tavily] Resource search failed:", error)
    return getFallbackResources(topic, count)
  }
}

/**
 * Search for video tutorials specifically
 */
export async function searchVideoTutorials(
  topic: string,
  count: number = 3
): Promise<RealResource[]> {
  try {
    const searchQuery = `${topic} tutorial video youtube`
    
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY!,
        query: searchQuery,
        search_depth: "basic",
        max_results: count * 2,
        include_answer: false,
        include_domains: ["youtube.com", "youtu.be", "vimeo.com"],
      }),
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    return (data.results || [])
      .map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.content || "",
        score: result.score || 0,
        publishedDate: result.published_date,
        type: "video" as const,
      }))
      .slice(0, count)
  } catch (error) {
    console.error("[Tavily] Video search failed:", error)
    return []
  }
}

/**
 * Search for official documentation
 */
export async function searchDocumentation(
  topic: string,
  count: number = 2
): Promise<RealResource[]> {
  try {
    const searchQuery = `${topic} official documentation reference`
    
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY!,
        query: searchQuery,
        search_depth: "advanced",
        max_results: count * 2,
        include_answer: false,
        include_domains: [
          "developer.mozilla.org",
          "docs.python.org",
          "reactjs.org",
          "nodejs.org",
          "w3schools.com",
          "microsoft.com/docs",
        ],
      }),
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    return (data.results || [])
      .map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.content || "",
        score: result.score || 0,
        publishedDate: result.published_date,
        type: "documentation" as const,
      }))
      .slice(0, count)
  } catch (error) {
    console.error("[Tavily] Documentation search failed:", error)
    return []
  }
}

/**
 * Fallback resources when Tavily fails
 */
function getFallbackResources(topic: string, count: number): RealResource[] {
  const encodedTopic = encodeURIComponent(topic)
  
  const fallbacks: RealResource[] = [
    {
      title: `${topic} - Khan Academy`,
      url: `https://www.khanacademy.org/search?page_search_query=${encodedTopic}`,
      content: "Interactive lessons and practice exercises",
      score: 0.8,
      type: "interactive" as const,
    },
    {
      title: `${topic} Tutorial - YouTube`,
      url: `https://www.youtube.com/results?search_query=${encodedTopic}+tutorial`,
      content: "Video tutorials and explanations",
      score: 0.7,
      type: "video" as const,
    },
    {
      title: `${topic} - W3Schools`,
      url: `https://www.google.com/search?q=w3schools+${encodedTopic}`,
      content: "Documentation and examples",
      score: 0.6,
      type: "documentation" as const,
    },
  ]
  
  return fallbacks.slice(0, count)
}
