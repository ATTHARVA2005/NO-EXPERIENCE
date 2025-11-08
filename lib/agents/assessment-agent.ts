"use server"

import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

const assessmentSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["multiple-choice", "short-answer", "numeric", "essay"]),
      question: z.string(),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      explanation: z.string(),
      timeLimit: z.number(), // in seconds
      topic: z.string(),
    }),
  ),
})

interface AssessmentContext {
  topic: string
  gradeLevel: number
  count: number
  difficulty?: "easy" | "medium" | "hard" | "mixed"
  previousPerformance?: number
}

/**
 * Assessment Agent: Generates adaptive, pedagogically sound questions
 */
export async function generateAssessmentQuestions(context: AssessmentContext) {
  const difficulty =
    context.difficulty ||
    (context.previousPerformance! > 75 ? "hard" : context.previousPerformance! < 50 ? "easy" : "medium")

  const prompt = `Generate ${context.count} assessment questions for ${context.topic} at grade ${context.gradeLevel} level with ${difficulty} difficulty.

REQUIREMENTS:
- Mix question types (multiple choice, short answer, numeric, essay)
- Each question should have a clear learning objective
- Incorrect options should represent common misconceptions
- Include time limits appropriate to question type
- Ensure questions build on each other progressively
- Make questions authentic and engaging

Return valid JSON matching the schema.`

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: assessmentSchema,
      prompt,
      temperature: 0.8,
      maxOutputTokens: 2000,
    })

    return object
  } catch (error) {
    console.error("[v0] Assessment generation error:", error)
    throw new Error("Failed to generate assessment questions")
  }
}

/**
 * Validate student response format and extract content
 */
export async function validateResponse(
  question: string,
  studentResponse: string,
  questionType: string,
): Promise<{
  isValid: boolean
  message: string
  extractedAnswer: string
}> {
  const validationPrompt = `Validate if this student response is appropriate for the question type "${questionType}".

Question: ${question}
Response: ${studentResponse}

Check if the response is:
1. Not empty or gibberish
2. Attempting to answer the question
3. In the expected format for the question type

Return JSON: { isValid: boolean, message: string, extractedAnswer: string }`

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: z.object({
        isValid: z.boolean(),
        message: z.string(),
        extractedAnswer: z.string(),
      }),
      prompt: validationPrompt,
      temperature: 0.3,
    })

    return object
  } catch (error) {
    console.error("[v0] Response validation error:", error)
    return {
      isValid: true,
      message: "Validation skipped",
      extractedAnswer: studentResponse,
    }
  }
}
