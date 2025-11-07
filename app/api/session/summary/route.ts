import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * Session Summary & Auto-save API
 * Periodically called to persist conversation state and generate session summaries
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const body = await request.json()
    const { studentId, sessionId, conversationHistory, topic, metadata } = body

    if (!studentId || !sessionId) {
      return NextResponse.json({ error: "studentId and sessionId are required" }, { status: 400 })
    }

    // Save/update conversation history
    const { error: updateError } = await supabase
      .from("learning_sessions")
      .update({
        tutor_messages: conversationHistory || [],
        current_phase: metadata?.phase || "learning",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("student_id", studentId)

    if (updateError) {
      console.error("[session-summary] Failed to update session:", updateError)
      throw new Error("Failed to persist conversation")
    }

    // Generate session summary if conversation has meaningful content
    let sessionSummary = null
    if (conversationHistory && conversationHistory.length >= 4) {
      // Trigger feedback analysis to get insights
      try {
        const feedbackResponse = await fetch(`${request.nextUrl.origin}/api/feedback/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, sessionId, mode: "session" }),
        })

        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json()
          sessionSummary = {
            keyTakeaways: feedbackData.feedback?.keyTakeaways || [],
            topicsCovered: [topic].filter(Boolean),
            nextFocusAreas: feedbackData.feedback?.suggestedPracticeAreas || [],
            progressIndicators: feedbackData.feedback?.progressIndicators,
            recommendedNextSteps: feedbackData.feedback?.recommendationsForTutor?.slice(0, 3).map((r: any) => r.recommendation) || [],
          }

          // Update session with summary
          await supabase
            .from("learning_sessions")
            .update({
              session_summary: JSON.stringify(sessionSummary),
            })
            .eq("id", sessionId)
        }
      } catch (feedbackError) {
        console.error("[session-summary] Failed to generate feedback-based summary:", feedbackError)
      }
    }

    // Update tutor session record
    await supabase
      .from("tutor_sessions")
      .upsert(
        {
          student_id: studentId,
          session_id: sessionId,
          message_count: conversationHistory?.length || 0,
          topics_discussed: [topic].filter(Boolean),
          session_notes: sessionSummary ? JSON.stringify(sessionSummary) : null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "session_id" },
      )

    return NextResponse.json({
      success: true,
      message: "Session auto-saved",
      summary: sessionSummary,
      conversationSaved: true,
      messageCount: conversationHistory?.length || 0,
    })
  } catch (error) {
    console.error("[session-summary] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save session" },
      { status: 500 },
    )
  }
}

/**
 * Load last session for continuation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 })
    }

    const { data: lastSession } = await supabase
      .from("learning_sessions")
      .select("*")
      .eq("student_id", studentId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!lastSession) {
      return NextResponse.json({
        success: true,
        hasSession: false,
        message: "No previous session found",
      })
    }

    return NextResponse.json({
      success: true,
      hasSession: true,
      session: {
        id: lastSession.id,
        topic: lastSession.topic,
        conversationHistory: lastSession.tutor_messages || [],
        curriculumPlan: lastSession.curriculum_plan,
        sessionSummary: lastSession.session_summary ? JSON.parse(lastSession.session_summary) : null,
        startedAt: lastSession.started_at,
      },
    })
  } catch (error) {
    console.error("[session-summary] Load error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session" },
      { status: 500 },
    )
  }
}
