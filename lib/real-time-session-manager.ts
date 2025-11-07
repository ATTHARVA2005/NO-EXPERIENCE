"use server"

/**
 * Real-time Session Manager
 * Manages live learning sessions, synchronizes agent states, and provides real-time feedback
 */

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface SessionMessage {
  id: string
  studentId: string
  role: "tutor" | "student"
  content: string
  timestamp: number
  metadata?: Record<string, any>
}

export interface RealtimeFeedback {
  type: "instant" | "summary" | "suggestion"
  content: string
  priority: "low" | "medium" | "high"
  timestamp: number
  actionItems?: string[]
}

export class RealTimeSessionManager {
  private sessionId = ""
  private channel: RealtimeChannel | null = null
  private messages: SessionMessage[] = []
  private feedbackQueue: RealtimeFeedback[] = []
  private isActive = false

  constructor(private studentId: string) {}

  /**
   * Initialize real-time session with Supabase subscriptions
   */
  async initialize(sessionId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    this.sessionId = sessionId
    this.isActive = true

    this.channel = supabase
      .channel(`learning_session:${sessionId}`)
      .on("broadcast", { event: "message" }, (payload) => {
        this.handleIncomingMessage(payload.payload as SessionMessage)
      })
      .on("broadcast", { event: "feedback" }, (payload) => {
        this.handleIncomingFeedback(payload.payload as RealtimeFeedback)
      })
      .subscribe()

    return this.sessionId
  }

  /**
   * Handle incoming messages in real-time
   */
  private handleIncomingMessage(message: SessionMessage) {
    this.messages.push(message)

    // Trigger analytics and feedback generation
    if (message.role === "student") {
      this.generateInstantFeedback(message)
    }
  }

  /**
   * Generate instant, real-time feedback on student interactions
   */
  private async generateInstantFeedback(message: SessionMessage) {
    try {
      // Analyze message for engagement and understanding
      const { google } = await import("@ai-sdk/google")
      const { generateObject } = await import("ai")
      const { z } = await import("zod")

      const { object: analysis } = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: z.object({
          engagementScore: z.number().min(0).max(100),
          comprehensionLevel: z.enum(["low", "medium", "high"]),
          suggestedAction: z.string().optional(),
          shouldEscalate: z.boolean(),
        }),
        prompt: `Analyze this student message for engagement and understanding:
"${message.content}"

Provide instant feedback metrics.`,
      })

      // Create feedback entry
      const feedback: RealtimeFeedback = {
        type: "instant",
        content: analysis.suggestedAction || "Keep exploring this concept",
        priority: analysis.engagementScore < 30 ? "high" : "medium",
        timestamp: Date.now(),
      }

      this.feedbackQueue.push(feedback)

      // Broadcast feedback if important
      if (analysis.shouldEscalate) {
        await this.broadcastFeedback(feedback)
      }
    } catch (error) {
      console.error("[v0] Error generating instant feedback:", error)
    }
  }

  /**
   * Handle incoming feedback
   */
  private handleIncomingFeedback(feedback: RealtimeFeedback) {
    this.feedbackQueue.push(feedback)
  }

  /**
   * Broadcast feedback to connected clients
   */
  async broadcastFeedback(feedback: RealtimeFeedback) {
    if (!this.channel) return

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    supabase.channel(`learning_session:${this.sessionId}`).send("broadcast", {
      event: "feedback",
      payload: feedback,
    })
  }

  /**
   * Add message to session
   */
  addMessage(role: "tutor" | "student", content: string, metadata?: Record<string, any>) {
    const message: SessionMessage = {
      id: `msg_${Date.now()}`,
      studentId: this.studentId,
      role,
      content,
      timestamp: Date.now(),
      metadata,
    }

    this.messages.push(message)
    return message
  }

  /**
   * Get current feedback queue
   */
  getFeedbackQueue(): RealtimeFeedback[] {
    return [...this.feedbackQueue]
  }

  /**
   * Clear processed feedback
   */
  clearFeedback() {
    this.feedbackQueue = []
  }

  /**
   * Get session summary for current state
   */
  getSessionSummary() {
    const tutorMessages = this.messages.filter((m) => m.role === "tutor").length
    const studentMessages = this.messages.filter((m) => m.role === "student").length
    const avgFeedbackPriority = this.feedbackQueue.length
      ? this.feedbackQueue.reduce((sum, f) => sum + (f.priority === "high" ? 3 : f.priority === "medium" ? 2 : 1), 0) /
        this.feedbackQueue.length
      : 0

    return {
      sessionId: this.sessionId,
      messageCount: this.messages.length,
      tutorMessages,
      studentMessages,
      interactionRatio: studentMessages > 0 ? tutorMessages / studentMessages : 0,
      pendingFeedback: this.feedbackQueue.length,
      avgFeedbackPriority,
      isActive: this.isActive,
    }
  }

  /**
   * End session and cleanup
   */
  async end() {
    this.isActive = false

    if (this.channel) {
      await this.channel.unsubscribe()
      this.channel = null
    }

    return this.getSessionSummary()
  }
}

/**
 * Manage real-time feedback aggregation
 */
export class FeedbackAggregator {
  private feedbackHistory: RealtimeFeedback[] = []

  /**
   * Add feedback and analyze patterns
   */
  async addFeedback(feedback: RealtimeFeedback): Promise<{
    shouldIntervene: boolean
    interventionType?: "encouragement" | "clarification" | "redirection"
    message?: string
  }> {
    this.feedbackHistory.push(feedback)

    // Analyze last 5 feedback items for patterns
    const recentFeedback = this.feedbackHistory.slice(-5)
    const lowEngagementCount = recentFeedback.filter((f) => f.priority === "high").length

    if (lowEngagementCount >= 3) {
      return {
        shouldIntervene: true,
        interventionType: "encouragement",
        message: "I notice you might be struggling. Would you like me to explain this differently?",
      }
    }

    if (recentFeedback.some((f) => f.type === "suggestion")) {
      return {
        shouldIntervene: true,
        interventionType: "redirection",
        message: "Let me guide you with a different approach...",
      }
    }

    return { shouldIntervene: false }
  }

  /**
   * Get feedback summary
   */
  getSummary() {
    const totalFeedback = this.feedbackHistory.length
    const highPriority = this.feedbackHistory.filter((f) => f.priority === "high").length
    const averageType =
      this.feedbackHistory.reduce((acc, f) => acc + (f.type === "instant" ? 1 : 0), 0) / totalFeedback || 0

    return {
      totalFeedback,
      highPriorityCount: highPriority,
      avgPriorityLevel:
        this.feedbackHistory.reduce((sum, f) => {
          const priorityScore = f.priority === "high" ? 3 : f.priority === "medium" ? 2 : 1
          return sum + priorityScore
        }, 0) / totalFeedback || 0,
      instantFeedbackRatio: averageType,
    }
  }
}
