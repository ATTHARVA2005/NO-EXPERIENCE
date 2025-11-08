// Memory agent for managing student learning profile and session history
import { getSupabaseClient } from "./supabase-client"
import type { StudentProfile } from "./types"

export async function saveStudentProfile(userId: string, profile: Partial<StudentProfile>) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from("student_profiles")
    .update({
      ...profile,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) throw error
}

export async function loadStudentProfile(userId: string): Promise<StudentProfile | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("student_profiles").select("*").eq("id", userId).single()

  if (error) throw error
  return data
}

export async function updateWeaknesses(userId: string, weaknesses: Record<string, number>) {
  const supabase = getSupabaseClient()

  const profile = await loadStudentProfile(userId)
  const currentWeaknesses = profile?.weaknesses || {}
  const merged = { ...currentWeaknesses, ...weaknesses }

  await saveStudentProfile(userId, { weaknesses: merged })
}

export async function getStudentContext(userId: string): Promise<string> {
  const supabase = getSupabaseClient()

  const profile = await loadStudentProfile(userId)

  // Get recent sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(3)

  // Get recent assessments
  const { data: assessments } = await supabase
    .from("assessments")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(3)

  let context = `Student: ${profile?.name} (Grade ${profile?.grade})`

  if (profile?.learningStyle) {
    context += `\nLearning Style: ${profile.learningStyle}`
  }

  if (profile?.weaknesses && Object.keys(profile.weaknesses).length > 0) {
    context += "\nAreas for improvement:\n"
    Object.entries(profile.weaknesses)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .forEach(([topic, score]) => {
        context += `- ${topic}: ${Math.round(score * 100)}%\n`
      })
  }

  if (sessions && sessions.length > 0) {
    context += `\nRecent Sessions: ${sessions.length}`
  }

  if (assessments && assessments.length > 0) {
    const avgAccuracy = assessments.reduce((sum, a) => sum + (a.accuracy || 0), 0) / assessments.length
    context += `\nAverage Assessment Accuracy: ${Math.round(avgAccuracy * 100)}%`
  }

  return context
}
