"use client"

import { useState, useCallback } from "react"

interface FeedbackResult {
  success: boolean
  feedback: any
  error?: string
}

interface GameSessionResult {
  success: boolean
  data: {
    feedback: any
    points: number
    achievements: string[]
    nextRecommendation: string
  }
  error?: string
}

/**
 * Hook for integrated system operations
 */
export function useSystemIntegration() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateFeedback = useCallback(
    async (
      studentId: string,
      gradeLevel: number,
      topic: string,
      question: string,
      studentAnswer: string,
      correctAnswer: string,
      learningStyle?: string,
    ): Promise<FeedbackResult> => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            gradeLevel,
            topic,
            question,
            studentAnswer,
            correctAnswer,
            learningStyle,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to generate feedback")
        }

        return await response.json()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        setError(message)
        return { success: false, feedback: null, error: message }
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const completeGameSession = useCallback(
    async (
      studentId: string,
      gradeLevel: number,
      assignment: any,
      correct: number,
      total: number,
      timeSpent: number,
      streakCount: number,
    ): Promise<GameSessionResult> => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/game-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            gradeLevel,
            assignment,
            correct,
            total,
            timeSpent,
            streakCount,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to process game session")
        }

        return await response.json()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        setError(message)
        return { success: false, data: null as any, error: message }
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const getRecommendations = useCallback(async (studentId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/recommendations?studentId=${studentId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations")
      }

      return await response.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    generateFeedback,
    completeGameSession,
    getRecommendations,
  }
}
