import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId,
      sessionId,
      lessonId,
      lessonTitle,
      topic,
      subtopics,
      completedSubtopics,
      progressPercentage,
    } = body

    if (!studentId || !sessionId || !lessonId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServer()

    // Upsert lesson progress
    const { data: lessonProgress, error: lessonError } = await supabase
      .from("lesson_progress")
      .upsert(
        {
          student_id: studentId,
          session_id: sessionId,
          lesson_id: lessonId,
          lesson_title: lessonTitle,
          topic,
          progress_percentage: progressPercentage || 0,
          completed_subtopics: completedSubtopics?.length || 0,
          total_subtopics: subtopics?.length || 0,
          status: progressPercentage >= 100 ? "completed" : "in_progress",
          last_accessed_at: new Date().toISOString(),
        },
        { onConflict: "session_id,lesson_id" }
      )
      .select()
      .single()

    if (lessonError) {
      console.error("[lesson-progress] Error:", lessonError)
      return NextResponse.json(
        { error: "Failed to update lesson progress" },
        { status: 500 }
      )
    }

    // Update subtopics if provided
    if (subtopics && lessonProgress) {
      for (const subtopic of subtopics) {
        await supabase.from("subtopic_progress").upsert(
          {
            lesson_progress_id: lessonProgress.id,
            student_id: studentId,
            session_id: sessionId,
            subtopic_id: subtopic.id,
            subtopic_title: subtopic.title,
            subtopic_order: subtopic.order,
            completed: completedSubtopics?.includes(subtopic.id) || false,
            completed_at:
              completedSubtopics?.includes(subtopic.id)
                ? new Date().toISOString()
                : null,
          },
          { onConflict: "lesson_progress_id,subtopic_id" }
        )
      }
    }

    return NextResponse.json({
      success: true,
      lessonProgressId: lessonProgress.id,
    })
  } catch (error: any) {
    console.error("[lesson-progress] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update progress" },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve progress
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const lessonId = searchParams.get("lessonId")

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServer()

    if (lessonId) {
      // Get specific lesson progress
      const { data: progress, error } = await supabase
        .from("lesson_progress")
        .select(
          `
          *,
          subtopics:subtopic_progress(*)
        `
        )
        .eq("session_id", sessionId)
        .eq("lesson_id", lessonId)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("[lesson-progress] Error:", error)
      }

      return NextResponse.json({
        success: true,
        progress: progress || null,
      })
    } else {
      // Get all lesson progress for session
      const { data: allProgress, error } = await supabase
        .from("lesson_progress")
        .select(
          `
          *,
          subtopics:subtopic_progress(*)
        `
        )
        .eq("session_id", sessionId)
        .order("started_at", { ascending: true })

      if (error) {
        console.error("[lesson-progress] Error:", error)
        return NextResponse.json(
          { error: "Failed to fetch progress" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        progress: allProgress || [],
      })
    }
  } catch (error: any) {
    console.error("[lesson-progress] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch progress" },
      { status: 500 }
    )
  }
}
