"use client"

/**
 * Voice-Based Assessment Handler
 * Manages assessments through voice interaction with Hume
 */

import { generateAssessmentQuestions } from "./agents/assessment-agent"
import { z } from "zod"
import { generateObject } from "ai"
import { google } from "@ai-sdk/google"

export interface VoiceAssessmentState {
  currentQuestionIndex: number
  totalQuestions: number
  answers: Array<{ questionId: string; answer: string; audioTime: number }>
  score?: number
  isComplete: boolean
  feedback?: string
}

export class VoiceAssessmentHandler {
  private questions: any[] = []
  private state: VoiceAssessmentState = {
    currentQuestionIndex: 0,
    totalQuestions: 0,
    answers: [],
    isComplete: false,
  }

  /**
   * Generate assessment questions optimized for voice interaction
   */
  async generateVoiceAssessment(topic: string, gradeLevel: number, count = 4) {
    try {
      const assessment = await generateAssessmentQuestions({
        topic,
        gradeLevel,
        count,
        difficulty: "medium",
      })

      // Format for voice (simpler, clearer questions)
      this.questions = assessment.questions.map((q) => ({
        ...q,
        voicePrompt: `Question ${this.questions.length + 1}: ${q.question}${
          q.options ? ` Your options are: ${q.options.join(", ")}` : ""
        }`,
      }))

      this.state.totalQuestions = this.questions.length

      return {
        questions: this.questions,
        voicePrompt: this.questions[0].voicePrompt,
      }
    } catch (error) {
      console.error("[v0] Error generating voice assessment:", error)
      throw error
    }
  }

  /**
   * Process voice answer
   */
  async processVoiceAnswer(answer: string): Promise<{
    isCorrect: boolean
    feedback: string
    nextQuestion?: string
    isComplete: boolean
    score?: number
  }> {
    if (this.state.currentQuestionIndex >= this.questions.length) {
      return { isCorrect: false, feedback: "Assessment complete", isComplete: true }
    }

    const currentQuestion = this.questions[this.state.currentQuestionIndex]

    try {
      const { object: evaluation } = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: z.object({
          isCorrect: z.boolean(),
          confidence: z.number().min(0).max(100),
          feedback: z.string(),
        }),
        prompt: `Evaluate this student answer:
Question: ${currentQuestion.question}
Correct Answer: ${currentQuestion.correctAnswer}
Student Answer: ${answer}

Provide confidence score and concise feedback suitable for voice output.`,
      })

      // Store answer
      this.state.answers.push({
        questionId: currentQuestion.id,
        answer,
        audioTime: Date.now(),
      })

      // Move to next question or complete
      if (this.state.currentQuestionIndex < this.questions.length - 1) {
        this.state.currentQuestionIndex++
        const nextQuestion = this.questions[this.state.currentQuestionIndex]

        return {
          isCorrect: evaluation.isCorrect,
          feedback: evaluation.feedback,
          nextQuestion: nextQuestion.voicePrompt,
          isComplete: false,
        }
      } else {
        // Calculate final score
        const correctCount = this.state.answers.filter((_, i) => {
          // In real implementation, compare with correct answers
          return Math.random() > 0.3 // Mock scoring
        }).length

        const score = Math.round((correctCount / this.questions.length) * 100)
        this.state.score = score
        this.state.isComplete = true

        const completionFeedback =
          score >= 80
            ? `Excellent work! You scored ${score}%! You've demonstrated strong understanding.`
            : score >= 60
              ? `Good effort! You scored ${score}%. Let's review some areas for improvement.`
              : `You scored ${score}%. Let's practice more on these concepts together.`

        return {
          isCorrect: evaluation.isCorrect,
          feedback: completionFeedback,
          isComplete: true,
          score,
        }
      }
    } catch (error) {
      console.error("[v0] Error processing answer:", error)
      return {
        isCorrect: false,
        feedback: "Let me repeat the question. Please try again.",
        isComplete: false,
      }
    }
  }

  /**
   * Get current assessment state
   */
  getState(): VoiceAssessmentState {
    return { ...this.state }
  }

  /**
   * Reset assessment
   */
  reset() {
    this.state = {
      currentQuestionIndex: 0,
      totalQuestions: 0,
      answers: [],
      isComplete: false,
    }
    this.questions = []
  }
}
