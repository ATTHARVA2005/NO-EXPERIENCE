"use server"

import { google } from "@ai-sdk/google"
import { generateObject, generateText } from "ai"
import { z } from "zod"

const assignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  gameType: z.enum(["quiz", "matching", "sequence", "word-hunt", "puzzle", "story-complete"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  estimatedTime: z.number(), // in minutes
  topic: z.string(),
  pointsAvailable: z.number(),
  content: z.record(z.any()),
  learningObjectives: z.array(z.string()),
  gameMechanics: z.object({
    streakBonus: z.boolean(),
    timeBonus: z.boolean(),
    multipliers: z.record(z.number()),
  }),
})

export type Assignment = z.infer<typeof assignmentSchema>

interface AssignmentContext {
  studentGradeLevel: number
  topic: string
  difficulty?: "easy" | "medium" | "hard"
  preferredGameType?: string
  learningStyle?: "visual" | "auditory" | "kinesthetic" | "reading"
}

interface GameContent {
  quiz?: Array<{
    question: string
    options: string[]
    correct: string
    explanation: string
  }>
  matching?: Array<{
    id: string
    left: string
    right: string
  }>
  sequence?: Array<{
    item: string
    correctOrder: number
  }>
  wordHunt?: {
    grid: string[][]
    words: string[]
    clues: Record<string, string>
  }
  puzzle?: {
    clues: Array<{
      number: number
      direction: "across" | "down"
      clue: string
    }>
    answers: Record<string, string>
  }
  storyComplete?: {
    story: string
    blanks: Array<{
      id: number
      options: string[]
      correct: string
    }>
  }
}

/**
 * Assignment Agent: Generates adaptive, gamified learning assignments
 * Uses AI to create engaging learning experiences with game mechanics
 */
export async function generateGamifiedAssignment(context: AssignmentContext): Promise<Assignment> {
  const gameTypes = [
    { type: "quiz", description: "Interactive multiple choice with feedback" },
    { type: "matching", description: "Match concepts with definitions or examples" },
    { type: "sequence", description: "Order events or steps correctly" },
    { type: "word-hunt", description: "Find hidden words in a grid (vocabulary building)" },
    { type: "puzzle", description: "Solve clues to complete a crossword-like puzzle" },
    { type: "story-complete", description: "Fill in blanks to complete a narrative" },
  ]

  const prompt = `You are a creative game designer for educational learning. Generate an engaging gamified assignment for:

STUDENT PROFILE:
- Grade Level: ${context.studentGradeLevel}
- Topic: ${context.topic}
- Difficulty: ${context.difficulty || "medium"}
- Learning Style: ${context.learningStyle || "mixed"}

GAME TYPES AVAILABLE:
${gameTypes.map((g) => `- ${g.type}: ${g.description}`).join("\n")}

Create an assignment that:
1. Is pedagogically sound and teaches the topic
2. Includes game mechanics (streaks, time bonuses, point multipliers)
3. Is appropriate for the grade level and learning style
4. Can be completed in 15-45 minutes
5. Has 5-8 questions/challenges (not more)
6. Provides clear learning objectives

Choose the MOST ENGAGING game type for this topic and grade level.

Return a valid JSON object with:
{
  "id": "assign_${Date.now()}",
  "title": "Engaging title for the game",
  "description": "What students will learn",
  "gameType": "chose one from available types",
  "difficulty": "${context.difficulty || "medium"}",
  "estimatedTime": 20-30,
  "topic": "${context.topic}",
  "pointsAvailable": 100-500,
  "content": {
    "quiz": [] OR "matching": [] OR other game type content
  },
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "gameMechanics": {
    "streakBonus": true,
    "timeBonus": true,
    "multipliers": {
      "correctStreak3": 1.2,
      "correctStreak5": 1.5,
      "underTime": 1.1
    }
  }
}

Make the content specific and well-structured for the chosen game type.`

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: assignmentSchema,
      prompt,
      temperature: 0.8,
      maxOutputTokens: 3000,
    })

    return object as Assignment
  } catch (error) {
    console.error("[v0] Assignment generation error:", error)
    throw new Error("Failed to generate gamified assignment")
  }
}

/**
 * Generate multiple assignments for a curriculum topic
 */
export async function generateAssignmentSeries(context: AssignmentContext, count = 3): Promise<Assignment[]> {
  const assignments: Assignment[] = []

  for (let i = 0; i < count; i++) {
    const difficulty = ["easy", "medium", "hard"][i % 3] as "easy" | "medium" | "hard"
    const assignment = await generateGamifiedAssignment({
      ...context,
      difficulty,
    })
    assignments.push(assignment)
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return assignments
}

/**
 * Evaluate student's game performance and award points
 */
export interface GamePerformance {
  assignmentId: string
  studentId: string
  correctAnswers: number
  totalQuestions: number
  timeSpent: number // in seconds
  streakCount: number
  pointsEarned: number
  achievements: string[]
}

export async function calculateGameScore(
  assignment: Assignment,
  correct: number,
  total: number,
  timeSpent: number, // in seconds
  streakCount: number,
): Promise<GamePerformance> {
  let points = Math.round((correct / total) * assignment.pointsAvailable)
  const achievements: string[] = []

  // Streak bonus
  if (assignment.gameMechanics.streakBonus) {
    if (streakCount >= 5) {
      points = Math.round(points * assignment.gameMechanics.multipliers.correctStreak5)
      achievements.push("🔥 Fire Streak! 5 correct in a row!")
    } else if (streakCount >= 3) {
      points = Math.round(points * assignment.gameMechanics.multipliers.correctStreak3)
      achievements.push("⚡ On Fire! 3 correct in a row!")
    }
  }

  // Time bonus
  if (assignment.gameMechanics.timeBonus) {
    const estimatedSeconds = assignment.estimatedTime * 60
    if (timeSpent < estimatedSeconds) {
      points = Math.round(points * assignment.gameMechanics.multipliers.underTime)
      achievements.push("⏱️ Speed Demon! Completed ahead of time!")
    }
  }

  // Perfect score
  if (correct === total) {
    achievements.push("💯 Perfect Score!")
  }

  // First attempt
  if (correct === total) {
    achievements.push("🎯 Mastery on First Try!")
  }

  return {
    assignmentId: assignment.id,
    studentId: "", // Will be filled by caller
    correctAnswers: correct,
    totalQuestions: total,
    timeSpent,
    streakCount,
    pointsEarned: points,
    achievements,
  }
}

/**
 * Generate hint for a student stuck on a question
 */
export async function generateHint(
  assignment: Assignment,
  questionIndex: number,
  studentGradeLevel: number,
): Promise<string> {
  const prompt = `The student is working on a ${assignment.gameType} game about ${assignment.topic}.
They need help with question ${questionIndex + 1}.

TOPIC: ${assignment.topic}
GRADE LEVEL: ${studentGradeLevel}
GAME TYPE: ${assignment.gameType}

Provide ONE helpful hint that:
1. Guides without giving away the answer
2. Is age-appropriate for grade ${studentGradeLevel}
3. References the topic without directly stating the answer
4. Is encouraging and supportive

Keep the hint to 1-2 sentences max.`

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt,
      temperature: 0.7,
      maxOutputTokens: 100,
    })

    return text
  } catch (error) {
    console.error("[v0] Hint generation error:", error)
    return "Think about the main concept we just learned!"
  }
}
