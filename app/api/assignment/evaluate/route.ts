// app/api/assignment/evaluate/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { evaluateAssignment } from "@/lib/agents/assignment-agent-enhanced"
import { processAssignmentFeedback } from "@/lib/agents/feedback-agent"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { studentId, assignmentId, studentAnswers } = body

    if (!studentId || !assignmentId) {
      return NextResponse.json({ error: "Student ID and Assignment ID are required" }, { status: 400 })
    }

    // Fetch assignment
    const { data: assignment, error: fetchError } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assignmentId)
      .eq("student_id", studentId)
      .single()

    if (fetchError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Evaluate assignment
    const evaluation = await evaluateAssignment(
      {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        topic: assignment.topic,
        difficulty: assignment.difficulty,
        estimatedTime: assignment.estimated_time,
        miniGames: assignment.mini_games,
        totalPoints: assignment.total_points,
        passingScore: assignment.passing_score,
        learningObjectives: assignment.learning_objectives,
        adaptedFor: assignment.adapted_for,
      },
      studentAnswers,
    )

    // Process feedback
    const feedback = await processAssignmentFeedback(user.id, {
      assignmentId,
      topic: assignment.topic,
      score: evaluation.totalScore,
      percentCorrect: evaluation.percentCorrect,
      conceptsNeedingWork: Array.from(new Set(evaluation.gameResults.flatMap((r) => r.conceptsNeedingWork))),
      conceptsMastered: Array.from(new Set(evaluation.gameResults.flatMap((r) => r.conceptsMastered))),
      timeSpent: assignment.time_spent || 0,
      gameResults: evaluation.gameResults.map((r) => ({
        gameType: r.gameId,
        performance: Math.round((r.correctAnswers / r.totalQuestions) * 100),
      })),
    })

    // Update assignment in database
    const { error: updateError } = await supabase
      .from("assessments")
      .update({
        student_answers: studentAnswers,
        score: Math.round(evaluation.totalScore),
        completed_at: new Date().toISOString(),
        student_feedback: feedback.studentFeedback,
        tutor_guidance: feedback.tutorGuidance,
        weak_concepts: Array.from(new Set(evaluation.gameResults.flatMap((r) => r.conceptsNeedingWork))),
        strong_concepts: Array.from(new Set(evaluation.gameResults.flatMap((r) => r.conceptsMastered))),
      })
      .eq("id", assignmentId)

    if (updateError) {
      console.error("[v0] Error updating assessment:", updateError)
    }

    // Save to learning history
    await supabase.from("learning_sessions").insert({
      student_id: user.id,
      type: "assessment",
      content: `Completed assignment: ${assignment.title}`,
      response: JSON.stringify(evaluation),
      duration: assignment.time_spent || 0,
    })

    return NextResponse.json({
      success: true,
      evaluation,
      feedback,
    })
  } catch (error) {
    console.error("[v0] Assignment evaluation error:", error)
    return NextResponse.json({ error: "Failed to evaluate assignment" }, { status: 500 })
  }
}
