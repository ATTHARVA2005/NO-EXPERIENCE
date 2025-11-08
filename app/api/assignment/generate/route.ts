// app/api/assignment/generate/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { generateAssignment } from "@/lib/agents/assignment-agent-enhanced"
import { analyzeStudentPerformance } from "@/lib/agents/feedback-agent"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const body = await request.json()
    const { topic, gradeLevel, studentId, includeFeedbackAnalysis = true } = body

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    // Fetch student profile and history
    const { data: studentProfile } = await supabase.from("student_profiles").select("*").eq("id", studentId).single()

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    let feedbackAnalysis = null

    // Get feedback analysis if requested
    if (includeFeedbackAnalysis) {
      const { data: tutorSessions } = await supabase
        .from("tutor_sessions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(5)

      const { data: assessments } = await supabase
        .from("assessments")
        .select("*")
        .eq("student_id", studentId)
        .order("completed_at", { ascending: false })
        .limit(5)

      feedbackAnalysis = await analyzeStudentPerformance(
        studentId,
        tutorSessions && tutorSessions.length > 0
          ? {
              topicsCovered: tutorSessions.flatMap((s) => s.topics_discussed || []),
              strugglingAreas: [],
              sessionCount: tutorSessions.length,
              averageEngagement: 75,
            }
          : undefined,
        assessments && assessments.length > 0
          ? {
              recentScores: assessments.map((a) => a.score || 0),
              weakConcepts: [],
              strongConcepts: [],
              completionRate: (assessments.filter((a) => a.completed_at).length / assessments.length) * 100,
            }
          : undefined,
      )
    }

    // Generate assignment using feedback or defaults
    const assignment = await generateAssignment({
      studentId,
      topic,
      gradeLevel: gradeLevel || studentProfile.grade_level || 6,
      topicProgress: 50,
      strugglingConcepts: [],
      masteredConcepts: [],
      studentEngagement: "medium",
      learningStyle: studentProfile.learning_style || "visual",
    })

    return NextResponse.json({
      success: true,
      assignment,
      feedbackAnalysis,
    })
  } catch (error) {
    console.error("Assignment generation error:", error)
    return NextResponse.json({ error: "Failed to generate assignment" }, { status: 500 })
  }
}
