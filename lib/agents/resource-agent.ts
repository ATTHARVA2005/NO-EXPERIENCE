"use server"

import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const resourceRecommendationSchema = z.object({
  resources: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(["video", "article", "exercise", "book", "visualization"]),
      url: z.string().optional(),
      description: z.string(),
      targetTopic: z.string(),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      duration: z.string(),
      reason: z.string().describe("Why this resource is recommended for this student"),
    }),
  ),
  learningPath: z.array(z.string()).describe("Suggested sequence of resources"),
})

async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
    },
  })
}

/**
 * Resource Agent: Recommends personalized learning resources
 */
export async function recommendResources(userId: string, weakAreas: string[], gradeLevel: number, limit = 5) {
  if (!weakAreas || weakAreas.length === 0) {
    return []
  }

  const prompt = `Recommend high-quality learning resources for a grade ${gradeLevel} student who needs to strengthen these areas: ${weakAreas.join(", ")}.

Consider:
- Video explanations (Khan Academy style)
- Interactive exercises and practice problems
- Visual diagrams and animations
- Age-appropriate textbooks and articles
- Real-world applications

Provide a learning path that builds from foundational to advanced concepts.`

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: resourceRecommendationSchema,
      prompt,
      temperature: 0.7,
      maxOutputTokens: 1500,
    })

    // Store recommendations in database
    const supabase = await getSupabaseServerClient()
    await supabase.from("resource_recommendations").insert(
      object.resources.map((r) => ({
        student_id: userId,
        title: r.title,
        type: r.type,
        url: r.url,
        description: r.description,
        reason: r.reason,
        created_at: new Date().toISOString(),
      })),
    )

    return object.resources.slice(0, limit)
  } catch (error) {
    console.error("[v0] Resource recommendation error:", error)
    return []
  }
}

/**
 * Get stored resources for a student
 */
export async function getStudentResources(userId: string, limit = 10) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("resource_recommendations")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching resources:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Resource retrieval error:", error)
    return []
  }
}
