import { createClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { Redis } from "@upstash/redis"

const MODEL_ID = "google/gemini-2.0-flash-exp"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Submit quiz results and generate performance report
 */
export async function POST(request: Request) {
  try {
    const {
      studentId,
      sessionId,
      quizId,
      answers, // Array of { questionId, studentAnswer, timeSpent }
      topic,
    } = await request.json()

    if (!studentId || !quizId || !answers) {
      return Response.json(
        { success: false, error: "studentId, quizId, and answers required" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get quiz data
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single()

    if (quizError || !quiz) {
      return Response.json(
        { success: false, error: "Quiz not found" },
        { status: 404 }
      )
    }

    const questions = quiz.questions as any[]

    // Grade answers
    let correctCount = 0
    let totalTimeSpent = 0
    const weakConcepts: string[] = []
    const strongConcepts: string[] = []

    const gradedAnswers = answers.map((answer: any) => {
      const question = questions.find((q) => q.id === answer.questionId)
      if (!question) {
        return {
          ...answer,
          isCorrect: false,
          correctAnswer: "Unknown",
          explanation: "Question not found",
        }
      }

      // Normalize answers for comparison
      const normalizeAnswer = (ans: string) =>
        ans.toLowerCase().trim().replace(/[.,!?]/g, "")

      const isCorrect =
        normalizeAnswer(answer.studentAnswer) ===
        normalizeAnswer(question.correctAnswer)

      if (isCorrect) {
        correctCount++
        strongConcepts.push(question.concept)
      } else {
        weakConcepts.push(question.concept)
      }

      totalTimeSpent += answer.timeSpent || 0

      return {
        questionId: answer.questionId,
        studentAnswer: answer.studentAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
        concept: question.concept,
        timeSpent: answer.timeSpent,
      }
    })

    const score = (correctCount / questions.length) * 100
    const averageTimePerQuestion = totalTimeSpent / answers.length

    // Generate performance analysis with Gemini
    const analysisPrompt = `Analyze this quiz performance and provide insights:

QUIZ TOPIC: ${topic}
TOTAL QUESTIONS: ${questions.length}
CORRECT ANSWERS: ${correctCount}
SCORE: ${score.toFixed(1)}%
AVERAGE TIME PER QUESTION: ${averageTimePerQuestion.toFixed(1)}s

WEAK CONCEPTS: ${Array.from(new Set(weakConcepts)).join(", ")}
STRONG CONCEPTS: ${Array.from(new Set(strongConcepts)).join(", ")}

DETAILED RESULTS:
${gradedAnswers
  .map(
    (a: any, i: number) =>
      `Q${i + 1}: ${a.concept} - ${a.isCorrect ? "✓ Correct" : "✗ Incorrect"} (${a.timeSpent}s)`
  )
  .join("\n")}

Provide:
1. Overall performance summary (2-3 sentences)
2. Top 3 areas for improvement with specific concepts
3. Top 3 strengths to build upon
4. Recommended next steps (practice problems, review topics, move forward)
5. Difficulty adjustment recommendation (easier/same/harder)`

    const { text: analysis } = await generateText({
      model: MODEL_ID,
      prompt: analysisPrompt,
      temperature: 0.5,
    })

    // Store results in Supabase
    const { data: result, error: resultError } = await supabase
      .from("assessment_results")
      .insert({
        student_id: studentId,
        session_id: sessionId,
        quiz_id: quizId,
        topic,
        score,
        correct_answers: correctCount,
        total_questions: questions.length,
        weak_concepts: Array.from(new Set(weakConcepts)),
        strong_concepts: Array.from(new Set(strongConcepts)),
        time_spent: totalTimeSpent,
        average_time_per_question: averageTimePerQuestion,
        graded_answers: gradedAnswers,
        ai_analysis: analysis,
      })
      .select()
      .single()

    if (resultError) {
      console.error("[submit-results] Failed to store results:", resultError)
    }

    // Store difficulty adjustment in Redis for next quiz
    const difficultyKey = `difficulty:${studentId}:${topic}`
    let newDifficulty = "medium"
    if (score >= 85) {
      newDifficulty = "hard"
    } else if (score < 60) {
      newDifficulty = "easy"
    }
    await redis.setex(difficultyKey, 604800, newDifficulty) // 7 days TTL

    // Send results to Feedback Agent
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/feedback/comprehensive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            sessionId,
            assessmentResults: {
              score,
              weakConcepts: Array.from(new Set(weakConcepts)),
              strongConcepts: Array.from(new Set(strongConcepts)),
              analysis,
            },
          }),
        }
      )
    } catch (feedbackErr) {
      console.warn("[submit-results] Failed to notify feedback agent:", feedbackErr)
    }

    return Response.json({
      success: true,
      results: {
        score,
        correctCount,
        totalQuestions: questions.length,
        gradedAnswers,
        weakConcepts: Array.from(new Set(weakConcepts)),
        strongConcepts: Array.from(new Set(strongConcepts)),
        timeSpent: totalTimeSpent,
        averageTimePerQuestion,
        analysis,
        nextDifficulty: newDifficulty,
        resultId: result?.id,
      },
    })
  } catch (error) {
    console.error("[submit-results] Error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit results",
      },
      { status: 500 }
    )
  }
}
