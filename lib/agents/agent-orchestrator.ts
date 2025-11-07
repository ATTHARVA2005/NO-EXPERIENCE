"use server"

import { google } from "@ai-sdk/google"
import { generateObject, generateText } from "ai"
import { z } from "zod"
import { generateTutorResponse, type TutorContext } from "./tutor-agent"
import { generateAssessmentQuestions, type AssessmentContext } from "./assessment-agent"
import { generateDetailedFeedback, analyzeStudentPerformance, type FeedbackContext } from "./feedback-agent"
import { createClient } from "@supabase/supabase-js"

// Types for orchestration
export interface StudentSession {
  studentId: string
  sessionId: string
  topic: string
  gradeLevel: number
  learningStyle: "visual" | "auditory" | "kinesthetic" | "reading"
  sessionStartTime: Date
  tutorMessages: Array<{ role: string; content: string; timestamp: Date }>
  assessmentsTaken: string[]
  currentPhase: "learning" | "assessment" | "feedback" | "reflection"
  performance: {
    topicsCovered: string[]
    strugglingAreas: string[]
    avgScore: number
    engagementLevel: number
  }
}

export interface AgentWorkflow {
  id: string
  studentId: string
  phase: "tutor" | "assessment" | "feedback" | "synthesis"
  status: "pending" | "in-progress" | "completed"
  data: Record<string, any>
  createdAt: Date
}

/**
 * Agent Orchestrator: Manages communication between Tutor, Assessment, and Feedback agents
 * Creates an adaptive learning loop where agents work together based on student progress
 */
export class AgentOrchestrator {
  private studentSession: StudentSession | null = null
  private workflowHistory: AgentWorkflow[] = []

  async initializeSession(
    studentId: string,
    topic: string,
    gradeLevel: number,
    learningStyle = "mixed",
  ): Promise<StudentSession> {
    this.studentSession = {
      studentId,
      sessionId: `session_${Date.now()}`,
      topic,
      gradeLevel,
      learningStyle: (learningStyle as any) || "auditory",
      sessionStartTime: new Date(),
      tutorMessages: [],
      assessmentsTaken: [],
      currentPhase: "learning",
      performance: {
        topicsCovered: [topic],
        strugglingAreas: [],
        avgScore: 0,
        engagementLevel: 50,
      },
    }

    // Fetch student data to personalize
    const studentProfile = await this.fetchStudentProfile(studentId)

    // Initialize workflow log
    this.workflowHistory = [
      {
        id: `workflow_${Date.now()}`,
        studentId,
        phase: "tutor",
        status: "in-progress",
        data: { topic, initialContext: studentProfile },
        createdAt: new Date(),
      },
    ]

    return this.studentSession
  }

  /**
   * Tutor Phase: Student asks question, tutor responds
   */
  async tutorPhase(studentMessage: string): Promise<string> {
    if (!this.studentSession) throw new Error("Session not initialized")

    const tutorContext: TutorContext = {
      studentName: this.studentSession.studentId,
      gradeLevel: this.studentSession.gradeLevel,
      topic: this.studentSession.topic,
      learningStyle: this.studentSession.learningStyle,
      previousWeaknesses: this.studentSession.performance.strugglingAreas,
      recentPerformance: this.studentSession.performance.avgScore,
    }

    try {
      const response = await generateTutorResponse(studentMessage, tutorContext, [
        ...this.studentSession.tutorMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ])

      // Store in session
      this.studentSession.tutorMessages.push(
        { role: "student", content: studentMessage, timestamp: new Date() },
        { role: "teacher", content: response, timestamp: new Date() },
      )

      // Check if we should move to assessment
      const shouldAssess = await this.shouldMoveToAssessment(studentMessage, response)
      if (shouldAssess && this.studentSession.currentPhase === "learning") {
        this.studentSession.currentPhase = "assessment"
      }

      return response
    } catch (error) {
      console.error("[Orchestrator] Tutor phase error:", error)
      throw error
    }
  }

  /**
   * Assessment Phase: Generate and manage assessments based on what was taught
   */
  async assessmentPhase(topicsCovered: string[], difficulty: "easy" | "medium" | "hard" = "medium") {
    if (!this.studentSession) throw new Error("Session not initialized")

    // Adjust difficulty based on recent performance
    const adjustedDifficulty =
      this.studentSession.performance.avgScore > 75
        ? "hard"
        : this.studentSession.performance.avgScore < 50
          ? "easy"
          : difficulty

    const assessmentContext: AssessmentContext = {
      topic: topicsCovered[0] || this.studentSession.topic,
      gradeLevel: this.studentSession.gradeLevel,
      count: 4, // 4 questions
      difficulty: adjustedDifficulty,
      previousPerformance: this.studentSession.performance.avgScore,
    }

    try {
      const questions = await generateAssessmentQuestions(assessmentContext)

      // Store assessment
      const assessmentId = `assessment_${Date.now()}`
      this.studentSession.assessmentsTaken.push(assessmentId)

      // Log workflow
      this.workflowHistory.push({
        id: assessmentId,
        studentId: this.studentSession.studentId,
        phase: "assessment",
        status: "in-progress",
        data: { questions: questions.questions, difficulty: adjustedDifficulty },
        createdAt: new Date(),
      })

      return {
        assessmentId,
        questions: questions.questions,
        difficulty: adjustedDifficulty,
      }
    } catch (error) {
      console.error("[Orchestrator] Assessment phase error:", error)
      throw error
    }
  }

  /**
   * Feedback Phase: Process assessment results and provide comprehensive feedback
   * Also guides tutor on next topics and student on areas to improve
   */
  async feedbackPhase(
    assessmentResults: Array<{
      questionId: string
      studentAnswer: string
      correctAnswer: string
      isCorrect: boolean
    }>,
  ) {
    if (!this.studentSession) throw new Error("Session not initialized")

    const feedbackContext: FeedbackContext = {
      studentGradeLevel: this.studentSession.gradeLevel,
      topic: this.studentSession.topic,
      previousAttempts: this.studentSession.assessmentsTaken.length,
      learningStyle: this.studentSession.learningStyle,
    }

    try {
      // Generate individual feedback for each answer
      const feedbackItems = await Promise.all(
        assessmentResults.map((result) =>
          generateDetailedFeedback(
            `Assessment question for ${this.studentSession!.topic}`,
            result.studentAnswer,
            result.correctAnswer,
            feedbackContext,
          ),
        ),
      )

      // Calculate overall performance
      const correctCount = assessmentResults.filter((r) => r.isCorrect).length
      const totalCount = assessmentResults.length
      const score = (correctCount / totalCount) * 100

      // Update session performance
      this.studentSession.performance.avgScore = score
      this.studentSession.performance.strugglingAreas = feedbackItems
        .filter((f) => !f.isCorrect)
        .map((f) => f.learningGap)
        .filter(Boolean) as string[]

      // Analyze performance for adaptive learning
      const performanceAnalysis = await analyzeStudentPerformance(
        this.studentSession.studentId,
        {
          topicsCovered: this.studentSession.performance.topicsCovered,
          strugglingAreas: this.studentSession.performance.strugglingAreas,
          sessionCount: this.studentSession.assessmentsTaken.length,
          averageEngagement: this.studentSession.performance.engagementLevel,
        },
        {
          recentScores: [score],
          weakConcepts: this.studentSession.performance.strugglingAreas,
          strongConcepts: feedbackItems
            .filter((f) => f.isCorrect)
            .map((f) => f.reasoning)
            .filter(Boolean),
          completionRate: 100,
        },
      )

      // Generate comprehensive feedback report
      const { object: feedbackReport } = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: z.object({
          studentMessage: z.string().describe("Encouraging message for student"),
          tutorGuidance: z.string().describe("What tutor should focus on next"),
          nextTopics: z.array(z.string()).describe("Topics to teach next"),
          practiceAreas: z.array(z.string()).describe("Areas that need more practice"),
          strengthsToBuilOn: z.array(z.string()).describe("Areas student excels in"),
        }),
        prompt: `Based on assessment results where student scored ${score}%:
- Weak concepts: ${this.studentSession.performance.strugglingAreas.join(", ")}
- Strong concepts: ${performanceAnalysis.strongConcepts.join(", ")}

Generate specific, actionable feedback.`,
      })

      this.studentSession.currentPhase = "feedback"

      // Log workflow completion
      this.workflowHistory.push({
        id: `feedback_${Date.now()}`,
        studentId: this.studentSession.studentId,
        phase: "feedback",
        status: "completed",
        data: {
          score,
          feedbackReport,
          performanceAnalysis,
        },
        createdAt: new Date(),
      })

      return {
        score,
        feedback: feedbackReport,
        performanceAnalysis,
        nextActions: {
          topicsToTeach: feedbackReport.nextTopics,
          practiceAreas: feedbackReport.practiceAreas,
          tutorGuidance: feedbackReport.tutorGuidance,
        },
      }
    } catch (error) {
      console.error("[Orchestrator] Feedback phase error:", error)
      throw error
    }
  }

  /**
   * Determine if student is ready to be assessed (has learned enough)
   */
  private async shouldMoveToAssessment(studentMessage: string, tutorResponse: string): Promise<boolean> {
    // Use heuristics + AI to determine readiness
    if (this.studentSession!.tutorMessages.length < 4) {
      return false // Need at least 4 interactions
    }

    const { text: decision } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: `Based on this learning conversation, should we move to assessment?

Student message: ${studentMessage}
Tutor response: ${tutorResponse}

Consider:
- Has student asked clarifying questions (sign of engagement)?
- Did tutor provide complete explanation?
- Are there enough messages to assess understanding?

Respond with ONLY "yes" or "no".`,
    })

    return decision.toLowerCase().includes("yes")
  }

  /**
   * Get comprehensive session summary
   */
  async getSessionSummary(): Promise<{
    session: StudentSession
    workflow: AgentWorkflow[]
    nextRecommendations: string[]
  }> {
    if (!this.studentSession) throw new Error("Session not initialized")

    return {
      session: this.studentSession,
      workflow: this.workflowHistory,
      nextRecommendations: this.studentSession.performance.strugglingAreas.map(
        (area) => `Review ${area} in next session`,
      ),
    }
  }

  /**
   * Persist session to database
   */
  async saveSession(): Promise<void> {
    if (!this.studentSession) return

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Save session
    const { error: sessionError } = await supabase.from("learning_sessions").insert([
      {
        student_id: this.studentSession.studentId,
        session_id: this.studentSession.sessionId,
        topic: this.studentSession.topic,
        grade_level: this.studentSession.gradeLevel,
        learning_style: this.studentSession.learningStyle,
        tutor_messages: this.studentSession.tutorMessages,
        current_phase: this.studentSession.currentPhase,
        performance_data: this.studentSession.performance,
        started_at: this.studentSession.sessionStartTime,
        ended_at: new Date(),
      },
    ])

    if (sessionError) console.error("Error saving session:", sessionError)

    // Save workflow history
    const { error: workflowError } = await supabase.from("agent_workflows").insert(
      this.workflowHistory.map((w) => ({
        student_id: w.studentId,
        workflow_id: w.id,
        phase: w.phase,
        status: w.status,
        workflow_data: w.data,
        created_at: w.createdAt,
      })),
    )

    if (workflowError) console.error("Error saving workflows:", workflowError)
  }

  private async fetchStudentProfile(studentId: string) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data } = await supabase.from("students").select("*").eq("id", studentId).single()

    return data || {}
  }
}

// Export singleton instance
export const orchestrator = new AgentOrchestrator()
