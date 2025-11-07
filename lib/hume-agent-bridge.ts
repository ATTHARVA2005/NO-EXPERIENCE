"use client"

/**
 * Hume Agent Bridge
 * Bridges Hume Voice AI with the agent orchestration system
 * Enables voice-based interaction with tutor, assessment, and feedback agents
 */

import { useVoice, VoiceReadyState } from "@humeai/voice-react"
import { useCallback, useRef, useEffect, useState } from "react"
import { generateTutorResponse, type TutorContext } from "./agents/tutor-agent"

export interface VoiceAgentConfig {
  studentId: string
  studentName: string
  topic: string
  gradeLevel: number
  learningStyle: "visual" | "auditory" | "kinesthetic" | "reading"
}

export interface VoiceAgentState {
  isConnected: boolean
  isListening: boolean
  isSpeaking: boolean
  currentPhase: "learning" | "assessment" | "feedback"
  messageCount: number
  conversationHistory: Array<{ role: string; content: string }>
}

/**
 * Custom hook for integrating Hume voice with agent system
 */
export function useHumeAgentBridge(config: VoiceAgentConfig) {
  const { connect, disconnect, sendUserInput, messages, readyState } = useVoice()
  const [state, setState] = useState<VoiceAgentState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    currentPhase: "learning",
    messageCount: 0,
    conversationHistory: [],
  })

  const conversationRef = useRef<Array<{ role: string; content: string }>>([])
  const messageQueueRef = useRef<string[]>([])
  const isProcessingRef = useRef(false)

  const initializeVoiceSession = useCallback(
    async (apiKey: string, configId?: string) => {
      try {
        const systemPrompt = `You are an expert AI tutor specializing in ${config.topic} for ${config.gradeLevel}-grade students.
Your communication style should be: ${config.learningStyle}-focused.
Student name: ${config.studentName}

Your role:
1. Teach concepts clearly and engagingly
2. Ask guiding questions rather than providing direct answers
3. Adapt explanations based on student responses
4. Encourage critical thinking and problem-solving
5. Provide formative feedback to guide learning

Keep responses conversational (2-3 sentences) and adjust complexity to the student's level.`

        await connect({
          apiKey,
          configId,
          context: {
            text: systemPrompt,
          },
        })

        setState((prev) => ({
          ...prev,
          isConnected: true,
        }))

        // Send initial greeting
        const greeting = `Hello ${config.studentName}! I'm your AI tutor for ${config.topic}. How can I help you learn today?`
        sendUserInput(greeting)
      } catch (error) {
        console.error("[v0] Voice session initialization error:", error)
        throw error
      }
    },
    [config, connect, sendUserInput],
  )

  const processVoiceMessage = useCallback(
    async (userMessage: string) => {
      if (isProcessingRef.current || !state.isConnected) return

      isProcessingRef.current = true
      setState((prev) => ({
        ...prev,
        isListening: false,
      }))

      try {
        // Add to conversation history
        conversationRef.current.push({ role: "user", content: userMessage })

        // Get tutor response through agent
        const tutorContext: TutorContext = {
          studentName: config.studentName,
          gradeLevel: config.gradeLevel,
          topic: config.topic,
          learningStyle: config.learningStyle,
          previousWeaknesses: [],
          recentPerformance: 0,
        }

        const tutorResponse = await generateTutorResponse(userMessage, tutorContext, conversationRef.current)

        // Add tutor response to history
        conversationRef.current.push({
          role: "assistant",
          content: tutorResponse,
        })

        // Queue response to be spoken
        messageQueueRef.current.push(tutorResponse)

        setState((prev) => ({
          ...prev,
          messageCount: prev.messageCount + 1,
          conversationHistory: conversationRef.current,
        }))

        // Send tutor response through voice
        if (readyState === VoiceReadyState.OPEN) {
          sendUserInput(tutorResponse)
          setState((prev) => ({
            ...prev,
            isSpeaking: true,
          }))
        }
      } catch (error) {
        console.error("[v0] Error processing voice message:", error)
      } finally {
        isProcessingRef.current = false
      }
    },
    [config, state.isConnected, readyState, sendUserInput],
  )

  useEffect(() => {
    if (!messages || messages.length === 0) return

    const lastMessage = messages[messages.length - 1]

    // User message received from Hume
    if (lastMessage?.type === "user_message" && lastMessage?.message?.content) {
      const userContent = lastMessage.message.content

      // Process through agents
      processVoiceMessage(userContent)
    }

    // Hume finished speaking
    if (lastMessage?.type === "audio_output" || lastMessage?.type === "assistant_end") {
      setState((prev) => ({
        ...prev,
        isSpeaking: false,
      }))

      // If queue has more messages, process them
      if (messageQueueRef.current.length > 0) {
        const nextMessage = messageQueueRef.current.shift()
        if (nextMessage && readyState === VoiceReadyState.OPEN) {
          sendUserInput(nextMessage)
        }
      }
    }
  }, [messages, readyState, sendUserInput, processVoiceMessage])

  const moveToAssessment = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      currentPhase: "assessment",
    }))

    const message =
      "Great! You've shown good understanding. Let's move to some practice questions to check your learning. Are you ready?"
    sendUserInput(message)
  }, [sendUserInput])

  const moveToFeedback = useCallback(
    (score: number, feedback: string) => {
      setState((prev) => ({
        ...prev,
        currentPhase: "feedback",
      }))

      const message = `You scored ${score}% on the assessment. ${feedback} Would you like to review any topics?`
      sendUserInput(message)
    },
    [sendUserInput],
  )

  const endVoiceSession = useCallback(() => {
    disconnect()
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isListening: false,
      isSpeaking: false,
    }))
    conversationRef.current = []
    messageQueueRef.current = []
  }, [disconnect])

  const toggleListening = useCallback(() => {
    if (readyState === VoiceReadyState.OPEN) {
      setState((prev) => ({
        ...prev,
        isListening: !prev.isListening,
      }))
    }
  }, [readyState])

  return {
    // State
    state,
    readyState,

    // Methods
    initializeVoiceSession,
    processVoiceMessage,
    moveToAssessment,
    moveToFeedback,
    endVoiceSession,
    toggleListening,

    // Data
    conversationHistory: conversationRef.current,
  }
}

/**
 * Hume Agent Middleware - Processes messages and routes them through agents
 */
export class HumeAgentMiddleware {
  private conversationHistory: Array<{ role: string; content: string }> = []

  async processUserInput(
    userMessage: string,
    context: VoiceAgentConfig,
  ): Promise<{
    response: string
    nextPhase?: "learning" | "assessment" | "feedback"
    metadata?: Record<string, any>
  }> {
    this.conversationHistory.push({ role: "user", content: userMessage })

    try {
      // Route through tutor agent
      const tutorContext: TutorContext = {
        studentName: context.studentName,
        gradeLevel: context.gradeLevel,
        topic: context.topic,
        learningStyle: context.learningStyle,
        previousWeaknesses: [],
        recentPerformance: 0,
      }

      const response = await generateTutorResponse(userMessage, tutorContext, [...this.conversationHistory])

      this.conversationHistory.push({ role: "assistant", content: response })

      // Determine if ready for next phase
      let nextPhase: "learning" | "assessment" | "feedback" | undefined
      if (this.conversationHistory.length >= 8 && Math.random() > 0.7) {
        nextPhase = "assessment"
      }

      return {
        response,
        nextPhase,
        metadata: {
          conversationLength: this.conversationHistory.length,
          lastPhase: "learning",
        },
      }
    } catch (error) {
      console.error("[v0] Middleware error:", error)
      throw error
    }
  }

  getConversationHistory() {
    return this.conversationHistory
  }

  clearHistory() {
    this.conversationHistory = []
  }
}
