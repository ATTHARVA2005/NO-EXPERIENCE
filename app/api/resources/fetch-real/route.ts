import { searchEducationalResources, searchVideoTutorials, searchDocumentation } from "@/lib/tavily-client"
import { resourceIdFromUrl } from "@/lib/utils"

export async function POST(request: Request) {
  try {
    const { topic, count = 6 } = await request.json()

    if (!topic) {
      return Response.json({ success: false, error: "Topic is required" }, { status: 400 })
    }

    // Use Tavily to get real resources
    const [generalResources, videos, docs] = await Promise.all([
      searchEducationalResources(topic, Math.floor(count / 2)),
      searchVideoTutorials(topic, 2),
      searchDocumentation(topic, 1),
    ])

    // Combine and deduplicate
    const allResources = [...videos, ...docs, ...generalResources]
    const uniqueResources = Array.from(
      new Map(allResources.map((r) => [r.url, r])).values()
    ).slice(0, count)

    // Transform to our format with additional metadata
    const resources = uniqueResources.map((resource) => ({
      id: resourceIdFromUrl(resource.url),
      title: resource.title,
      type: resource.type,
      url: resource.url,
      description: resource.content.slice(0, 200), // First 200 chars as description
      platform: extractPlatform(resource.url),
      duration: resource.type === "video" ? "10-15 min" : undefined,
    }))

    return Response.json({
      success: true,
      resources,
      source: "tavily",
    })
  } catch (error) {
    console.error("[fetch-real-resources] Error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch resources",
      },
      { status: 500 }
    )
  }
}

function extractPlatform(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube"
  if (url.includes("khanacademy.org")) return "Khan Academy"
  if (url.includes("developer.mozilla.org")) return "MDN"
  if (url.includes("w3schools.com")) return "W3Schools"
  if (url.includes("codecademy.com")) return "Codecademy"
  if (url.includes("freecodecamp.org")) return "freeCodeCamp"
  if (url.includes("coursera.org")) return "Coursera"
  if (url.includes("udemy.com")) return "Udemy"
  if (url.includes("docs.python.org")) return "Python Docs"
  if (url.includes("reactjs.org")) return "React Docs"
  return "Web"
}
