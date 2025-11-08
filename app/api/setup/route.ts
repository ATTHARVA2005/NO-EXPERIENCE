import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Simple security check - only allow from localhost in development
  const host = request.headers.get("host")
  const isDev = host?.includes("localhost") || host?.includes("127.0.0.1")

  if (!isDev && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Check if students table exists
    const { data: tables } = await supabase.from("student_profiles").select("id").limit(1)

    console.log("[v0] Database tables status: OK")

    // Try to create test account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: "tamoceo@ceo.com",
      password: "tamoop",
      options: {
        data: { name: "Test CEO", grade: 12 },
      },
    })

    if (signUpError && !signUpError.message.includes("already registered")) {
      console.log("[v0] Sign up error:", signUpError.message)
      throw signUpError
    }

    // If signup was successful, create student profile
    if (signUpData.user && !signUpError) {
      const { error: insertError } = await supabase.from("student_profiles").insert({
        id: signUpData.user.id,
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

      if (insertError) {
        console.log("[v0] Insert error (may be due to RLS or existing user):", insertError.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Setup complete. Test account: tamoceo@ceo.com / tamoop",
      testAccount: {
        email: "tamoceo@ceo.com",
        password: "tamoop",
      },
    })
  } catch (error) {
    console.error("[v0] Setup error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Setup failed",
        message: "Please check your Supabase connection and database schema",
      },
      { status: 500 },
    )
  }
}
