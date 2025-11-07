import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const error_description = searchParams.get("error_description")

  console.log("[AuthCallback] Processing callback", { code: !!code, error })

  if (error) {
    console.error("[AuthCallback] Auth callback error:", error, error_description)
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
  }

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error("[AuthCallback] Code exchange error:", exchangeError)
      return NextResponse.redirect(new URL(`/login?error=auth_error`, request.url))
    }

    console.log("[AuthCallback] Session exchanged successfully")

    // Ensure student profile exists
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user?.id) {
      const userId = sessionData.session.user.id
      const userEmail = sessionData.session.user.email
      const userName = sessionData.session.user.user_metadata?.name || userEmail?.split("@")[0] || "Student"
      const userGrade = sessionData.session.user.user_metadata?.grade || 9

      console.log("[AuthCallback] Checking student profile for user:", userId)

      const { data: existingStudent } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("id", userId)
        .single()

      if (!existingStudent) {
        console.log("[AuthCallback] Creating new student profile...")
        
        const { error: insertError } = await supabase.from("student_profiles").insert({
          id: userId,
          name: userName,
          grade_level: userGrade,
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
          console.error("[AuthCallback] Failed to create student profile:", insertError)
        } else {
          console.log("[AuthCallback] Student profile created successfully")
        }
      } else {
        console.log("[AuthCallback] Student profile already exists")
      }
    }

    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  console.log("[AuthCallback] No code provided, redirecting to login")
  return NextResponse.redirect(new URL("/login", request.url))
}
