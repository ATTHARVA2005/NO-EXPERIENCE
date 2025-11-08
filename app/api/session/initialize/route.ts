import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, topic, gradeLevel, learningStyle } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const sessionId = `session_${Date.now()}`
    const { data: session, error } = await supabase
      .from("learning_sessions")
      .insert([
        {
          student_id: studentId,
          session_id: sessionId,
          topic,
          grade_level: gradeLevel,
          learning_style: learningStyle,
          tutor_messages: [],
          current_phase: "learning",
          performance_data: {
            topicsCovered: [topic],
            strugglingAreas: [],
            avgScore: 0,
            engagementLevel: 50,
          },
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Session initialization error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      sessionId,
      message: "Session initialized successfully",
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Failed to initialize session" }, { status: 500 })
  }
}
