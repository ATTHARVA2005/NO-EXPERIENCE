import { createClient } from "@supabase/supabase-js"
import {
  getConversationContext,
  getTeachingState,
  storeConversationContext,
  storeTeachingState,
  type TeachingState,
} from "./redis-client"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SessionSnapshot {
  sessionId: string
  studentId: string
  topic: string
  currentLessonIndex: number
  lessons: any[]
  resources: any[]
  assignments: any[]
  messages: any[]
  conversationHistory: any[]
  teachingState: TeachingState | null
  elapsedSeconds: number
  timestamp: string
}

/**
 * Save complete session state for later resumption
 */
export async function saveSessionState(snapshot: SessionSnapshot): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[session-persistence] Saving session:", snapshot.sessionId)
    
    // 1. Save to Supabase for long-term storage
    const { data, error: dbError } = await supabase
      .from("learning_sessions")
      .update({
        topic: snapshot.topic, // CRITICAL: Save the topic
        current_lesson_index: snapshot.currentLessonIndex,
        tutor_messages: snapshot.conversationHistory,
        curriculum_plan: {
          lessons: snapshot.lessons,
          resources: snapshot.resources,
          assignments: snapshot.assignments,
          topic: snapshot.topic, // Also in curriculum plan
        },
        duration_minutes: Math.floor(snapshot.elapsedSeconds / 60),
        current_state: "paused",
        updated_at: new Date().toISOString(),
      })
      .eq("id", snapshot.sessionId)
      .select()

    if (dbError) {
      console.error("[session-persistence] Supabase save error:", {
        error: dbError,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      })
      return { success: false, error: dbError.message }
    }

    if (!data || data.length === 0) {
      console.error("[session-persistence] No rows updated for session:", snapshot.sessionId)
      return { success: false, error: "Session not found in database" }
    }

    console.log("[session-persistence] Supabase save successful:", data)

    // 2. Save conversation context to Redis
    if (snapshot.conversationHistory.length > 0) {
      await storeConversationContext(snapshot.sessionId, {
        messages: snapshot.conversationHistory.map((msg: any) => ({
          role: msg.role === "teacher" || msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
          timestamp: new Date(msg.timestamp || Date.now()).getTime(),
        })),
        topic: snapshot.topic,
        sessionId: snapshot.sessionId,
        studentId: snapshot.studentId,
        lastUpdated: Date.now(),
      })
    }

    // 3. Save teaching state to Redis if available
    if (snapshot.teachingState) {
      await storeTeachingState(snapshot.sessionId, snapshot.teachingState)
    }

    return { success: true }
  } catch (error) {
    console.error("[session-persistence] Save error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save session",
    }
  }
}

/**
 * Restore complete session state from storage
 */
export async function restoreSessionState(
  sessionId: string
): Promise<{ success: boolean; snapshot?: SessionSnapshot; error?: string }> {
  try {
    // 1. Load from Supabase
    const { data: session, error: dbError } = await supabase
      .from("learning_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (dbError || !session) {
      return { success: false, error: "Session not found" }
    }

    // 2. Load conversation context from Redis
    const conversationContext = await getConversationContext(sessionId)

    // 3. Load teaching state from Redis
    const teachingState = await getTeachingState(sessionId)

    // 4. Reconstruct snapshot
    const curriculumPlan = session.curriculum_plan as any
    
    // CRITICAL: Get topic from multiple sources (session.topic takes priority)
    const sessionTopic = session.topic || curriculumPlan?.topic || (curriculumPlan?.lessons?.[0]?.topic) || "Learning Session"
    
    console.log("[Restore] Reconstructing session:", {
      sessionId: session.id,
      topic: sessionTopic,
      hasLessons: !!curriculumPlan?.lessons?.length,
      hasMessages: !!(session.tutor_messages as any[])?.length
    })
    
    const snapshot: SessionSnapshot = {
      sessionId: session.id,
      studentId: session.student_id,
      topic: sessionTopic, // Use the determined topic
      currentLessonIndex: session.current_lesson_index || 0,
      lessons: curriculumPlan?.lessons || [],
      resources: curriculumPlan?.resources || [],
      assignments: curriculumPlan?.assignments || [],
      messages: (session.tutor_messages as any[]) || [],
      conversationHistory: conversationContext?.messages || (session.tutor_messages as any[]) || [],
      teachingState: teachingState,
      elapsedSeconds: (session.duration_minutes || 0) * 60,
      timestamp: session.updated_at || session.created_at,
    }

    // Mark session as active
    await supabase
      .from("learning_sessions")
      .update({ current_state: "active" })
      .eq("id", sessionId)

    return { success: true, snapshot }
  } catch (error) {
    console.error("[session-persistence] Restore error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore session",
    }
  }
}

/**
 * List all resumable sessions for a student
 */
export async function getResumableSessions(studentId: string): Promise<{
  success: boolean
  sessions?: Array<{
    id: string
    topic: string
    updated_at: string
    duration_minutes: number
    current_state: string
  }>
  error?: string
}> {
  try {
    const { data: sessions, error: dbError } = await supabase
      .from("learning_sessions")
      .select("id, topic, updated_at, duration_minutes, current_state")
      .eq("student_id", studentId)
      .in("current_state", ["paused", "active"])
      .order("updated_at", { ascending: false })
      .limit(10)

    if (dbError) {
      return { success: false, error: dbError.message }
    }

    return { success: true, sessions: sessions || [] }
  } catch (error) {
    console.error("[session-persistence] List error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list sessions",
    }
  }
}

/**
 * End session and mark as completed
 */
export async function endSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: dbError } = await supabase
      .from("learning_sessions")
      .update({
        current_state: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (dbError) {
      return { success: false, error: dbError.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[session-persistence] End error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to end session",
    }
  }
}
