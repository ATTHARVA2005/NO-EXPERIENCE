"use server"

import { google } from "@ai-sdk/google"
import { generateText } from "ai"

export interface AssignmentGenerationInput {
  studentId: string
  topic: string
  gradeLevel: number
  difficulty?: "easy" | "medium" | "hard"
  feedbackInsights?: {
    weakConcepts?: string[]
    recommendedDifficulty?: "easier" | "maintain" | "harder"
    suggestedPracticeAreas?: string[]
    engagementLevel?: "low" | "medium" | "high"
  }
  previousAssignments?: Array<{
    topic: string
    score: number
    studentRating?: number
  }>
  learningStyle?: "visual" | "auditory" | "kinesthetic" | "reading"
}

export interface MiniGame {
  id: string
  type: "quiz" | "match" | "fill-blank" | "drag-drop" | "speech" | "sorting" | "puzzle"
  title: string
  instructions: string
  points: number
  timeLimit?: number
  questions: Array<{
    id: string
    question: string
    options?: string[]
    correctAnswer: string | string[]
    hint?: string
    explanation?: string
    visualAid?: string // URL or description
    concept: string
  }>
}

export interface AssignmentOutput {
  id: string
  title: string
  description: string
  topic: string
  difficulty: "easy" | "medium" | "hard"
  estimatedTime: number
  learningObjectives: string[]
  miniGames: MiniGame[]
  totalPoints: number
  passingScore: number
  mediaResources?: Array<{
    type: "image" | "diagram" | "video" | "animation"
    url: string
    caption: string
    relevantTo: string
  }>
}

const hasModelAccess = Boolean(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GEMINI_API_KEY,
)

/**
 * Advanced Assignment Agent: Creates engaging, gamified assessments
 * Adapts based on feedback agent insights and student performance
 * Generates mini-games optimized for learning style and engagement
 */
export async function generateAdaptiveAssignment(input: AssignmentGenerationInput): Promise<AssignmentOutput> {
  if (!hasModelAccess) {
    return generateFallbackAssignment(input)
  }

  try {
    const prompt = buildAssignmentPrompt(input)
    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt,
      temperature: 0.7,
      maxOutputTokens: 3000,
    })

    const assignment = parseAssignmentResponse(text, input)
    return assignment
  } catch (error) {
    console.error("[assignment-adaptive-agent] Generation error:", error)
    return generateFallbackAssignment(input)
  }
}

function buildAssignmentPrompt(input: AssignmentGenerationInput): string {
  const difficultyLevel = determineDifficultyLevel(input)
  const feedbackSection = input.feedbackInsights
    ? `
FEEDBACK-DRIVEN ADAPTATION:
${input.feedbackInsights.weakConcepts?.length ? `- Focus on weak concepts: ${input.feedbackInsights.weakConcepts.join(", ")}` : ""}
${input.feedbackInsights.recommendedDifficulty ? `- Adjust difficulty: ${input.feedbackInsights.recommendedDifficulty}` : ""}
${input.feedbackInsights.suggestedPracticeAreas?.length ? `- Practice areas: ${input.feedbackInsights.suggestedPracticeAreas.join(", ")}` : ""}
${input.feedbackInsights.engagementLevel === "low" ? "- CRITICAL: Use highly engaging, gamified formats to boost engagement" : ""}
`
    : ""

  const learningStyleHints = {
    visual: "Include image-based questions, diagrams, color-coding, visual sorting",
    auditory: "Include speech-based games, sound pattern matching, verbal explanations",
    kinesthetic: "Include drag-drop, interactive simulations, hands-on virtual activities",
    reading: "Include fill-in-the-blank, text-based puzzles, reading comprehension",
  }

  return `You are an expert educational game designer and assessment specialist. Create an engaging, gamified assignment that teaches effectively while being fun.

ASSIGNMENT REQUIREMENTS:
- Topic: ${input.topic}
- Grade Level: ${input.gradeLevel}
- Difficulty: ${difficultyLevel}
- Learning Style: ${input.learningStyle || "mixed"} (${learningStyleHints[input.learningStyle || "visual"]})

${feedbackSection}

DESIGN PRINCIPLES:
1. Create 3-5 mini-games that are varied, engaging, and educational
2. Each mini-game should test different cognitive skills (recall, application, analysis, synthesis)
3. Progress from easier to harder within the assignment
4. Include visual aids, diagrams, or multimedia cues where appropriate
5. Make it feel like a game, not a test
6. Provide immediate feedback and hints
7. Ensure questions are specific, clear, and grade-appropriate
8. Focus on ${input.feedbackInsights?.weakConcepts?.length ? `these weak areas: ${input.feedbackInsights.weakConcepts.join(", ")}` : "core concepts"}

MINI-GAME TYPES TO USE:
- quiz: Multiple choice or true/false
- match: Match concepts to definitions/examples
- fill-blank: Complete sentences with key terms
- drag-drop: Arrange items in correct order or categories
- speech: Verbal response (explain concept aloud)
- sorting: Sort items into categories
- puzzle: Solve a problem step-by-step

Return ONLY valid JSON with this structure:
{
  "title": "Fun, engaging title (not just 'Assignment')",
  "description": "Brief description that excites students",
  "topic": "${input.topic}",
  "difficulty": "${difficultyLevel}",
  "estimatedTime": 15,
  "learningObjectives": ["objective1", "objective2"],
  "miniGames": [
    {
      "id": "game-1",
      "type": "quiz",
      "title": "Game title",
      "instructions": "Clear instructions for students",
      "points": 100,
      "timeLimit": 120,
      "questions": [
        {
          "id": "q1",
          "question": "Question text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "B",
          "hint": "Optional hint",
          "explanation": "Why this answer is correct",
          "visualAid": "Description or URL for diagram/image",
          "concept": "Specific concept being tested"
        }
      ]
    }
  ],
  "totalPoints": 300,
  "passingScore": 210,
  "mediaResources": [
    {
      "type": "diagram",
      "url": "https://example.com/diagram.png OR 'generate: fraction number line diagram'",
      "caption": "Visual explanation",
      "relevantTo": "fraction comparison"
    }
  ]
}

Be creative, engaging, and pedagogically sound!`
}

function determineDifficultyLevel(input: AssignmentGenerationInput): "easy" | "medium" | "hard" {
  if (input.difficulty) return input.difficulty

  if (input.feedbackInsights?.recommendedDifficulty === "easier") return "easy"
  if (input.feedbackInsights?.recommendedDifficulty === "harder") return "hard"

  const avgScore =
    input.previousAssignments?.reduce((sum, a) => sum + a.score, 0) / (input.previousAssignments?.length || 1) || 70

  if (avgScore < 60) return "easy"
  if (avgScore >= 85) return "hard"
  return "medium"
}

function parseAssignmentResponse(text: string, input: AssignmentGenerationInput): AssignmentOutput {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)

    return {
      id: `assignment-${Date.now()}`,
      title: parsed.title || `${input.topic} Practice`,
      description: parsed.description || "Complete these fun activities",
      topic: parsed.topic || input.topic,
      difficulty: parsed.difficulty || "medium",
      estimatedTime: parsed.estimatedTime || 15,
      learningObjectives: Array.isArray(parsed.learningObjectives) ? parsed.learningObjectives : [],
      miniGames: Array.isArray(parsed.miniGames) ? parsed.miniGames : [],
      totalPoints: parsed.totalPoints || 300,
      passingScore: parsed.passingScore || 210,
      mediaResources: Array.isArray(parsed.mediaResources) ? parsed.mediaResources : [],
    }
  } catch (error) {
    console.error("[assignment-adaptive-agent] Parse error:", error)
    return generateFallbackAssignment(input)
  }
}

function generateFallbackAssignment(input: AssignmentGenerationInput): AssignmentOutput {
  const difficulty = determineDifficultyLevel(input)

  return {
    id: `assignment-${Date.now()}`,
    title: `${input.topic} Practice Challenge`,
    description: `Test your knowledge of ${input.topic} with these interactive exercises!`,
    topic: input.topic,
    difficulty,
    estimatedTime: 15,
    learningObjectives: [`Understand core ${input.topic} concepts`, `Apply ${input.topic} in practice problems`],
    miniGames: [
      {
        id: "game-1",
        type: "quiz",
        title: "Quick Check",
        instructions: "Answer these questions about " + input.topic,
        points: 100,
        timeLimit: 120,
        questions: [
          {
            id: "q1",
            question: `What is a key concept in ${input.topic}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: "Option A",
            hint: "Think about the basics",
            explanation: "This covers fundamental understanding",
            concept: input.topic,
          },
        ],
      },
    ],
    totalPoints: 100,
    passingScore: 70,
    mediaResources: [],
  }
}
