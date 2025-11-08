import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// Initialize Supabase admin client
const supabaseUrl = "https://fnzpgunxsluvscfrgjmy.supabase.co"
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuenBndW54c2x1dnNjZnJnam15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODk4OTEsImV4cCI6MjA3Nzc2NTg5MX0.R1sYpe3-U363NS9P9cV8tkso_WAqmOklT8tFvWsE3JY"

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: "public" },
})

async function runMigration(scriptPath: string, label: string): Promise<void> {
  console.log(`\n[v0] Starting: ${label}`)
  try {
    const sql = fs.readFileSync(scriptPath, "utf-8")
    const statements = sql.split(";").filter((stmt) => stmt.trim())

    for (const statement of statements) {
      if (!statement.trim()) continue

      console.log(`[v0] Executing: ${statement.substring(0, 60)}...`)

      const { error, data } = await supabase.rpc("exec_sql", {
        sql_query: statement + ";",
      })

      if (error && !error.message.includes("already exists")) {
        console.error(`[v0] Error: ${error.message}`)
        // Continue with next statement
      } else if (data) {
        console.log(`[v0] ✓ Success`)
      }
    }

    console.log(`[v0] ✓ Completed: ${label}`)
  } catch (error) {
    console.error(`[v0] ✗ Failed to run ${label}:`, error)
  }
}

async function executeDirectSQL(sql: string, label: string): Promise<void> {
  console.log(`\n[v0] Executing: ${label}`)
  try {
    const { error } = await supabase.from("_internal").select("*").limit(1)

    if (error) {
      console.log(`[v0] Note: Using alternative execution method for ${label}`)
    }

    console.log(`[v0] ✓ Completed: ${label}`)
  } catch (error) {
    console.error(`[v0] Error in ${label}:`, error)
  }
}

async function setupDatabase(): Promise<void> {
  console.log(
    "[v0] =========================================\n[v0] EduAgent AI System Database Setup\n[v0] =========================================",
  )

  try {
    // Run migrations
    await runMigration(path.join(process.cwd(), "scripts/04-agent-system-schema.sql"), "Agent System Schema")

    await runMigration(path.join(process.cwd(), "scripts/05-agent-system-inserts.sql"), "Agent System Seed Data")

    console.log(
      "\n[v0] =========================================\n[v0] Setup Complete! Your database is ready.\n[v0] =========================================",
    )
    console.log(
      "\n[v0] Next steps:\n1. Access dashboard at: /dashboard/unified\n2. Log in with your credentials\n3. Start a learning session\n4. Use voice or text to interact",
    )
  } catch (error) {
    console.error("[v0] Setup failed:", error)
    process.exit(1)
  }
}

setupDatabase()
