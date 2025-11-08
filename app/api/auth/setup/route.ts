import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "tamoceo@ceo.com",
      password: "tamoop",
      email_confirm: true,
    })

    if (authError && !authError.message.includes("already exists")) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 400 })
    }

    if (authData?.user?.id) {
      const { error: dbError } = await supabase
        .from("student_profiles")
        .insert({
          id: authData.user.id,
          name: "Test Student",
          email: "tamoceo@ceo.com",
          grade_level: 9,
        })
        .select()

      if (dbError && !dbError.message.includes("duplicate")) {
        console.error("DB error:", dbError)
        return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Test account created successfully",
      email: "tamoceo@ceo.com",
      password: "tamoop",
    })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json({ error: "Failed to setup test account" }, { status: 500 })
  }
}
