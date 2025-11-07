import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { analyzeStudentPerformance } from "@/lib/agents/feedback-agent"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const body = await request.json()
    const { studentId, topic } = body

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const { data: sessions } = await supabase
      .from("learning_sessions")
      .select("performance_data, topic, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(10)

    const { data: assessments } = await supabase
      .from("assessments")
      .select("score, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(10)

    const tutorData = sessions
      ? {
          topicsCovered: sessions.map((s) => s.topic).filter(Boolean),
          strugglingAreas: [],
          sessionCount: sessions.length,
          averageEngagement: sessions.length
            ? Math.round(
                sessions.reduce((sum, s) => sum + (s.performance_data?.engagementLevel || 50), 0) / sessions.length,
              )
            : 50,
        }
      : undefined

    const assessmentData = assessments
      ? {
          recentScores: assessments.map((a) => a.score || 0),
          weakConcepts: [],
          strongConcepts: [],
          completionRate: assessments.length > 0 ? 100 : 0,
        }
      : undefined

    const analysis = await analyzeStudentPerformance(studentId, tutorData, assessmentData)

    return NextResponse.json({
      success: true,
      analysis,
      studentData: {
        tutorSessions: sessions?.length || 0,
        assessmentsTaken: assessments?.length || 0,
        engagementLevel: analysis.engagementLevel,
      },
    })
  } catch (error) {
    console.error("[v0] Performance analytics error:", error)
    return NextResponse.json({ error: "Failed to analyze performance" }, { status: 500 })
  }
}
