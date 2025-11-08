import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://fnzpgunxsluvscfrgjmy.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuenBndW54c2x1dnNjZnJnam15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODk4OTEsImV4cCI6MjA3Nzc2NTg5MX0.R1sYpe3-U363NS9P9cV8tkso_WAqmOklT8tFvWsE3JY"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifySetup(): Promise<void> {
  console.log(
    "[v0] =========================================\n[v0] EduAgent AI System Verification\n[v0] =========================================",
  )

  try {
    // Check tables exist
    const tables = [
      "learning_sessions",
      "agent_workflows",
      "assessments",
      "feedback_records",
      "performance_analytics",
      "tutor_sessions",
    ]

    console.log("\n[v0] Verifying database tables...")

    for (const table of tables) {
      const { count, error } = await supabase.from(table).select("*", { count: "exact" }).limit(0)

      if (error) {
        console.log(`[v0] ✗ Table '${table}' not found`)
      } else {
        console.log(`[v0] ✓ Table '${table}' exists (${count} records)`)
      }
    }

    // Check environment variables
    console.log("\n[v0] Verifying environment variables...")
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_HUME_API_KEY",
      "NEXT_PUBLIC_HUME_TEACHER_CONFIG_ID",
      "GOOGLE_GENERATIVE_AI_API_KEY",
    ]

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar]
      if (value) {
        console.log(`[v0] ✓ ${envVar} is configured`)
      } else {
        console.log(`[v0] ✗ ${envVar} is missing`)
      }
    }

    console.log(
      "\n[v0] =========================================\n[v0] Verification complete!\n[v0] =========================================",
    )
  } catch (error) {
    console.error("[v0] Verification failed:", error)
  }
}

verifySetup()
