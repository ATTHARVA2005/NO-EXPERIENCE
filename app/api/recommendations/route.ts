import { type NextRequest, NextResponse } from "next/server"
import { generatePersonalizedRecommendations } from "@/lib/system-integration"
import { getSupabaseServer } from "@/lib/supabase-server"

/**
 * GET /api/recommendations
 * Get personalized learning recommendations for a student
 */
export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId parameter" }, { status: 400 })
    }

    const supabase = await getSupabaseServer()

    // Fetch student profile
    const { data: student } = await supabase
      .from("student_profiles")
      .select("grade_level, learning_style")
      .eq("id", studentId)
      .single()

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Fetch recent topics
    const { data: sessions } = await supabase
      .from("learning_sessions")
      .select("topic")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5)

    const recentTopics = sessions?.map((s) => s.topic) || []

    // Fetch weak areas (low performance topics)
    const { data: assessments } = await supabase
      .from("assessments")
      .select("topic, score, total_questions")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(20)

    const weakAreas =
      assessments
        ?.filter((a) => a.score / a.total_questions < 0.7)
        .map((a) => a.topic)
        .slice(0, 3) || []

    // Generate recommendations
    const recommendations = await generatePersonalizedRecommendations(
      student.grade_level,
      student.learning_style || "mixed",
      recentTopics,
      weakAreas,
    )

    return NextResponse.json({
      success: true,
      recommendations,
      studentProfile: {
        gradeLevel: student.grade_level,
        learningStyle: student.learning_style,
        recentTopics,
        weakAreas,
      },
    })
  } catch (error) {
    console.error("[v0] Recommendations API error:", error)
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
