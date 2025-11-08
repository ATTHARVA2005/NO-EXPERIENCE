import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Store session data across all relevant tables
 */
export async function storeSessionData(params: {
  sessionId: string
  studentId: string
  topic: string
  messages: any[]
  resources: any[]
  lessons: any[]
  durationMinutes: number
}) {
  const { sessionId, studentId, topic, messages, resources, lessons, durationMinutes } = params

  try {
    // 1. Update tutor_sessions table
    await supabase.from("tutor_sessions").upsert({
      id: sessionId,
      student_id: studentId,
      topic: topic,
      start_time: new Date().toISOString(),
      duration_minutes: durationMinutes,
      messages_count: messages.length,
      concepts_covered: lessons.map(l => l.title).filter(Boolean),
      updated_at: new Date().toISOString(),
    })

    // 2. Store resources in resource_recommendations
    if (resources.length > 0) {
      const resourceRecords = resources.map((resource: any, index: number) => ({
        id: `${sessionId}_res_${index}`,
        student_id: studentId,
        session_id: sessionId,
        resource_type: resource.type || 'article',
        resource_url: resource.url,
        resource_title: resource.title || 'Educational Resource',
        relevance_score: 0.8,
        created_at: new Date().toISOString(),
      }))
      
      await supabase.from("resource_recommendations").upsert(resourceRecords)
    }

    // 3. Update session_history for student tracking
    await supabase.from("session_history").upsert({
      id: sessionId,
      student_id: studentId,
      session_id: sessionId,
      topic: topic,
      duration_minutes: durationMinutes,
      completed: false,
      lesson_count: lessons.length,
      message_count: messages.length,
      last_accessed: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    // 4. Update student_dashboard with latest activity
    const { data: existingDashboard } = await supabase
      .from("student_dashboard")
      .select("total_sessions")
      .eq("student_id", studentId)
      .single()

    await supabase.from("student_dashboard").upsert({
      student_id: studentId,
      last_session_id: sessionId,
      last_session_topic: topic,
      total_sessions: (existingDashboard?.total_sessions || 0) + 1,
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    console.log("[data-storage] Session data stored across all tables")
    return { success: true }
  } catch (error) {
    console.error("[data-storage] Error storing session data:", error)
    return { success: false, error }
  }
}

/**
 * Store assessment performance
 */
export async function storeAssessmentData(params: {
  assessmentId: string
  studentId: string
  sessionId: string
  topic: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  questionResults: any[]
}) {
  try {
    const { assessmentId, studentId, sessionId, topic, score, totalQuestions, correctAnswers, timeSpent, questionResults } = params

    // 1. Store in assessments table
    await supabase.from("assessments").insert({
      id: assessmentId,
      student_id: studentId,
      session_id: sessionId,
      topic: topic,
      questions: questionResults,
      score: score,
      total_questions: totalQuestions,
      status: 'completed',
      created_at: new Date().toISOString(),
    })

    // 2. Store performance in assessment_performance table
    await supabase.from("assessment_performance").insert({
      id: `perf_${assessmentId}`,
      student_id: studentId,
      assessment_id: assessmentId,
      session_id: sessionId,
      score: score,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      time_spent_seconds: timeSpent,
      completion_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    // 3. Update performance_analytics
    await supabase.from("performance_analytics").upsert({
      id: `analytics_${studentId}_${topic}`,
      student_id: studentId,
      topic: topic,
      average_score: score,
      total_assessments: 1,
      improvement_rate: 0,
      last_assessment_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    console.log("[data-storage] Assessment data stored successfully")
    return { success: true }
  } catch (error) {
    console.error("[data-storage] Error storing assessment data:", error)
    return { success: false, error }
  }
}

/**
 * Store feedback/analytics data
 */
export async function storeFeedbackData(params: {
  studentId: string
  sessionId: string
  feedbackType: string
  content: string
  rating?: number
}) {
  try {
    const { studentId, sessionId, feedbackType, content, rating } = params

    // Store in feedback_history table
    await supabase.from("feedback_history").insert({
      id: `feedback_${sessionId}_${Date.now()}`,
      student_id: studentId,
      session_id: sessionId,
      feedback_type: feedbackType,
      feedback_content: content,
      rating: rating,
      created_at: new Date().toISOString(),
    })

    // Update curriculum_analytics if topic-related
    await supabase.from("curriculum_analytics").upsert({
      id: `curr_${studentId}_${sessionId}`,
      student_id: studentId,
      session_id: sessionId,
      engagement_score: rating || 0,
      completion_rate: 0,
      updated_at: new Date().toISOString(),
    })

    console.log("[data-storage] Feedback data stored successfully")
    return { success: true }
  } catch (error) {
    console.error("[data-storage] Error storing feedback data:", error)
    return { success: false, error }
  }
}

/**
 * Retrieve all student data for dashboard
 */
export async function getStudentDashboardData(studentId: string) {
  try {
    const [
      { data: dashboard },
      { data: sessions },
      { data: assessments },
      { data: performance },
      { data: feedback },
    ] = await Promise.all([
      supabase.from("student_dashboard").select("*").eq("student_id", studentId).single(),
      supabase.from("session_history").select("*").eq("student_id", studentId).order("last_accessed", { ascending: false }).limit(10),
      supabase.from("assessments").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(10),
      supabase.from("performance_analytics").select("*").eq("student_id", studentId),
      supabase.from("feedback_history").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(10),
    ])

    return {
      success: true,
      data: {
        dashboard,
        sessions,
        assessments,
        performance,
        feedback,
      },
    }
  } catch (error) {
    console.error("[data-storage] Error retrieving dashboard data:", error)
    return { success: false, error }
  }
}
