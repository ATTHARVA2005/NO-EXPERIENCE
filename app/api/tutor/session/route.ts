// app/api/tutor/session/route.ts
/**
 * Tutor Session API
 * Records tutor session data and triggers feedback analysis
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const body = await request.json()
    const {
      studentId,
      topicsCovered,
      strugglingAreas = [],
      masteredAreas = [],
      engagementScore,
      duration,
      sessionNotes,
      questionsAsked = 0,
      conceptsExplained = [],
    } = body

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    if (!topicsCovered || !Array.isArray(topicsCovered) || topicsCovered.length === 0) {
      return NextResponse.json({ error: "Topics covered is required and must be a non-empty array" }, { status: 400 })
    }

    // Save tutor session
    const { data: session, error: sessionError } = await supabase
      .from("tutor_sessions")
      .insert({
        student_id: studentId,
        session_id: `session_${Date.now()}`,
        topics_discussed: topicsCovered,
        engagement_metrics: {
          strugglingAreas,
          masteredAreas,
          engagementScore,
        },
        message_count: questionsAsked,
      })
      .select()
      .single()

    if (sessionError) {
      console.error("Error saving tutor session:", sessionError)
      return NextResponse.json({ error: "Failed to save tutor session" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session,
      message: "Tutor session recorded successfully",
    })
  } catch (error) {
    console.error("Tutor session error:", error)
    return NextResponse.json({ error: "Failed to record tutor session" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("studentId")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    // Fetch recent tutor sessions
    const { data: sessions, error } = await supabase
      .from("tutor_sessions")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching tutor sessions:", error)
      return NextResponse.json({ error: "Failed to fetch tutor sessions" }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Failed to fetch tutor sessions" }, { status: 500 })
  }
}
