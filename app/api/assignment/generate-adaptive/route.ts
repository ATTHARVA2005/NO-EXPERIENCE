import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateAdaptiveAssignment, type AssignmentGenerationInput } from "@/lib/agents/assignment-adaptive-agent"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const body = await request.json()
    const { studentId, topic, gradeLevel, difficulty } = body

    if (!studentId || !topic) {
      return NextResponse.json({ error: "studentId and topic are required" }, { status: 400 })
    }

    // Get student profile for learning style
    const { data: profile } = await supabase.from("student_profiles").select("learning_style").eq("id", studentId).single()

    // Fetch latest feedback insights
    const { data: latestFeedback } = await supabase
      .from("feedback_records")
      .select("content, learning_gaps, recommendations")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let feedbackInsights = undefined
    if (latestFeedback && latestFeedback.content) {
      const content = latestFeedback.content as any
      const analysis = content.analysis || {}
      feedbackInsights = {
        weakConcepts: analysis.weakConcepts || [],
        recommendedDifficulty: analysis.recommendedDifficulty,
        suggestedPracticeAreas: analysis.suggestedPracticeAreas || [],
        engagementLevel: analysis.engagementLevel,
      }
    }

    // Get previous assignment performance
    const { data: previousAssignments } = await supabase
      .from("assignments")
      .select("topic, score, student_feedback")
      .eq("student_id", studentId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5)

    const assignmentInput: AssignmentGenerationInput = {
      studentId,
      topic,
      gradeLevel: gradeLevel || 6,
      difficulty,
      feedbackInsights,
      previousAssignments: previousAssignments?.map((a: any) => ({
        topic: a.topic,
        score: a.score || 0,
        studentRating: a.student_feedback ? parseInt(a.student_feedback) : undefined,
      })),
      learningStyle: (profile?.learning_style as any) || "visual",
    }

    const assignment = await generateAdaptiveAssignment(assignmentInput)

    // Save assignment to database
    try {
      const { data: savedAssignment } = await supabase
        .from("assignments")
        .insert({
          student_id: studentId,
          title: assignment.title,
          description: assignment.description,
          topic: assignment.topic,
          difficulty: assignment.difficulty,
          estimated_time: assignment.estimatedTime,
          mini_games: assignment.miniGames,
          total_points: assignment.totalPoints,
          passing_score: assignment.passingScore,
          learning_objectives: assignment.learningObjectives,
          adapted_for: feedbackInsights || {},
          status: "pending",
        })
        .select()
        .single()

      if (savedAssignment) {
        assignment.id = savedAssignment.id
      }
    } catch (dbError) {
      console.error("[assignment] Failed to save assignment to database:", dbError)
    }

    return NextResponse.json({
      success: true,
      assignment,
      message: `Generated adaptive ${assignment.difficulty} assignment for ${topic}`,
      metadata: {
        usedFeedback: !!feedbackInsights,
        learningStyle: assignmentInput.learningStyle,
        miniGameCount: assignment.miniGames.length,
      },
    })
  } catch (error) {
    console.error("[assignment] Generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate assignment" },
      { status: 500 },
    )
  }
}
