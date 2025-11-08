import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { sessionId, topic, gradeLevel, assessmentResults, score, questions } = await request.json()

    if (!topic || !assessmentResults) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log("[feedback] Generating feedback for score:", score)

    // Build context for feedback generation
    const correctAnswers = assessmentResults.filter((r: any) => r.isCorrect).length
    const totalQuestions = assessmentResults.length

    let context = `You are an empathetic AI learning coach analyzing a student's assessment performance.

STUDENT DETAILS:
- Topic: ${topic}
- Grade Level: ${gradeLevel}
- Score: ${score}% (${correctAnswers}/${totalQuestions} correct)

ASSESSMENT RESULTS:
${assessmentResults.map((result: any, index: number) => `
Question ${index + 1} (${result.topic}):
Q: ${result.question}
Student's Answer: ${result.userAnswer}
Correct Answer: ${result.correctAnswer}
Result: ${result.isCorrect ? "✓ Correct" : "✗ Incorrect"}
`).join("\n")}

TASK: Provide personalized, constructive feedback that:

1. **CELEBRATES STRENGTHS** (1-2 sentences):
   - Acknowledge what they did well
   - Highlight specific correct answers or strong understanding
   - Be genuinely encouraging

2. **IDENTIFIES AREAS FOR IMPROVEMENT** (2-3 sentences):
   - Point out specific topics/concepts that need more attention
   - Reference the questions they got wrong
   - Explain what knowledge gaps might exist
   - Be constructive, not critical

3. **PROVIDES ACTIONABLE NEXT STEPS** (2-3 sentences):
   - Suggest specific resources or topics to review
   - Recommend practice exercises or further study
   - Encourage continued learning

4. **MOTIVATIONAL CLOSING** (1 sentence):
   - End on an inspiring, positive note
   - Build confidence for continued learning

TONE: Warm, supportive, specific, and actionable
LENGTH: Keep it concise (4-6 paragraphs total)
STYLE: Direct and conversational, like a caring teacher

Generate the feedback now:`

    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt: context,
      temperature: 0.7,
    })

    console.log("[feedback] Generated feedback:", text.substring(0, 200))

    // Save feedback to database
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Get assessment ID if it exists
      const { data: assessmentData } = await supabase
        .from("assessments")
        .select("id")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      const weakTopics = assessmentResults.filter((r: any) => !r.isCorrect).map((r: any) => r.topic)
      const strongTopics = assessmentResults.filter((r: any) => r.isCorrect).map((r: any) => r.topic)

      // Save to feedback_history table
      await supabase.from("feedback_history").insert({
        student_id: assessmentResults[0]?.studentId,
        session_id: sessionId,
        assessment_id: assessmentData?.id,
        feedback_type: "assessment",
        context: {
          topic,
          gradeLevel,
          score,
          totalQuestions: assessmentResults.length,
        },
        weak_concepts: weakTopics,
        strong_concepts: strongTopics,
        engagement_level: score >= 80 ? "high" : score >= 60 ? "medium" : "low",
        confidence_score: score / 100,
        feedback_content: {
          ai_feedback: text,
          score_percentage: score,
          assessment_results: assessmentResults,
        },
        automated_feedback: text,
        generated_by: "ai_tutor",
      })

      console.log("[feedback] Saved to feedback_history table")
    } catch (dbError) {
      console.error("[feedback] Failed to save to database:", dbError)
      // Don't fail the whole request if DB save fails
    }

    return NextResponse.json({
      success: true,
      feedback: text.trim(),
    })

  } catch (error) {
    console.error("[feedback] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        feedback: "Great work on completing the assessment! Every learning journey has its challenges, and you're making progress. Keep practicing and reviewing the topics, and you'll continue to improve!",
      },
      { status: 500 }
    )
  }
}
