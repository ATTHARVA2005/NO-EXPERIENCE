import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const { data: analytics } = await supabase
      .from("performance_analytics")
      .select("*")
      .eq("student_id", studentId)
      .order("last_session_date", { ascending: false })

    const { data: recentSessions } = await supabase
      .from("learning_sessions")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5)

    const totalSessions = recentSessions?.length || 0
    const averageScore =
      analytics && analytics.length > 0
        ? Math.round(analytics.reduce((sum, a) => sum + (a.average_score || 0), 0) / analytics.length)
        : 0

    const topicsLearned = analytics ? analytics.map((a) => a.topic).filter(Boolean) : []

    const strengths =
      analytics
        ?.flatMap((a) => a.strong_concepts || [])
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5) || []

    const areasToImprove =
      analytics
        ?.flatMap((a) => a.weak_concepts || [])
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5) || []

    return NextResponse.json({
      success: true,
      progressData: {
        totalSessions,
        averageScore,
        topicsLearned,
        strengths,
        areasToImprove,
        recentActivity: recentSessions || [],
      },
    })
  } catch (error) {
    console.error("[v0] Progress endpoint error:", error)
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
  }
}
