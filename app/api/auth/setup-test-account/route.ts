import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Check if test auth user already exists
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const existingAuthUser = authUsers?.users.find(u => u.email === "tamoceo@ceo.com")

    if (existingAuthUser) {
      return NextResponse.json({
        success: true,
        message: "Test account already exists",
        email: "tamoceo@ceo.com",
      })
    }

    // Create test auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "tamoceo@ceo.com",
      password: "tamoop",
      email_confirm: true,
    })

    if (authError && !authError.message.includes("already exists")) {
      console.error("[v0] Auth error:", authError)
      return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 400 })
    }

    // Create student profile
    if (authData?.user?.id) {
      await supabase.from("student_profiles").insert({
        id: authData.user.id,
        name: "Test CEO",
        grade_level: 12,
        learning_style: 'visual',
        average_score: 0,
        total_sessions: 0,
        total_assignments: 0,
        completed_assignments: 0,
        total_assessments: 0,
        current_streak: 0,
        longest_streak: 0,
        total_learning_time: 0,
        engagement_score: 50,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Test account created successfully",
      email: "tamoceo@ceo.com",
      password: "tamoop",
    })
  } catch (error) {
    console.error("[v0] Setup error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Setup failed",
      },
      { status: 500 },
    )
  }
}
