// Resource agent for curating personalized learning materials
import { getSupabaseClient } from "./supabase-client"
import type { Resource } from "./types"

const resourceDatabase: Resource[] = [
  {
    id: "1",
    title: "Understanding Fractions - Visual Guide",
    type: "video",
    url: "https://www.youtube.com/results?search_query=fractions+visual+guide",
    duration: "8:45",
    difficulty: "easy",
    why: "Visual representation helps understand fraction concepts",
  },
  {
    id: "2",
    title: "Mathematics: A Complete Introduction",
    type: "book",
    url: "#",
    difficulty: "medium",
    why: "Comprehensive coverage of fundamental math concepts",
  },
  {
    id: "3",
    title: "Interactive Math Exercises",
    type: "exercise",
    url: "https://www.khanacademy.org",
    difficulty: "easy",
    why: "Practice problems with immediate feedback",
  },
  {
    id: "4",
    title: "Algebra Essentials",
    type: "article",
    url: "#",
    difficulty: "medium",
    why: "Written explanations with step-by-step examples",
  },
  {
    id: "5",
    title: "Advanced Problem Solving",
    type: "video",
    url: "https://www.youtube.com",
    duration: "12:30",
    difficulty: "hard",
    why: "Complex problem-solving strategies and techniques",
  },
  {
    id: "6",
    title: "Geometry Basics",
    type: "article",
    url: "#",
    difficulty: "easy",
    why: "Foundational concepts for shape and space understanding",
  },
]

export async function recommendResources(userId: string, topicTags: string[], maxResults = 5): Promise<Resource[]> {
  const supabase = getSupabaseClient()

  // Filter resources based on topic tags
  let filteredResources = resourceDatabase

  if (topicTags.length > 0) {
    // Simple keyword matching - in production, use more sophisticated matching
    filteredResources = resourceDatabase.filter((resource) =>
      topicTags.some(
        (tag) =>
          resource.title.toLowerCase().includes(tag.toLowerCase()) ||
          resource.why.toLowerCase().includes(tag.toLowerCase()),
      ),
    )
  }

  // If no matches, return diverse resources
  if (filteredResources.length === 0) {
    filteredResources = resourceDatabase.slice(0, maxResults)
  } else {
    filteredResources = filteredResources.slice(0, maxResults)
  }

  // Save recommended resources to database
  const resourcesToSave = filteredResources.map((resource) => ({
    student_id: userId,
    title: resource.title,
    type: resource.type,
    url: resource.url,
    duration: resource.duration,
    difficulty: resource.difficulty,
    why: resource.why,
    relevance_score: 0.8,
  }))

  await supabase.from("resources").insert(resourcesToSave)

  return filteredResources
}

export async function getResourceRecommendations(userId: string): Promise<Resource[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) throw error

  return data.map((r: any) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    url: r.url,
    duration: r.duration,
    difficulty: r.difficulty,
    why: r.why,
    relevanceScore: r.relevance_score,
  }))
}
