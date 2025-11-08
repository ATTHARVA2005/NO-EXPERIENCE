import { type NextRequest, NextResponse } from "next/server"
import { processGameSessionCompletion, updateStudentSession, logSystemEvent } from "@/lib/system-integration"
import { getSupabaseServer } from "@/lib/supabase-server"
import type { Assignment } from "@/lib/agents/assignment-agent"

/**
 * POST /api/game-session
 * Complete a game session and process all results
 */
export async function POST(request: NextRequest) {
  try {
    const { studentId, gradeLevel, assignment, correct, total, timeSpent, streakCount } = await request.json()

    if (!studentId || !assignment || !correct || !total || !timeSpent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseServer()

    // Process the game session
    const sessionResult = await processGameSessionCompletion({
      assignment: assignment as Assignment,
      studentId,
      studentGradeLevel: gradeLevel,
      correct,
      total,
      timeSpent,
      streakCount,
    })

    // Update the learning session in database
    await updateStudentSession(
      {
        studentId,
        topic: assignment.topic,
        duration: timeSpent,
        pointsEarned: sessionResult.points,
        performanceData: {
          correct,
          total,
          accuracy: (correct / total) * 100,
        },
      },
      supabase,
    )

    // Log the event
    await logSystemEvent(
      "game_session_completed",
      studentId,
      {
        topic: assignment.topic,
        accuracy: (correct / total) * 100,
        points: sessionResult.points,
        achievements: sessionResult.achievements,
      },
      supabase,
    )

    return NextResponse.json({
      success: true,
      data: sessionResult,
    })
  } catch (error) {
    console.error("[v0] Game session API error:", error)
    return NextResponse.json({ error: "Failed to process game session" }, { status: 500 })
  }
}
