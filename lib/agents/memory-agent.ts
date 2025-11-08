"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { StudentProfile, LearningSession } from "@/lib/types"

async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
    },
  })
}

export async function getStudentContext(userId: string): Promise<StudentProfile | null> {
  try {
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase.from("student_profiles").select("*").eq("id", userId).single()

    if (error?.code === "PGRST116") {
      // Record not found - create new student profile
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      const newStudent: StudentProfile = {
        id: userId,
        name: authUser?.user_metadata?.full_name || "Student",
        grade_level: 9,
        learning_style: "visual",
        average_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: inserted } = await supabase.from("student_profiles").insert([newStudent]).select().single()
      return inserted
    }

    if (error) {
      console.error("[v0] Error fetching student context:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Memory agent error:", error)
    return null
  }
}

export async function getLearningHistory(userId: string, limit = 10): Promise<LearningSession[]> {
  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching learning history:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] History retrieval error:", error)
    return []
  }
}

export async function getWeakAreas(userId: string): Promise<string[]> {
  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("student_weaknesses")
      .select("topic")
      .eq("student_id", userId)
      .eq("status", "active")
      .order("score", { ascending: true })
      .limit(5)

    if (error) {
      console.error("[v0] Error fetching weaknesses:", error)
      return []
    }

    return data?.map((w) => w.topic) || []
  } catch (error) {
    console.error("[v0] Weakness retrieval error:", error)
    return []
  }
}

export async function updateWeaknesses(userId: string, weaknessUpdates: Record<string, number>): Promise<void> {
  try {
    const supabase = await getSupabaseServerClient()

    for (const [topic, score] of Object.entries(weaknessUpdates)) {
      await supabase.from("student_weaknesses").upsert(
        {
          student_id: userId,
          topic,
          score,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,topic" },
      )
    }
  } catch (error) {
    console.error("[v0] Error updating weaknesses:", error)
  }
}

export async function storeSession(userId: string, sessionData: Partial<LearningSession>): Promise<void> {
  try {
    const supabase = await getSupabaseServerClient()
    await supabase.from("sessions").insert({
      student_id: userId,
      type: sessionData.type || "tutor_session",
      content: sessionData.content || "",
      response: sessionData.response || null,
      duration: sessionData.duration || 0,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error storing session:", error)
  }
}
