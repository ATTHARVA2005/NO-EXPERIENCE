import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { analyzeLearningProgress, type FeedbackAnalysisInput } from "@/lib/agents/feedback-analysis-agent"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const body = await request.json()
    const { studentId, sessionId, mode = "session" } = body

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 })
    }

    // Gather tutor conversation from current session
    const tutorConversation: Array<{ role: string; content: string }> = []
    if (sessionId) {
      const { data: sessionData } = await supabase
        .from("learning_sessions")
        .select("tutor_messages")
        .eq("id", sessionId)
        .single()

      if (sessionData && Array.isArray(sessionData.tutor_messages)) {
        tutorConversation.push(...sessionData.tutor_messages)
      }
    }

    // Gather recent assignment results
    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("id, topic, score, percent_correct, time_spent, student_feedback, game_results, weak_concepts")
      .eq("student_id", studentId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5)

    const assignmentResults = (assignmentData || []).map((assignment: any) => ({
      assignmentId: assignment.id,
      topic: assignment.topic,
      score: assignment.score || 0,
      percentCorrect: assignment.percent_correct || 0,
      timeSpent: assignment.time_spent,
      mistakes:
        assignment.game_results && Array.isArray(assignment.game_results)
          ? assignment.game_results.flatMap((game: any) =>
              Array.isArray(game.incorrectAnswers)
                ? game.incorrectAnswers.map((q: any) => ({
                    concept: q.concept || assignment.topic,
                    question: q.question || "",
                    studentAnswer: q.studentAnswer || "",
                    correctAnswer: q.correctAnswer || "",
                  }))
                : [],
            )
          : [],
      studentRating: assignment.student_feedback ? parseInt(assignment.student_feedback) || undefined : undefined,
    }))

    // Gather performance analytics
    const { data: analyticsData } = await supabase
      .from("performance_analytics")
      .select("average_score, weak_concepts, strong_concepts")
      .eq("student_id", studentId)
      .single()

    const recentPerformance = analyticsData
      ? {
          averageScore: analyticsData.average_score || 0,
          topicsStruggledWith: Array.isArray(analyticsData.weak_concepts) ? analyticsData.weak_concepts : [],
          topicsMastered: Array.isArray(analyticsData.strong_concepts) ? analyticsData.strong_concepts : [],
        }
      : undefined

    const analysisInput: FeedbackAnalysisInput = {
      studentId,
      sessionId,
      tutorConversation: tutorConversation.length > 0 ? tutorConversation : undefined,
      assignmentResults: assignmentResults.length > 0 ? assignmentResults : undefined,
      recentPerformance,
    }

    const feedbackAnalysis = await analyzeLearningProgress(analysisInput)

    // Save feedback to database
    try {
      await supabase.from("feedback_records").insert({
        student_id: studentId,
        session_id: sessionId || null,
        feedback_type: mode === "session" ? "session" : "assessment",
        content: {
          analysis: feedbackAnalysis,
          generatedAt: new Date().toISOString(),
        },
        student_misconceptions: feedbackAnalysis.misconceptions.map((m) => m.concept),
        learning_gaps: feedbackAnalysis.learningGaps,
        recommendations: [
          ...feedbackAnalysis.recommendationsForTutor.map((r) => r.recommendation),
          ...feedbackAnalysis.recommendationsForAssignment.map((r) => r.recommendation),
        ],
        confidence_score: feedbackAnalysis.confidenceScore / 100,
      })
    } catch (dbError) {
      console.error("[feedback] Failed to save feedback to database:", dbError)
    }

    return NextResponse.json({
      success: true,
      feedback: feedbackAnalysis,
      message: "Feedback analysis complete",
    })
  } catch (error) {
    console.error("[feedback] Analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze feedback" },
      { status: 500 },
    )
  }
}
