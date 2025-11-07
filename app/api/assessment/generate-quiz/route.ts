import { createClient } from "@supabase/supabase-js"
import { generateObject } from "ai"
import { z } from "zod"

const MODEL_ID = "google/gemini-2.0-flash-exp"

// Zod schema for quiz structure
const QuizSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      type: z.enum(["multiple-choice", "true-false", "short-answer", "fill-blank"]),
      options: z.array(z.string()).optional(), // For multiple choice
      correctAnswer: z.string(),
      explanation: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      concept: z.string(), // Which concept this tests
      timeEstimate: z.number(), // Seconds
    })
  ),
  totalQuestions: z.number(),
  estimatedDuration: z.number(), // Total time in seconds
  difficultyDistribution: z.object({
    easy: z.number(),
    medium: z.number(),
    hard: z.number(),
  }),
})

type Quiz = z.infer<typeof QuizSchema>

/**
 * Get student's previous assessment performance from Redis/Supabase
 */
async function getPreviousPerformance(
  studentId: string,
  topic: string
): Promise<{ averageScore: number; weakAreas: string[]; difficulty: "easy" | "medium" | "hard" }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get recent assessment results
  const { data: recentAssessments } = await supabase
    .from("assessment_results")
    .select("score, weak_concepts, total_questions")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(5)

  if (!recentAssessments || recentAssessments.length === 0) {
    return {
      averageScore: 0,
      weakAreas: [],
      difficulty: "medium", // Default for new students
    }
  }

  // Calculate average score
  const totalScore = recentAssessments.reduce((sum, a) => sum + (a.score || 0), 0)
  const averageScore = totalScore / recentAssessments.length

  // Collect weak concepts
  const weakAreas = Array.from(
    new Set(
      recentAssessments.flatMap((a) => (a.weak_concepts as string[]) || [])
    )
  )

  // Determine difficulty based on performance
  let difficulty: "easy" | "medium" | "hard" = "medium"
  if (averageScore >= 80) {
    difficulty = "hard"
  } else if (averageScore < 60) {
    difficulty = "easy"
  }

  return { averageScore, weakAreas, difficulty }
}

/**
 * Generate adaptive quiz based on curriculum and student performance
 */
export async function POST(request: Request) {
  try {
    const { 
      studentId, 
      sessionId, 
      topic, 
      concepts = [], 
      gradeLevel = "Middle School",
      questionCount = 5,
    } = await request.json()

    if (!studentId || !topic) {
      return Response.json(
        { success: false, error: "studentId and topic required" },
        { status: 400 }
      )
    }

    // Get previous performance for adaptive difficulty
    const performance = await getPreviousPerformance(studentId, topic)

    // Get curriculum context
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let curriculumContext = ""
    if (sessionId) {
      const { data: session } = await supabase
        .from("learning_sessions")
        .select("curriculum_plan")
        .eq("id", sessionId)
        .single()

      if (session?.curriculum_plan) {
        const plan = session.curriculum_plan as any
        if (plan.curriculumGraph) {
          curriculumContext = `\nCURRICULUM STRUCTURE:\n${JSON.stringify(plan.curriculumGraph, null, 2)}`
        } else if (plan.lessons) {
          curriculumContext = `\nLESSONS:\n${plan.lessons.map((l: any) => `- ${l.title}`).join("\n")}`
        }
      }
    }

    const prompt = `You are an expert assessment designer creating an adaptive quiz for a student.

TOPIC: ${topic}
CONCEPTS TO TEST: ${concepts.length > 0 ? concepts.join(", ") : "All key concepts"}
GRADE LEVEL: ${gradeLevel}
STUDENT PERFORMANCE HISTORY:
- Average Score: ${performance.averageScore.toFixed(1)}%
- Weak Areas: ${performance.weakAreas.join(", ") || "None identified"}
- Recommended Difficulty: ${performance.difficulty}

${curriculumContext}

QUIZ REQUIREMENTS:
- Generate exactly ${questionCount} questions
- Mix question types: multiple-choice, true-false, short-answer, fill-blank
- Difficulty distribution:
  * ${performance.difficulty === "easy" ? "60% easy, 30% medium, 10% hard" : ""}
  * ${performance.difficulty === "medium" ? "20% easy, 60% medium, 20% hard" : ""}
  * ${performance.difficulty === "hard" ? "10% easy, 30% medium, 60% hard" : ""}
- Focus extra questions on weak areas: ${performance.weakAreas.join(", ") || "balanced coverage"}
- Each question should test a specific concept
- Provide clear explanations for correct answers
- Estimate time needed per question (in seconds)

For multiple-choice questions, provide 4 options.
For true-false, provide exactly 2 options: ["True", "False"].
For short-answer and fill-blank, correctAnswer should be the expected response.

Ensure questions are:
1. Age-appropriate for ${gradeLevel}
2. Clear and unambiguous
3. Aligned with curriculum concepts
4. Progressively challenging
5. Fair and objective`

    // Generate quiz using structured output
    const { object: quiz } = await generateObject({
      model: MODEL_ID,
      schema: QuizSchema,
      prompt,
    })

    // Store quiz in database
    const { data: quizRecord, error: dbError } = await supabase
      .from("quizzes")
      .insert({
        student_id: studentId,
        session_id: sessionId,
        topic,
        concepts: concepts.length > 0 ? concepts : ["general"],
        questions: quiz.questions,
        total_questions: quiz.totalQuestions,
        difficulty_level: performance.difficulty,
        adaptive_data: {
          previousAverage: performance.averageScore,
          weakAreas: performance.weakAreas,
        },
      })
      .select()
      .single()

    if (dbError) {
      console.error("[generate-quiz] Failed to store quiz:", dbError)
    }

    return Response.json({
      success: true,
      quiz: {
        ...quiz,
        quizId: quizRecord?.id,
      },
      adaptiveInfo: {
        difficulty: performance.difficulty,
        previousAverage: performance.averageScore,
        focusAreas: performance.weakAreas,
      },
    })
  } catch (error) {
    console.error("[generate-quiz] Error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate quiz",
      },
      { status: 500 }
    )
  }
}
