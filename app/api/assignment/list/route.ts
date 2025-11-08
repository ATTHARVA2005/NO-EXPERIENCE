// app/api/assignment/list/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/assignment/list
 * Fetches all assignments for the current student
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const status = searchParams.get("status") // 'pending', 'in_progress', 'completed'

    // Build query
    let query = supabase
      .from("assignments")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    // Add status filter if provided
    if (status) {
      query = query.eq("status", status)
    }

    const { data: assignments, error } = await query

    if (error) {
      console.error("Error fetching assignments:", error)
      return NextResponse.json(
        { error: "Failed to fetch assignments" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assignments: assignments || [],
      count: assignments?.length || 0,
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/assignment/list
 * Delete an assignment by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { assignmentId } = await request.json()

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID required" },
        { status: 400 }
      )
    }

    // Delete assignment (only if it belongs to the user)
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId)
      .eq("student_id", user.id)

    if (error) {
      console.error("Error deleting assignment:", error)
      return NextResponse.json(
        { error: "Failed to delete assignment" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Assignment deleted successfully",
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
