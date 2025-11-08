import { type NextRequest, NextResponse } from "next/server"
import { processStudentAssessment } from "@/lib/system-integration"

/**
 * POST /api/feedback
 * Process a student answer and return detailed feedback
 */
export async function POST(request: NextRequest) {
  try {
    const { studentId, gradeLevel, topic, question, studentAnswer, correctAnswer, learningStyle } = await request.json()

    if (!studentId || !question || !studentAnswer || !correctAnswer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate feedback using the feedback agent
    const feedback = await processStudentAssessment({
      studentId,
      studentGradeLevel: gradeLevel,
      topic,
      question,
      studentAnswer,
      correctAnswer,
      learningStyle,
    })

    return NextResponse.json({
      success: true,
      feedback,
    })
  } catch (error) {
    console.error("[v0] Feedback API error:", error)
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 })
  }
}
