import { createClient } from "@supabase/supabase-js"
import { getTeachingState, updateTeachingPhase, type TeachingPhase } from "@/lib/redis-client"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Orchestrator State Machine
 * Routes between Curriculum → Tutor → Assessment → Feedback → repeat
 */
type OrchestratorState = 
  | "initializing"
  | "curriculum_generation"
  | "teaching_explain"
  | "teaching_example"
  | "teaching_practice"
  | "assessment"
  | "feedback_analysis"
  | "progression_check"
  | "session_complete"
  | "error"

interface SessionState {
  currentState: OrchestratorState
  sessionId: string
  studentId: string
  topic: string
  currentConcept: string
  conceptsCompleted: string[]
  totalConcepts: number
  lastAction: string
  lastUpdated: number
  errorCount: number
  nextAction?: string
}

/**
 * Get session state from Redis
 */
async function getSessionState(sessionId: string): Promise<SessionState | null> {
  const key = `orchestrator:${sessionId}`
  const data = await redis.get<string>(key)
  
  if (!data) return null
  
  try {
    return typeof data === "string" ? JSON.parse(data) : data
  } catch {
    return null
  }
}

/**
 * Store session state in Redis
 */
async function storeSessionState(state: SessionState): Promise<void> {
  const key = `orchestrator:${state.sessionId}`
  await redis.setex(key, 86400, JSON.stringify(state)) // 24 hours TTL
}

/**
 * Determine next state based on current state and conditions
 */
function determineNextState(
  currentState: OrchestratorState,
  context: {
    conceptProgress: number
    assessmentScore?: number
    feedbackReady?: boolean
    allConceptsComplete?: boolean
  }
): OrchestratorState {
  switch (currentState) {
    case "initializing":
      return "curriculum_generation"
    
    case "curriculum_generation":
      return "teaching_explain"
    
    case "teaching_explain":
      return context.conceptProgress >= 33 ? "teaching_example" : "teaching_explain"
    
    case "teaching_example":
      return context.conceptProgress >= 66 ? "teaching_practice" : "teaching_example"
    
    case "teaching_practice":
      return context.conceptProgress >= 100 ? "assessment" : "teaching_practice"
    
    case "assessment":
      return "feedback_analysis"
    
    case "feedback_analysis":
      return "progression_check"
    
    case "progression_check":
      if (context.allConceptsComplete) {
        return "session_complete"
      }
      // If feedback indicates mastery, move to next concept
      if (context.assessmentScore && context.assessmentScore >= 70) {
        return "teaching_explain" // Start next concept
      }
      // If low score, review current concept
      return "teaching_explain"
    
    case "session_complete":
      return "session_complete"
    
    case "error":
      // Fallback: try to recover to teaching state
      return "teaching_explain"
    
    default:
      return "error"
  }
}

/**
 * Execute action for current state
 */
async function executeStateAction(
  state: SessionState,
  supabase: any
): Promise<{ success: boolean; result?: any; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  try {
    switch (state.currentState) {
      case "curriculum_generation": {
        const response = await fetch(`${baseUrl}/api/agents/generate-curriculum`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: state.studentId,
            sessionId: state.sessionId,
            topic: state.topic,
            gradeLevel: "Middle School", // TODO: Get from student profile
          }),
        })
        
        if (!response.ok) {
          throw new Error(`Curriculum generation failed: ${response.statusText}`)
        }
        
        const data = await response.json()
        return { success: true, result: data }
      }

      case "teaching_explain":
      case "teaching_example":
      case "teaching_practice": {
        // Teaching states are handled by tutor agent via user interaction
        // Orchestrator just tracks state transitions
        return { 
          success: true, 
          result: { 
            message: "Ready for teaching interaction",
            phase: state.currentState.replace("teaching_", "") as TeachingPhase
          } 
        }
      }

      case "assessment": {
        const response = await fetch(`${baseUrl}/api/assessment/generate-quiz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: state.studentId,
            sessionId: state.sessionId,
            topic: state.topic,
            concepts: [state.currentConcept],
            questionCount: 5,
          }),
        })
        
        if (!response.ok) {
          throw new Error(`Quiz generation failed: ${response.statusText}`)
        }
        
        const data = await response.json()
        return { success: true, result: data }
      }

      case "feedback_analysis": {
        const response = await fetch(`${baseUrl}/api/feedback/comprehensive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: state.studentId,
            sessionId: state.sessionId,
          }),
        })
        
        if (!response.ok) {
          throw new Error(`Feedback analysis failed: ${response.statusText}`)
        }
        
        const data = await response.json()
        return { success: true, result: data }
      }

      case "progression_check": {
        // Check if ready to move to next concept
        const { data: feedback } = await supabase
          .from("feedback_records")
          .select("content")
          .eq("student_id", state.studentId)
          .eq("session_id", state.sessionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        const progressionReady = feedback?.content?.progressionReady === "yes"
        
        return { 
          success: true, 
          result: { 
            progressionReady,
            nextConcept: progressionReady ? "Next concept" : "Review current"
          } 
        }
      }

      case "session_complete": {
        // Mark session as complete
        await supabase
          .from("learning_sessions")
          .update({ 
            current_state: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", state.sessionId)
        
        return { success: true, result: { message: "Session completed successfully" } }
      }

      default:
        return { success: false, error: `Unknown state: ${state.currentState}` }
    }
  } catch (error) {
    console.error(`[orchestrator] Error executing ${state.currentState}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

/**
 * Main orchestration endpoint
 * Manages state transitions and agent coordination
 */
export async function POST(request: Request) {
  try {
    const { sessionId, studentId, action, context = {} } = await request.json()

    if (!sessionId || !studentId) {
      return Response.json(
        { success: false, error: "sessionId and studentId required" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get or initialize session state
    let sessionState = await getSessionState(sessionId)
    
    if (!sessionState) {
      // Initialize new session state
      const { data: session } = await supabase
        .from("learning_sessions")
        .select("topic")
        .eq("id", sessionId)
        .single()

      sessionState = {
        currentState: "initializing",
        sessionId,
        studentId,
        topic: session?.topic || "General Learning",
        currentConcept: "Introduction",
        conceptsCompleted: [],
        totalConcepts: 10, // TODO: Get from curriculum graph
        lastAction: "Initialized",
        lastUpdated: Date.now(),
        errorCount: 0,
      }
    }

    // Update based on action if provided
    if (action === "advance") {
      // Determine next state
      const nextState = determineNextState(sessionState.currentState, context)
      sessionState.currentState = nextState
      sessionState.lastAction = `Advanced to ${nextState}`
    } else if (action === "retry") {
      // Retry current state after error
      sessionState.errorCount = 0
      sessionState.lastAction = "Retrying current state"
    }

    // Execute current state action
    const result = await executeStateAction(sessionState, supabase)

    if (!result.success) {
      sessionState.currentState = "error"
      sessionState.errorCount++
      sessionState.lastAction = `Error: ${result.error}`
      
      // If too many errors, mark as failed
      if (sessionState.errorCount >= 3) {
        await supabase
          .from("learning_sessions")
          .update({ current_state: "error" })
          .eq("id", sessionId)
      }
    } else {
      sessionState.errorCount = 0
    }

    sessionState.lastUpdated = Date.now()

    // Store updated state
    await storeSessionState(sessionState)

    // Update Supabase session state
    await supabase
      .from("learning_sessions")
      .update({ current_state: sessionState.currentState })
      .eq("id", sessionId)

    return Response.json({
      success: result.success,
      state: {
        current: sessionState.currentState,
        nextAction: sessionState.nextAction,
        progress: {
          conceptsCompleted: sessionState.conceptsCompleted.length,
          totalConcepts: sessionState.totalConcepts,
          percentage: (sessionState.conceptsCompleted.length / sessionState.totalConcepts) * 100,
        },
        lastAction: sessionState.lastAction,
        errorCount: sessionState.errorCount,
      },
      result: result.result,
      error: result.error,
    })
  } catch (error) {
    console.error("[orchestrator] Error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Orchestration failed",
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check current session state
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get("sessionId")

    if (!sessionId) {
      return Response.json(
        { success: false, error: "sessionId required" },
        { status: 400 }
      )
    }

    const sessionState = await getSessionState(sessionId)

    if (!sessionState) {
      return Response.json(
        { success: false, error: "Session state not found" },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      state: {
        current: sessionState.currentState,
        conceptProgress: {
          current: sessionState.currentConcept,
          completed: sessionState.conceptsCompleted,
          total: sessionState.totalConcepts,
        },
        lastAction: sessionState.lastAction,
        lastUpdated: new Date(sessionState.lastUpdated).toISOString(),
      },
    })
  } catch (error) {
    console.error("[orchestrator] GET error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get state",
      },
      { status: 500 }
    )
  }
}
