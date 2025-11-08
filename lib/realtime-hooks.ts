"use client"

// Custom hooks for real-time updates using Supabase Realtime
import { useEffect, useState, useCallback } from "react"
import { getSupabaseClient } from "./supabase-client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function useSessionUpdates(studentId: string | null) {
  const supabase = getSupabaseClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!studentId) return

    const loadInitial = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(10)

      setSessions(data || [])
      setLoading(false)
    }

    loadInitial()

    // Subscribe to changes
    const newChannel = supabase
      .channel(`sessions:${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `student_id=eq.${studentId}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setSessions((prev) => [payload.new, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setSessions((prev) => prev.map((s) => (s.id === payload.new.id ? payload.new : s)))
          }
        },
      )
      .subscribe()

    setChannel(newChannel)

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel)
      }
    }
  }, [studentId, supabase])

  return { sessions, loading, channel }
}

export function useAssessmentUpdates(studentId: string | null) {
  const supabase = getSupabaseClient()
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return

    const loadInitial = async () => {
      const { data } = await supabase
        .from("assessments")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(10)

      setAssessments(data || [])
      setLoading(false)
    }

    loadInitial()

    const channel = supabase
      .channel(`assessments:${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assessments",
          filter: `student_id=eq.${studentId}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setAssessments((prev) => [payload.new, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setAssessments((prev) => prev.map((a) => (a.id === payload.new.id ? payload.new : a)))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [studentId, supabase])

  return { assessments, loading }
}

export function useLiveNotifications(studentId: string | null) {
  const supabase = getSupabaseClient()
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!studentId) return

    const channel = supabase
      .channel(`notifications:${studentId}`)
      .on("broadcast", { event: "notification" }, (payload: any) => {
        setNotifications((prev) => [{ id: Date.now(), ...payload.payload }, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [studentId, supabase])

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return { notifications, dismissNotification }
}
