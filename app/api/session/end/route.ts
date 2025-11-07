import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, stats } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error } = await supabase
      .from("learning_sessions")
      .update({
        ended_at: new Date().toISOString(),
        current_phase: "feedback",
        performance_data: stats,
      })
      .eq("student_id", studentId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("[v0] Session end error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (stats?.topicsCovered?.length > 0) {
      for (const topic of stats.topicsCovered) {
        await supabase
          .from("performance_analytics")
          .upsert([
            {
              student_id: studentId,
              topic,
              average_score: stats.averageScore || 0,
              engagement_level: stats.engagementLevel || 50,
              topics_covered: stats.topicsCovered,
              last_session_date: new Date().toISOString(),
            },
          ])
          .eq("student_id", studentId)
          .eq("topic", topic)
      }
    }

    return NextResponse.json({ message: "Session ended successfully" })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 })
  }
}
