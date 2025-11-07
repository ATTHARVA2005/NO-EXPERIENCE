"use server"

import { generateDetailedFeedback, generateAssessmentSummary } from "./agents/feedback-agent"
import { calculateGameScore } from "./agents/assignment-agent"
import type { FeedbackData } from "./types"
import type { Assignment } from "./agents/assignment-agent"

/**
 * Unified System Integration Layer
 * Orchestrates all agents and manages system-wide operations
 */

interface StudentAssessmentResult {
  studentId: string
  studentGradeLevel: number
  topic: string
  question: string
  studentAnswer: string
  correctAnswer: string
  learningStyle?: string
}

interface GameSessionData {
  assignment: Assignment
  studentId: string
  studentGradeLevel: number
  correct: number
  total: number
  timeSpent: number
  streakCount: number
}

interface SessionUpdate {
  studentId: string
  topic: string
  duration: number
  pointsEarned: number
  performanceData: {
    correct: number
    total: number
    accuracy: number
  }
}

/**
 * Process a student assessment and generate comprehensive feedback
 */
export async function processStudentAssessment(result: StudentAssessmentResult): Promise<FeedbackData> {
  const feedback = await generateDetailedFeedback(result.question, result.studentAnswer, result.correctAnswer, {
    studentGradeLevel: result.studentGradeLevel,
    topic: result.topic,
    learningStyle: result.learningStyle,
  })

  return feedback
}

/**
 * Process game session results and update all systems
 */
export async function processGameSessionCompletion(sessionData: GameSessionData): Promise<{
  feedback: any
  points: number
  achievements: string[]
  nextRecommendation: string
}> {
  // Calculate game score and points
  const performance = await calculateGameScore(
    sessionData.assignment,
    sessionData.correct,
    sessionData.total,
    sessionData.timeSpent,
    sessionData.streakCount,
  )

  // Generate comprehensive feedback
  const feedback = await generateAssessmentSummary(
    [
      {
        isCorrect: sessionData.correct === sessionData.total,
        correctnessScore: Math.round((sessionData.correct / sessionData.total) * 100),
        learningGap: sessionData.correct < sessionData.total ? "Review needed" : "Mastered",
      },
    ],
    sessionData.assignment.topic,
    sessionData.studentGradeLevel,
  )

  // Generate next recommendation
  const nextRecommendation = await generateNextRecommendation(
    sessionData.assignment.topic,
    sessionData.correct / sessionData.total,
    sessionData.assignment.learningObjectives,
  )

  return {
    feedback,
    points: performance.pointsEarned,
    achievements: performance.achievements,
    nextRecommendation,
  }
}

/**
 * Generate recommendation for next learning activity
 */
export async function generateNextRecommendation(
  currentTopic: string,
  accuracyRate: number,
  learningObjectives: string[],
): Promise<string> {
  if (accuracyRate >= 0.9) {
    return `Excellent work on ${currentTopic}! You've mastered the core concepts. Consider exploring advanced applications or related topics.`
  } else if (accuracyRate >= 0.7) {
    return `Good progress on ${currentTopic}! You understand most concepts. Try reviewing the areas where you struggled and attempt another quiz.`
  } else if (accuracyRate >= 0.5) {
    return `You're building foundational knowledge in ${currentTopic}. Revisit the key concepts and try interactive practice problems.`
  } else {
    return `Let's focus more on ${currentTopic}. Start with basic tutorials and simpler practice questions before moving to advanced content.`
  }
}

/**
 * Update student learning session in database
 */
export async function updateStudentSession(sessionUpdate: SessionUpdate, supabase: any): Promise<void> {
  try {
    const { error } = await supabase.from("learning_sessions").insert({
      student_id: sessionUpdate.studentId,
      topic: sessionUpdate.topic,
      duration: sessionUpdate.duration,
      points_earned: sessionUpdate.pointsEarned,
      performance_data: sessionUpdate.performanceData,
      created_at: new Date().toISOString(),
    })

    if (error) throw error
  } catch (error) {
    console.error("[v0] Error updating session:", error)
    throw error
  }
}

/**
 * Generate personalized learning recommendations based on student profile
 */
export async function generatePersonalizedRecommendations(
  studentGradeLevel: number,
  learningStyle: string,
  recentTopics: string[],
  weakAreas: string[],
): Promise<string[]> {
  const recommendations: string[] = []

  // Recommend review for weak areas
  if (weakAreas.length > 0) {
    recommendations.push(`Focus on revisiting: ${weakAreas.slice(0, 2).join(", ")} to strengthen your foundation`)
  }

  // Recommend next topics based on prerequisite chains
  if (recentTopics.length > 0) {
    recommendations.push(`Explore advanced concepts building on: ${recentTopics[recentTopics.length - 1]}`)
  }

  // Recommend diverse learning modality
  if (learningStyle === "visual") {
    recommendations.push("Try visual concept mapping exercises to consolidate your learning")
  } else if (learningStyle === "auditory") {
    recommendations.push("Explore peer discussion groups or audio-based learning sessions")
  } else if (learningStyle === "kinesthetic") {
    recommendations.push("Engage in hands-on projects or physical demonstrations")
  }

  return recommendations
}

/**
 * Log system event for analytics and debugging
 */
export async function logSystemEvent(
  eventType: string,
  studentId: string,
  eventData: Record<string, any>,
  supabase: any,
): Promise<void> {
  try {
    await supabase.from("system_events").insert({
      event_type: eventType,
      student_id: studentId,
      event_data: eventData,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error logging event:", error)
  }
}
