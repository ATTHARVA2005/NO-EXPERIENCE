"use server"

import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

const feedbackSchema = z.object({
  isCorrect: z.boolean(),
  correctnessScore: z.number().min(0).max(100),
  reasoning: z.string().describe("Detailed explanation of why the answer is correct or incorrect"),
  studentMisconception: z.string().optional().describe("If wrong, what misconception might the student have"),
  conceptExplanation: z.string().describe("Clear explanation of the correct concept"),
  guidedQuestion: z.string().describe("Next question to guide student toward understanding"),
  learningGap: z.string().optional().describe("Specific area that needs reinforcement"),
  confidence: z.number().min(0).max(100).describe("AI confidence in this evaluation"),
  followUpResources: z.array(z.string()).optional().describe("Resource types to recommend"),
})

interface FeedbackContext {
  studentGradeLevel: number
  topic: string
  previousAttempts?: number
  learningStyle?: string
}

/**
 * Feedback Agent: Provides comprehensive, pedagogically sound feedback
 * Uses Gemini's reasoning for deeper educational analysis
 */
export async function generateDetailedFeedback(
  question: string,
  studentAnswer: string,
  correctAnswer: string,
  context: FeedbackContext,
) {
  const systemPrompt = `You are an expert educational feedback specialist. Your role is to:

1. EVALUATE OBJECTIVELY: Assess correctness without bias
2. IDENTIFY LEARNING GAPS: Determine what the student needs to learn
3. GUIDE CONSTRUCTIVELY: Provide feedback that teaches, not just corrects
4. ADAPT TO LEVEL: Use language and concepts appropriate for grade ${context.studentGradeLevel}
5. BUILD CONFIDENCE: Frame feedback positively while being honest
6. PROVIDE NEXT STEPS: Guide toward mastery

FEEDBACK PRINCIPLES:
- Focus on the learning, not the performance
- Identify the gap between current and desired state
- Provide actionable guidance
- Be specific about what was right/wrong and why
- Connect to previous learning if relevant
- Suggest specific practice or resources`

  const prompt = `Please evaluate this student's answer comprehensively:

CONTEXT:
- Grade Level: ${context.studentGradeLevel}
- Topic: ${context.topic}
- Previous Attempts: ${context.previousAttempts || 1}
- Learning Style: ${context.learningStyle || "unknown"}

QUESTION: ${question}

STUDENT'S ANSWER: ${studentAnswer}

CORRECT ANSWER: ${correctAnswer}

Provide feedback that will help the student understand not just what's wrong, but why and what to do next.`

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: feedbackSchema,
      system: systemPrompt,
      prompt,
      temperature: 0.5,
      maxOutputTokens: 1000,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 8000,
          },
        },
      },
    })

    return object
  } catch (error) {
    console.error("[v0] Feedback generation error:", error)
    throw new Error("Failed to generate feedback")
  }
}

/**
 * Generate batch feedback for multiple assessment responses
 */
export async function generateBatchFeedback(
  assessmentData: Array<{
    question: string
    studentAnswer: string
    correctAnswer: string
  }>,
  context: FeedbackContext,
) {
  const feedbackPromises = assessmentData.map((data) =>
    generateDetailedFeedback(data.question, data.studentAnswer, data.correctAnswer, context),
  )

  return Promise.all(feedbackPromises)
}

/**
 * Generate overall assessment summary and recommendations
 */
export async function generateAssessmentSummary(feedbackItems: Array<any>, topic: string, gradeLevel: number) {
  const correctCount = feedbackItems.filter((f) => f.isCorrect).length
  const totalCount = feedbackItems.length
  const accuracy = Math.round((correctCount / totalCount) * 100)

  const prompt = `Based on this assessment performance, generate a comprehensive summary:

ASSESSMENT RESULTS:
- Topic: ${topic}
- Grade Level: ${gradeLevel}
- Accuracy: ${accuracy}% (${correctCount}/${totalCount})
- Common Learning Gaps: ${feedbackItems
    .filter((f) => !f.isCorrect)
    .map((f) => f.learningGap)
    .filter(Boolean)
    .join(", ")}

Generate a structured summary with:
1. Overall performance assessment
2. Key strengths demonstrated
3. Priority areas for improvement
4. Recommended next steps
5. Confidence in growth trajectory`

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: z.object({
        overallAssessment: z.string(),
        strengths: z.array(z.string()),
        improvementAreas: z.array(z.string()),
        nextSteps: z.array(z.string()),
        growthConfidence: z.number().min(0).max(100),
      }),
      prompt,
      temperature: 0.6,
    })

    return object
  } catch (error) {
    console.error("[v0] Assessment summary error:", error)
    throw new Error("Failed to generate assessment summary")
  }
}

// ==================== ASSIGNMENT INTEGRATION ====================

/**
 * Analyze student performance across tutor sessions and assessments
 * Provides feedback to assignment agent for adaptive learning
 */
export async function analyzeStudentPerformance(
  studentId: string,
  tutorSessionData?: {
    topicsCovered: string[]
    strugglingAreas: string[]
    sessionCount: number
    averageEngagement: number
  },
  assessmentData?: {
    recentScores: number[]
    weakConcepts: string[]
    strongConcepts: string[]
    completionRate: number
  }
): Promise<{
  weakConcepts: string[]
  strongConcepts: string[]
  recommendedDifficulty: "easy" | "medium" | "hard"
  focusAreas: string[]
  engagementLevel: "low" | "medium" | "high"
  tutorRecommendations: string[]
}> {
  const systemPrompt = `You are an educational assessment expert analyzing student performance data.
Your goal is to identify learning patterns, gaps, and provide actionable recommendations for personalized instruction.

ANALYSIS CRITERIA:
1. Identify consistent weak areas across sessions and assessments
2. Recognize mastered concepts that can build confidence
3. Determine appropriate difficulty level for next assignments
4. Suggest focus areas that balance challenge and success
5. Assess engagement patterns and recommend appropriate content types`

  const prompt = `Analyze this student's performance:

TUTOR SESSION DATA:
${tutorSessionData ? `
- Topics Covered: ${tutorSessionData.topicsCovered.join(", ")}
- Struggling Areas: ${tutorSessionData.strugglingAreas.join(", ")}
- Session Count: ${tutorSessionData.sessionCount}
- Average Engagement: ${tutorSessionData.averageEngagement}/100
` : "No tutor session data available"}

ASSESSMENT DATA:
${assessmentData ? `
- Recent Scores: ${assessmentData.recentScores.join(", ")}%
- Weak Concepts: ${assessmentData.weakConcepts.join(", ")}
- Strong Concepts: ${assessmentData.strongConcepts.join(", ")}
- Completion Rate: ${assessmentData.completionRate}%
` : "No assessment data available"}

Provide comprehensive analysis for adaptive learning.`

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: z.object({
        weakConcepts: z.array(z.string()).describe("Concepts student struggles with"),
        strongConcepts: z.array(z.string()).describe("Concepts student has mastered"),
        recommendedDifficulty: z.enum(["easy", "medium", "hard"]).describe("Suggested difficulty for next assignment"),
        focusAreas: z.array(z.string()).describe("Priority topics to work on"),
        engagementLevel: z.enum(["low", "medium", "high"]).describe("Student's engagement level"),
        tutorRecommendations: z.array(z.string()).describe("Specific recommendations for tutor"),
      }),
      system: systemPrompt,
      prompt,
      temperature: 0.5,
      maxOutputTokens: 1000,
    })

    return object
  } catch (error) {
    console.error("[Feedback Agent] Performance analysis error:", error)
    throw new Error("Failed to analyze student performance")
  }
}

/**
 * Process assignment results and provide feedback to both tutor and student
 */
export async function processAssignmentFeedback(
  studentId: string,
  assignmentResults: {
    assignmentId: string
    topic: string
    score: number
    percentCorrect: number
    conceptsNeedingWork: string[]
    conceptsMastered: string[]
    timeSpent: number
    gameResults: Array<{
      gameType: string
      performance: number
    }>
  }
): Promise<{
  studentFeedback: string
  tutorGuidance: string
  nextTopicsToTeach: string[]
  adjustedLearningPath: {
    shouldRevisit: string[]
    readyToAdvance: string[]
    practiceRecommendations: string[]
  }
}> {
  const systemPrompt = `You are an educational feedback specialist creating personalized guidance.
Generate encouraging feedback for students and actionable guidance for AI tutors.`

  const prompt = `Process this assignment completion:

ASSIGNMENT: ${assignmentResults.topic}
SCORE: ${assignmentResults.score} (${assignmentResults.percentCorrect}%)
TIME SPENT: ${assignmentResults.timeSpent} minutes

PERFORMANCE ANALYSIS:
- Concepts Needing Work: ${assignmentResults.conceptsNeedingWork.join(", ")}
- Concepts Mastered: ${assignmentResults.conceptsMastered.join(", ")}
- Game Performance: ${assignmentResults.gameResults.map(g => `${g.gameType}: ${g.performance}%`).join(", ")}

Provide:
1. Encouraging student feedback (2-3 sentences)
2. Specific tutor guidance for next session
3. Topics the tutor should focus on
4. Adjusted learning path recommendations`

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: z.object({
        studentFeedback: z.string().describe("Encouraging feedback for student"),
        tutorGuidance: z.string().describe("Guidance for tutor's next session"),
        nextTopicsToTeach: z.array(z.string()).describe("Priority topics for tutor"),
        adjustedLearningPath: z.object({
          shouldRevisit: z.array(z.string()).describe("Topics to revisit"),
          readyToAdvance: z.array(z.string()).describe("Topics student is ready to advance in"),
          practiceRecommendations: z.array(z.string()).describe("Specific practice activities"),
        }),
      }),
      system: systemPrompt,
      prompt,
      temperature: 0.6,
    })

    return object
  } catch (error) {
    console.error("[Feedback Agent] Assignment feedback error:", error)
    throw new Error("Failed to process assignment feedback")
  }
}
