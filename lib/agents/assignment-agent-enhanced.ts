// lib/agents/assignment-agent-enhanced.ts
"use server"

import { google } from "@ai-sdk/google"
import { generateObject, generateText } from "ai"
import { z } from "zod"

// ==================== SCHEMAS ====================

const miniGameSchema = z.object({
  id: z.string(),
  type: z.enum([
    "balloon-pop-math",
    "cat-counting",
    "number-story",
    "math-race",
    "treasure-hunt-math",
    "quiz",
  ]),
  title: z.string(),
  instructions: z.string(),
  gameData: z.record(z.any()),
  pointsAvailable: z.number(),
  timeLimit: z.number().optional(),
})

const assignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  topic: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  estimatedTime: z.number(),
  miniGames: z.array(miniGameSchema),
  totalPoints: z.number(),
  passingScore: z.number(),
  learningObjectives: z.array(z.string()),
  adaptedFor: z.object({
    studentLevel: z.string(),
    focusAreas: z.array(z.string()),
  }),
})

export type MiniGame = z.infer<typeof miniGameSchema>
export type Assignment = z.infer<typeof assignmentSchema>

// ==================== INTERFACES ====================

export interface AssignmentRequest {
  studentId: string
  topic: string
  gradeLevel: number
  topicProgress: number
  strugglingConcepts: string[]
  masteredConcepts: string[]
  studentEngagement: "low" | "medium" | "high"
  learningStyle?: string
}

export interface GameEvaluation {
  gameId: string
  score: number
  timeSpent: number
  correctAnswers: number
  totalQuestions: number
  conceptsMastered: string[]
  conceptsNeedingWork: string[]
}

export interface AssignmentEvaluation {
  totalScore: number
  percentCorrect: number
  gameResults: GameEvaluation[]
  overallFeedback: string
  recommendNextSteps: string[]
}

// ==================== MAIN FUNCTIONS ====================

/**
 * ASSIGNMENT AGENT - Creates gamified assignments
 * Uses feedback from tutor agent to personalize difficulty and content
 */
export async function generateAssignment(
  request: AssignmentRequest
): Promise<Assignment> {
  const {
    topic,
    gradeLevel,
    topicProgress,
    strugglingConcepts,
    masteredConcepts,
    studentEngagement,
    learningStyle,
  } = request

  const systemPrompt = `You are a game designer specializing in educational mini-games.

Your goal is to create engaging, age-appropriate assignments that:
1. Reinforce learning through fun, interactive games
2. Adapt to student's current mastery level
3. Focus on areas where student struggles
4. Include variety to maintain engagement
5. Provide instant feedback

AVAILABLE MINI-GAME TYPES:

1. BALLOON POP MATH
   - Balloons float with numbers/equations
   - Student clicks correct answer balloon
   - Good for: Quick arithmetic, number recognition
   - Game data: { balloons: [{ value, isCorrect, equation }], timePerRound, rounds }

2. CAT COUNTING
   - Cute cats appear on screen
   - Student counts and enters number
   - Good for: Counting, basic addition/subtraction
   - Game data: { rounds: [{ catsShown, operation, correctAnswer }], maxCats }

3. NUMBER STORY
   - Story-based word problems with visuals
   - Student solves math within story context
   - Good for: Word problems, comprehension
   - Game data: { story, problems: [{ question, answer, context }] }

4. MATH RACE
   - Timed equations appear
   - Student solves to make character run faster
   - Good for: Speed practice, fact fluency
   - Game data: { equations: [{ problem, answer, difficulty }], timeLimit }

5. TREASURE HUNT MATH
   - Map with treasure locations
   - Solve math to unlock each treasure
   - Good for: Multi-step problems, problem solving
   - Game data: { map, treasures: [{ location, problem, answer, reward }] }

6. QUIZ (traditional)
   - Multiple choice or open-ended
   - Good for: Assessment, concept check
   - Game data: { questions: [{ question, options, correct, explanation }] }

Choose 2-4 games that:
- Match student's grade level and learning style
- Focus on struggling areas
- Include mastered concepts for confidence building
- Vary in type to maintain engagement
- Total to 15-30 minutes of gameplay`

  const userPrompt = `Create an assignment for:

TOPIC: ${topic}
GRADE LEVEL: ${gradeLevel}
TOPIC PROGRESS: ${topicProgress}%
LEARNING STYLE: ${learningStyle || "mixed"}

STUDENT PERFORMANCE:
Struggling with: ${strugglingConcepts.join(", ") || "none"}
Mastered: ${masteredConcepts.join(", ") || "discovering"}
Engagement: ${studentEngagement}

Generate 2-4 mini-games that:
1. Focus heavily on struggling concepts (${strugglingConcepts.join(", ")})
2. Include some mastered concepts for confidence
3. Are appropriate for ${studentEngagement} engagement level
4. Total 100-200 points
5. Take 15-30 minutes
6. Use ${learningStyle} learning methods

For each game, provide complete gameData with all questions/problems pre-generated.`

  try {
    const { object: assignment } = await generateObject({
      model: google("gemini-2.0-flash-exp"),
      schema: assignmentSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
      maxOutputTokens: 3000,
    })

    return assignment
  } catch (error) {
    console.error("[Assignment Agent] Error:", error)
    throw new Error("Failed to generate assignment")
  }
}

/**
 * Evaluate student's assignment performance
 */
export async function evaluateAssignment(
  assignment: Assignment,
  studentAnswers: Record<string, any>
): Promise<AssignmentEvaluation> {
  // Calculate scores for each mini-game
  const gameResults = assignment.miniGames.map((game) => {
    const answers = studentAnswers[game.id] || {}
    return evaluateMiniGame(game, answers)
  })

  const totalScore = gameResults.reduce((sum, r) => sum + r.score, 0)
  const totalPossible = assignment.totalPoints
  const percentCorrect = Math.round((totalScore / totalPossible) * 100)

  // Generate overall feedback
  const feedbackPrompt = `Analyze this assignment performance:

ASSIGNMENT: ${assignment.title}
TOPIC: ${assignment.topic}
STUDENT SCORE: ${totalScore}/${totalPossible} (${percentCorrect}%)

GAME RESULTS:
${gameResults
  .map(
    (r) =>
      `- ${r.gameId}: ${r.correctAnswers}/${r.totalQuestions} correct, ${r.timeSpent}s`
  )
  .join("\n")}

CONCEPTS NEEDING WORK:
${Array.from(new Set(gameResults.flatMap((r) => r.conceptsNeedingWork))).join(", ")}

Provide:
1. Encouraging overall feedback (2-3 sentences)
2. 3-5 specific next steps for improvement
3. What to practice next

Return JSON: {
  "overallFeedback": "...",
  "recommendNextSteps": ["step1", "step2", ...]
}`

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt: feedbackPrompt,
      temperature: 0.6,
    })

    const parsed = JSON.parse(text)

    return {
      totalScore,
      percentCorrect,
      gameResults,
      overallFeedback: parsed.overallFeedback,
      recommendNextSteps: parsed.recommendNextSteps,
    }
  } catch (error) {
    return {
      totalScore,
      percentCorrect,
      gameResults,
      overallFeedback: `You scored ${percentCorrect}%! ${
        percentCorrect >= 70 ? "Great job!" : "Keep practicing!"
      }`,
      recommendNextSteps: [
        "Review challenging concepts",
        "Practice more problems",
        "Ask teacher for help",
      ],
    }
  }
}

// ==================== GAME EVALUATION FUNCTIONS ====================

function evaluateMiniGame(
  game: MiniGame,
  answers: Record<string, any>
): GameEvaluation {
  switch (game.type) {
    case "balloon-pop-math":
      return evaluateBalloonPop(game, answers)
    case "cat-counting":
      return evaluateCatCounting(game, answers)
    case "number-story":
      return evaluateNumberStory(game, answers)
    case "math-race":
      return evaluateMathRace(game, answers)
    case "treasure-hunt-math":
      return evaluateTreasureHunt(game, answers)
    case "quiz":
      return evaluateQuiz(game, answers)
    default:
      return {
        gameId: game.id,
        score: 0,
        timeSpent: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        conceptsMastered: [],
        conceptsNeedingWork: [],
      }
  }
}

function evaluateBalloonPop(
  game: MiniGame,
  answers: any
): GameEvaluation {
  const balloons = game.gameData.balloons || []
  const correct = balloons.filter(
    (b: any, i: number) => answers[i] === b.value
  ).length

  return {
    gameId: game.id,
    score: Math.round((correct / balloons.length) * game.pointsAvailable),
    timeSpent: answers.timeSpent || 0,
    correctAnswers: correct,
    totalQuestions: balloons.length,
    conceptsMastered:
      correct >= balloons.length * 0.8 ? ["Quick arithmetic"] : [],
    conceptsNeedingWork:
      correct < balloons.length * 0.7 ? ["Speed practice needed"] : [],
  }
}

function evaluateCatCounting(
  game: MiniGame,
  answers: any
): GameEvaluation {
  const rounds = game.gameData.rounds || []
  const correct = rounds.filter(
    (r: any, i: number) => answers[i] === r.correctAnswer
  ).length

  return {
    gameId: game.id,
    score: Math.round((correct / rounds.length) * game.pointsAvailable),
    timeSpent: answers.timeSpent || 0,
    correctAnswers: correct,
    totalQuestions: rounds.length,
    conceptsMastered: correct >= rounds.length * 0.8 ? ["Counting"] : [],
    conceptsNeedingWork:
      correct < rounds.length * 0.7 ? ["Counting practice"] : [],
  }
}

function evaluateNumberStory(
  game: MiniGame,
  answers: any
): GameEvaluation {
  const problems = game.gameData.problems || []
  const correct = problems.filter(
    (p: any, i: number) => answers[i] === p.answer
  ).length

  return {
    gameId: game.id,
    score: Math.round((correct / problems.length) * game.pointsAvailable),
    timeSpent: answers.timeSpent || 0,
    correctAnswers: correct,
    totalQuestions: problems.length,
    conceptsMastered: correct >= problems.length * 0.8 ? ["Word problems"] : [],
    conceptsNeedingWork:
      correct < problems.length * 0.7
        ? ["Reading comprehension", "Word problems"]
        : [],
  }
}

function evaluateMathRace(game: MiniGame, answers: any): GameEvaluation {
  const equations = game.gameData.equations || []
  const correct = equations.filter(
    (eq: any, i: number) => answers[i] === eq.answer
  ).length

  return {
    gameId: game.id,
    score: Math.round((correct / equations.length) * game.pointsAvailable),
    timeSpent: answers.timeSpent || 0,
    correctAnswers: correct,
    totalQuestions: equations.length,
    conceptsMastered:
      correct >= equations.length * 0.8 ? ["Fast computation"] : [],
    conceptsNeedingWork:
      correct < equations.length * 0.7 ? ["Speed drills"] : [],
  }
}

function evaluateTreasureHunt(
  game: MiniGame,
  answers: any
): GameEvaluation {
  const treasures = game.gameData.treasures || []
  const correct = treasures.filter(
    (t: any, i: number) => answers[i] === t.answer
  ).length

  return {
    gameId: game.id,
    score: Math.round((correct / treasures.length) * game.pointsAvailable),
    timeSpent: answers.timeSpent || 0,
    correctAnswers: correct,
    totalQuestions: treasures.length,
    conceptsMastered:
      correct >= treasures.length * 0.8 ? ["Multi-step problems"] : [],
    conceptsNeedingWork:
      correct < treasures.length * 0.7 ? ["Problem solving steps"] : [],
  }
}

function evaluateQuiz(game: MiniGame, answers: any): GameEvaluation {
  const questions = game.gameData.questions || []
  const correct = questions.filter(
    (q: any, i: number) => answers[i] === q.correct
  ).length

  return {
    gameId: game.id,
    score: Math.round((correct / questions.length) * game.pointsAvailable),
    timeSpent: answers.timeSpent || 0,
    correctAnswers: correct,
    totalQuestions: questions.length,
    conceptsMastered:
      correct >= questions.length * 0.8 ? [game.gameData.topic] : [],
    conceptsNeedingWork:
      correct < questions.length * 0.7 ? [game.gameData.topic] : [],
  }
}

// ==================== FEEDBACK INTEGRATION ====================

/**
 * Generate assignment based on feedback agent's analysis
 */
export async function generateAdaptiveAssignment(
  studentId: string,
  feedbackData: {
    weakConcepts: string[]
    strongConcepts: string[]
    recommendedDifficulty: "easy" | "medium" | "hard"
    focusAreas: string[]
    engagementLevel: "low" | "medium" | "high"
  },
  gradeLevel: number,
  topic: string
): Promise<Assignment> {
  const request: AssignmentRequest = {
    studentId,
    topic,
    gradeLevel,
    topicProgress: calculateProgress(
      feedbackData.weakConcepts,
      feedbackData.strongConcepts
    ),
    strugglingConcepts: feedbackData.weakConcepts,
    masteredConcepts: feedbackData.strongConcepts,
    studentEngagement: feedbackData.engagementLevel,
  }

  return generateAssignment(request)
}

function calculateProgress(weak: string[], strong: string[]): number {
  const total = weak.length + strong.length
  if (total === 0) return 0
  return Math.round((strong.length / total) * 100)
}

/**
 * Send evaluation results to feedback agent
 */
export async function sendEvaluationToFeedback(
  studentId: string,
  assignmentId: string,
  evaluation: AssignmentEvaluation
): Promise<{
  success: boolean
  feedbackId?: string
  message: string
}> {
  try {
    // This would typically call the feedback agent API
    // For now, we'll return a structured response
    const feedbackData = {
      studentId,
      assignmentId,
      timestamp: new Date().toISOString(),
      performance: {
        score: evaluation.totalScore,
        percentCorrect: evaluation.percentCorrect,
      },
      conceptAnalysis: {
        needsWork: Array.from(
          new Set(
            evaluation.gameResults.flatMap((r) => r.conceptsNeedingWork)
          )
        ),
        mastered: Array.from(
          new Set(evaluation.gameResults.flatMap((r) => r.conceptsMastered))
        ),
      },
      recommendations: evaluation.recommendNextSteps,
    }

    console.log("[Assignment Agent] Sending to Feedback Agent:", feedbackData)

    return {
      success: true,
      feedbackId: `feedback_${Date.now()}`,
      message: "Evaluation sent to feedback agent successfully",
    }
  } catch (error) {
    console.error("[Assignment Agent] Error sending to feedback:", error)
    return {
      success: false,
      message: "Failed to send evaluation to feedback agent",
    }
  }
}
