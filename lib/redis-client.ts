// Redis client for short-term conversation memory
import { Redis } from "@upstash/redis"

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export interface ConversationMessage {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface ConversationContext {
  messages: ConversationMessage[]
  topic: string
  sessionId: string
  studentId: string
  lastUpdated: number
}

/**
 * Store conversation context in Redis with TTL (24 hours)
 */
export async function storeConversationContext(
  sessionId: string,
  context: ConversationContext
): Promise<void> {
  try {
    const key = `conversation:${sessionId}`
    await redis.setex(key, 86400, JSON.stringify(context)) // 24 hours TTL
  } catch (error) {
    console.error("[redis] Failed to store conversation context:", error)
    // Don't throw - allow app to continue without Redis
  }
}

/**
 * Get conversation context from Redis
 */
export async function getConversationContext(
  sessionId: string
): Promise<ConversationContext | null> {
  try {
    const key = `conversation:${sessionId}`
    const data = await redis.get<string>(key)
    
    if (!data) return null
    
    try {
      return typeof data === "string" ? JSON.parse(data) : data
    } catch (parseError) {
      console.error("[redis] Failed to parse conversation context:", parseError)
      return null
    }
  } catch (error) {
    console.error("[redis] Failed to get conversation context:", error)
    // Return null instead of throwing to allow app to continue
    return null
  }
}

/**
 * Add a message to conversation context
 */
export async function addMessageToContext(
  sessionId: string,
  message: ConversationMessage
): Promise<void> {
  try {
    const context = await getConversationContext(sessionId)
    
    if (!context) {
      console.warn(`[redis] No context found for session ${sessionId}`)
      return
    }
    
    context.messages.push(message)
    context.lastUpdated = Date.now()
    
    // Keep only last 20 messages for performance
    if (context.messages.length > 20) {
      context.messages = context.messages.slice(-20)
    }
    
    await storeConversationContext(sessionId, context)
  } catch (error) {
    console.error("[redis] Failed to add message to context:", error)
    // Don't throw - allow app to continue
  }
}

/**
 * Get recent messages for context window
 */
export async function getRecentMessages(
  sessionId: string,
  count: number = 10
): Promise<ConversationMessage[]> {
  const context = await getConversationContext(sessionId)
  
  if (!context) return []
  
  return context.messages.slice(-count)
}

/**
 * Clear conversation context
 */
export async function clearConversationContext(sessionId: string): Promise<void> {
  const key = `conversation:${sessionId}`
  await redis.del(key)
}

/**
 * Store curriculum analysis for teacher review
 */
export async function storeCurriculumAnalysis(
  sessionId: string,
  analysis: {
    strengths: string[]
    weaknesses: string[]
    studentEngagement: number
    conceptsMastered: string[]
    strugglingAreas: string[]
    recommendations: string[]
  }
): Promise<void> {
  const key = `curriculum:analysis:${sessionId}`
  await redis.setex(key, 604800, JSON.stringify(analysis)) // 7 days TTL
}

/**
 * Get curriculum analysis
 */
export async function getCurriculumAnalysis(sessionId: string): Promise<any> {
  const key = `curriculum:analysis:${sessionId}`
  const data = await redis.get<string>(key)
  
  if (!data) return null
  
  try {
    return typeof data === "string" ? JSON.parse(data) : data
  } catch {
    return null
  }
}

/**
 * Teaching state for Explain → Example → Practice flow
 */
export type TeachingPhase = "explain" | "example" | "practice" | "assess"

export interface TeachingState {
  currentTopic: string
  currentConcept: string
  phase: TeachingPhase
  completedPhases: TeachingPhase[]
  conceptProgress: number // 0-100
  sessionId: string
  lastUpdated: number
  resources: {
    title: string
    url: string
    type: "article" | "video" | "doc"
  }[]
}

/**
 * Store teaching state in Redis
 */
export async function storeTeachingState(
  sessionId: string,
  state: TeachingState
): Promise<void> {
  try {
    const key = `teaching:state:${sessionId}`
    await redis.setex(key, 86400, JSON.stringify(state)) // 24 hours TTL
  } catch (error) {
    console.error("[redis] Failed to store teaching state:", error)
    // Don't throw - allow app to continue without Redis
  }
}

/**
 * Get teaching state from Redis
 */
export async function getTeachingState(
  sessionId: string
): Promise<TeachingState | null> {
  try {
    const key = `teaching:state:${sessionId}`
    const data = await redis.get<string>(key)
    
    if (!data) return null
    
    try {
      return typeof data === "string" ? JSON.parse(data) : data
    } catch (parseError) {
      console.error("[redis] Failed to parse teaching state:", parseError)
      return null
    }
  } catch (error) {
    console.error("[redis] Failed to get teaching state:", error)
    // Return null instead of throwing to allow app to continue
    return null
  }
}

/**
 * Update teaching phase
 */
export async function updateTeachingPhase(
  sessionId: string,
  phase: TeachingPhase,
  conceptProgress?: number
): Promise<void> {
  try {
    const state = await getTeachingState(sessionId)
    
    if (!state) {
      console.warn(`[redis] No teaching state found for session ${sessionId}`)
      return
    }
    
    if (!state.completedPhases.includes(state.phase)) {
      state.completedPhases.push(state.phase)
    }
    
    state.phase = phase
    state.lastUpdated = Date.now()
    
    if (conceptProgress !== undefined) {
      state.conceptProgress = conceptProgress
    }
    
    await storeTeachingState(sessionId, state)
  } catch (error) {
    console.error("[redis] Failed to update teaching phase:", error)
    // Don't throw - allow app to continue
  }
}

/**
 * Store sub-topic rating
 */
export async function storeSubTopicRating(
  sessionId: string,
  subTopic: string,
  rating: number,
  feedback?: string
): Promise<void> {
  const key = `rating:${sessionId}:${subTopic}`
  const data = {
    rating,
    feedback,
    timestamp: Date.now(),
  }
  await redis.setex(key, 604800, JSON.stringify(data)) // 7 days TTL
}

/**
 * Get all ratings for a session
 */
export async function getSessionRatings(sessionId: string): Promise<any[]> {
  const pattern = `rating:${sessionId}:*`
  const keys = await redis.keys(pattern)
  
  if (!keys || keys.length === 0) return []
  
  const ratings = await Promise.all(
    keys.map(async (key) => {
      const data = await redis.get<string>(key)
      if (!data) return null
      try {
        const parsed = typeof data === "string" ? JSON.parse(data) : data
        return {
          subTopic: key.split(":")[2],
          ...parsed,
        }
      } catch {
        return null
      }
    })
  )
  
  return ratings.filter(Boolean)
}

export default redis
