import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { analyzeStudentPerformance, generateAssessmentSummary } from "@/lib/agents/feedback-agent"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const body = await request.json()
    const { studentId, answers, topic } = body

    // Mock feedback generation - replace with actual evaluation logic
    const score = Math.random() * 100
    const correctCount = Math.round((score / 100) * 4)

    const feedbackItems = Array.from({ length: 4 }).map((_, i) => ({
      isCorrect: i < correctCount,
      correctnessScore: i < correctCount ? 100 : 0,
      reasoning: `Question ${i + 1} evaluation`,
      learningGap: i < correctCount ? undefined : `Area ${i} needs review`,
    }))

    // Analyze performance
    const performanceAnalysis = await analyzeStudentPerformance(studentId, {
      topicsCovered: [topic],
      strugglingAreas: feedbackItems
        .filter((f) => !f.isCorrect)
        .map((_, i) => `Concept ${i}`)
        .filter(Boolean),
      sessionCount: 1,
      averageEngagement: 75,
    })

    // Generate summary
    const summary = await generateAssessmentSummary(feedbackItems, topic, 6)

    const { data: assessment } = await supabase
      .from("assessments")
      .insert([
        {
          student_id: studentId,
          topic,
          difficulty: "medium",
          questions: [],
          student_answers: answers,
          score: Math.round(score),
        },
      ])
      .select()
      .single()

    // Save feedback records
    if (assessment) {
      await supabase.from("feedback_records").insert([
        {
          student_id: studentId,
          assessment_id: assessment.id,
          feedback_type: "assessment",
          content: {
            summary,
            performanceAnalysis,
          },
          confidence_score: 0.85,
        },
      ])
    }

    return NextResponse.json({
      stats: {
        averageScore: Math.round(score),
        topicsCovered: [topic],
        engagementLevel: 75,
        totalDuration: 15,
        nextTopicsRecommended: performanceAnalysis.focusAreas,
      },
      feedback: {
        studentMessage: summary.overallAssessment,
        tutorGuidance: `Focus on: ${performanceAnalysis.focusAreas.join(", ")}`,
        nextTopics: performanceAnalysis.focusAreas,
        practiceAreas: performanceAnalysis.focusAreas,
        strengthsToBuilOn: summary.strengths,
      },
    })
  } catch (error) {
    console.error("[v0] Assessment evaluation error:", error)
    return NextResponse.json({ error: "Failed to evaluate assessment" }, { status: 500 })
  }
}
