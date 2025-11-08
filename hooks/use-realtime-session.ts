"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/supabase-client"

export interface RealtimeSessionState {
  messages: Array<{ role: string; content: string; timestamp: number }>
  feedback: Array<{ type: string; content: string; priority: string }>
  engagementScore: number
  isConnected: boolean
  sessionDuration: number
}

/**
 * Hook for real-time session management on the client
 */
export function useRealtimeSession(sessionId: string) {
  const supabase = getSupabaseClient()
  const [state, setState] = useState<RealtimeSessionState>({
    messages: [],
    feedback: [],
    engagementScore: 50,
    isConnected: false,
    sessionDuration: 0,
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!sessionId) return

    // Subscribe to session updates
    channelRef.current = supabase
      .channel(`learning_session:${sessionId}`)
      .on("broadcast", { event: "message" }, (payload) => {
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, payload.payload],
        }))
      })
      .on("broadcast", { event: "feedback" }, (payload) => {
        setState((prev) => ({
          ...prev,
          feedback: [...prev.feedback, payload.payload],
        }))
      })
      .on("broadcast", { event: "engagement" }, (payload) => {
        setState((prev) => ({
          ...prev,
          engagementScore: payload.payload.score,
        }))
      })
      .subscribe(() => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
        }))
      })

    // Track session duration
    durationIntervalRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        sessionDuration: prev.sessionDuration + 1,
      }))
    }, 1000)

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [sessionId, supabase])

  const addMessage = useCallback(async (role: string, content: string) => {
    if (!channelRef.current) return

    const message = {
      role,
      content,
      timestamp: Date.now(),
    }

    // Add to local state
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }))

    // Broadcast to other clients
    channelRef.current.send("broadcast", {
      event: "message",
      payload: message,
    })
  }, [])

  const updateEngagement = useCallback(async (score: number) => {
    if (!channelRef.current) return

    setState((prev) => ({
      ...prev,
      engagementScore: score,
    }))

    channelRef.current.send("broadcast", {
      event: "engagement",
      payload: { score },
    })
  }, [])

  const broadcastFeedback = useCallback(async (feedback: { type: string; content: string; priority: string }) => {
    if (!channelRef.current) return

    setState((prev) => ({
      ...prev,
      feedback: [...prev.feedback, feedback],
    }))

    channelRef.current.send("broadcast", {
      event: "feedback",
      payload: feedback,
    })
  }, [])

  return {
    state,
    addMessage,
    updateEngagement,
    broadcastFeedback,
  }
}
