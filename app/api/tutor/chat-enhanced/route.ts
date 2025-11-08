import { createClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { 
  storeConversationContext, 
  getConversationContext, 
  addMessageToContext,
  getTeachingState,
  storeTeachingState,
  updateTeachingPhase,
  type TeachingPhase,
  type TeachingState,
} from "@/lib/redis-client"

const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const TAVILY_API_KEY = process.env.TAVILY_API_KEY

// Create Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: GOOGLE_API_KEY,
})

/**
 * Fetch educational resources from Tavily
 */
async function fetchTavilyResources(query: string, topic: string): Promise<any[]> {
  if (!TAVILY_API_KEY) {
    console.warn("[tutor] Tavily API key not configured")
    return []
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `${topic} ${query} educational resources`,
        search_depth: "basic",
        include_domains: ["youtube.com", "khanacademy.org", "coursera.org", "wikipedia.org", "edu"],
        max_results: 3,
      }),
    })

    if (!response.ok) {
      console.warn("[tutor] Tavily API error:", response.statusText)
      return []
    }

    const data = await response.json()
    return (data.results || []).map((result: any) => ({
      title: result.title,
      url: result.url,
      type: result.url.includes("youtube") ? "video" : result.url.includes(".pdf") ? "doc" : "article",
      snippet: result.content?.slice(0, 200),
    }))
  } catch (error) {
    console.error("[tutor] Failed to fetch Tavily resources:", error)
    return []
  }
}

/**
 * Extract key concepts from tutor's teaching response
 */
function extractConcepts(response: string, currentConcept?: string): string[] {
  const concepts: string[] = []
  
  // Add current concept if provided
  if (currentConcept) {
    concepts.push(currentConcept)
  }
  
  // Extract quoted terms or capitalized key terms
  const quotedTerms = response.match(/"([^"]+)"/g)
  if (quotedTerms) {
    quotedTerms.forEach(term => {
      const cleaned = term.replace(/"/g, "").trim()
      if (cleaned.length > 3 && cleaned.length < 50) {
        concepts.push(cleaned)
      }
    })
  }
  
  // Extract bolded terms (markdown)
  const boldTerms = response.match(/\*\*([^*]+)\*\*/g)
  if (boldTerms) {
    boldTerms.forEach(term => {
      const cleaned = term.replace(/\*\*/g, "").trim()
      if (cleaned.length > 3 && cleaned.length < 50) {
        concepts.push(cleaned)
      }
    })
  }
  
  return [...new Set(concepts)] // Remove duplicates
}

/**
 * Extract examples from tutor's response
 */
function extractExamples(response: string): string[] {
  const examples: string[] = []
  
  // Look for example indicators
  const exampleMarkers = [
    /for example[,:]?\s+([^.!?]+[.!?])/gi,
    /example:\s+([^.!?]+[.!?])/gi,
    /like\s+([^.!?]+[.!?])/gi,
    /such as\s+([^.!?]+[.!?])/gi,
  ]
  
  exampleMarkers.forEach(pattern => {
    const matches = response.matchAll(pattern)
    for (const match of matches) {
      if (match[1] && match[1].length > 10 && match[1].length < 200) {
        examples.push(match[1].trim())
      }
    }
  })
  
  return [...new Set(examples)]
}

/**
 * Calculate student engagement level
 */
function calculateEngagementLevel(
  understandingLevel: "low" | "medium" | "high",
  totalMessages: number,
  askedQuestion: boolean
): "high" | "medium" | "low" {
  let score = 0
  
  // Understanding contributes to engagement
  if (understandingLevel === "high") score += 3
  else if (understandingLevel === "medium") score += 2
  else score += 1
  
  // Message count (more messages = more engaged, but diminishing returns)
  if (totalMessages > 20) score += 3
  else if (totalMessages > 10) score += 2
  else if (totalMessages > 5) score += 1
  
  // Asking questions shows high engagement
  if (askedQuestion) score += 2
  
  // Score interpretation
  if (score >= 6) return "high"
  if (score >= 4) return "medium"
  return "low"
}

/**
 * Generate notes for teacher/parent dashboard
 */
function generateTutorNotes(
  teachingState: TeachingState | null,
  understandingLevel: "low" | "medium" | "high",
  totalMessages: number
): string {
  if (!teachingState) return "Session in progress."
  
  const { currentConcept, phase, conceptProgress } = teachingState
  
  let notes = `Learning "${currentConcept}" - ${phase} phase (${conceptProgress}% complete). `
  
  if (understandingLevel === "high") {
    notes += "Student showing strong understanding. "
  } else if (understandingLevel === "low") {
    notes += "Student needs additional support. "
  } else {
    notes += "Student progressing steadily. "
  }
  
  if (totalMessages < 5) {
    notes += "Early in lesson."
  } else if (totalMessages < 15) {
    notes += "Mid-lesson engagement."
  } else {
    notes += "Extended learning session."
  }
  
  return notes
}

/**
 * Determine next teaching phase based on student response
 */
function determineNextPhase(
  currentPhase: TeachingPhase,
  studentMessage: string,
  understandingLevel: "low" | "medium" | "high"
): TeachingPhase {
  const lowerMessage = studentMessage.toLowerCase()
  
  // If student expresses confusion, stay in current phase or go back
  if (lowerMessage.includes("don't understand") || lowerMessage.includes("confused") || lowerMessage.includes("what?")) {
    return currentPhase === "practice" ? "example" : "explain"
  }
  
  // Progress through phases based on understanding
  if (currentPhase === "explain") {
    return understandingLevel === "high" ? "practice" : "example"
  }
  
  if (currentPhase === "example") {
    return understandingLevel === "high" ? "practice" : "example"
  }
  
  if (currentPhase === "practice") {
    return understandingLevel === "high" ? "assess" : "practice"
  }
  
  return "explain"
}

export async function POST(request: Request) {
  console.log("[Tutor API] ========== NEW REQUEST ==========")
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { 
      studentId, 
      sessionId, 
      message, 
      topic, 
      currentConcept,
      gradeLevel, 
      conversationHistory = [],
      requestRating = false, // Flag to request rating after topic completion
    } = body

    console.log("[Tutor API] Request details:", {
      studentId: studentId?.slice(0, 8),
      sessionId: sessionId?.slice(0, 8),
      message: message?.slice(0, 100),
      topic,
      currentConcept,
      gradeLevel,
      historyLength: conversationHistory?.length || 0,
    })

    if (!message || !studentId) {
      console.error("[Tutor API] ❌ Missing required fields:", { message: !!message, studentId: !!studentId })
      return Response.json({ success: false, error: "message and studentId required" }, { status: 400 })
    }

    // Validate API key
    if (!GOOGLE_API_KEY) {
      console.error("[Tutor API] ❌ GOOGLE_GENERATIVE_AI_API_KEY not configured!")
      return Response.json({ 
        success: false, 
        error: "AI service not configured. Please add GOOGLE_GENERATIVE_AI_API_KEY to environment variables." 
      }, { status: 500 })
    }

    console.log("[Tutor API] ✅ API key present:", GOOGLE_API_KEY.slice(0, 20) + "...")

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get or initialize teaching state
    let teachingState = sessionId ? await getTeachingState(sessionId) : null
    
    if (!teachingState && sessionId && currentConcept) {
      // Initialize new teaching state
      teachingState = {
        currentTopic: topic || "General Learning",
        currentConcept: currentConcept,
        phase: "explain",
        completedPhases: [],
        conceptProgress: 0,
        sessionId,
        lastUpdated: Date.now(),
        resources: [],
      }
      await storeTeachingState(sessionId, teachingState)
    }

    // Fetch Tavily resources if starting a new concept or in explain phase
    if (teachingState && (teachingState.phase === "explain" || teachingState.resources.length === 0)) {
      const resources = await fetchTavilyResources(teachingState.currentConcept, teachingState.currentTopic)
      if (resources.length > 0) {
        teachingState.resources = resources
        await storeTeachingState(sessionId!, teachingState)
      }
    }

    // Try to get context from Redis first (short-term memory)
    let redisContext = null
    let supabaseMessages: any[] = []
    let finalConversationHistory = conversationHistory || []
    
    if (sessionId) {
      redisContext = await getConversationContext(sessionId)
      
      // FALLBACK: If Redis fails or is empty, load from Supabase
      if (!redisContext || !redisContext.messages || redisContext.messages.length === 0) {
        console.log("[tutor] Redis context not available, loading from Supabase...")
        
        const { data: session } = await supabase
          .from("learning_sessions")
          .select("tutor_messages, topic, curriculum_plan")
          .eq("id", sessionId)
          .single()
        
        if (session?.tutor_messages && Array.isArray(session.tutor_messages)) {
          supabaseMessages = (session.tutor_messages as any[]).map((msg: any) => ({
            role: msg.role === "teacher" || msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          }))
          
          console.log("[tutor] Loaded", supabaseMessages.length, "messages from Supabase")
          
          // Use Supabase messages if we have them and conversationHistory is empty
          if (supabaseMessages.length > 0 && finalConversationHistory.length === 0) {
            finalConversationHistory = supabaseMessages
          }
          
          // Initialize Redis with Supabase data for future requests
          await storeConversationContext(sessionId, {
            messages: supabaseMessages,
            topic: session.topic || topic || "Learning Session",
            sessionId,
            studentId,
            lastUpdated: Date.now(),
          })
        }
      } else if (redisContext.messages && redisContext.messages.length > 0) {
        // Use Redis messages if available
        console.log("[tutor] Using Redis context with", redisContext.messages.length, "messages")
        if (finalConversationHistory.length === 0) {
          finalConversationHistory = redisContext.messages
        }
      }
    }
    
    // Add the new user message to context
    const userMessage = { role: "user" as const, content: message }
    finalConversationHistory = [...finalConversationHistory, userMessage]
    
    console.log("[tutor] Final conversation history length:", finalConversationHistory.length)

    // Build conversation for AI (last 10 messages for context window)
    const messages = finalConversationHistory.slice(-10)

    // Add current user message
    messages.push({
      role: "user" as const,
      content: message,
    })

    // Save to Redis
    if (sessionId) {
      await addMessageToContext(sessionId, {
        role: "user",
        content: message,
        timestamp: Date.now(),
      })
    }

    // Get feedback insights
    const { data: latestFeedback } = await supabase
      .from("feedback_records")
      .select("content")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let feedbackContext = ""
    if (latestFeedback?.content) {
      const analysis = (latestFeedback.content as any).analysis || {}
      feedbackContext = `
STUDENT FEEDBACK INSIGHTS:
- Struggling with: ${(analysis.weakConcepts || []).join(", ") || "None identified"}
- Mastered concepts: ${(analysis.strongConcepts || []).join(", ") || "None identified"}
- Engagement level: ${analysis.engagementLevel || "unknown"}
- Recommended approach: ${analysis.recommendationsForTutor?.[0]?.recommendation || "Standard pacing"}
`
    }

    // Get curriculum context with subtopics
    const { data: session } = await supabase
      .from("learning_sessions")
      .select("curriculum_plan, syllabus_content")
      .eq("id", sessionId)
      .single()

    let curriculumContext = ""
    if (session?.curriculum_plan) {
      const plan = session.curriculum_plan as any
      if (plan.lessons) {
        curriculumContext += `\n📚 CURRICULUM LESSONS TO FOLLOW:\n`
        plan.lessons.slice(0, 5).forEach((lesson: any, i: number) => {
          curriculumContext += `\n${i + 1}. ${lesson.title}\n`
          
          // Include subtopics/checkpoints
          if (lesson.subtopics && lesson.subtopics.length > 0) {
            curriculumContext += `   Subtopics to cover:\n`
            lesson.subtopics.forEach((sub: any, j: number) => {
              curriculumContext += `   ${String.fromCharCode(97 + j)}. ${sub.title}${sub.completed ? ' ✓' : ''}\n`
            })
          }
          
          if (lesson.content) {
            curriculumContext += `   Overview: ${lesson.content.slice(0, 150)}...\n`
          }
        })
        
        curriculumContext += `\n⚠️ IMPORTANT: Follow the curriculum order. Cover each subtopic systematically before moving to the next lesson. Reference specific subtopic names when teaching them.\n`
      }
    }

    // Build phase-specific teaching prompts
    let phaseGuidance = ""
    if (teachingState) {
      switch (teachingState.phase) {
        case "explain":
          phaseGuidance = `
CURRENT PHASE: EXPLAIN
- Start with a clear, simple explanation of ${teachingState.currentConcept}
- Use analogies and metaphors appropriate for ${gradeLevel || "Middle School"}
- Break down the concept into 2-3 key points
- End with a check-for-understanding question
- Resources available: ${teachingState.resources.map(r => r.title).join(", ") || "None"}
`
          break
        case "example":
          phaseGuidance = `
CURRENT PHASE: EXAMPLE
- Provide a concrete, relatable example of ${teachingState.currentConcept}
- Walk through the example step-by-step
- Connect the example back to the core concept
- Ask student to identify the key parts in the example
`
          break
        case "practice":
          phaseGuidance = `
CURRENT PHASE: PRACTICE
- Present a practice problem or scenario for ${teachingState.currentConcept}
- Let the student attempt it independently first
- Provide hints if they get stuck
- Celebrate correct attempts and gently guide if incorrect
`
          break
        case "assess":
          phaseGuidance = `
CURRENT PHASE: ASSESS
- Topic "${teachingState.currentConcept}" is complete!
- Provide a brief summary of what was learned
- Ask for a rating (1-5 stars) on understanding
- Transition to next topic or review if needed
`
          break
      }
    }

    // Build a single prompt for broad model compatibility
    const conversationLines = messages
      .map((m: any) => `${m.role === "assistant" ? "Tutor" : "Student"}: ${m.content}`)
      .join("\n")

    const prompt = `You are an expert, patient, and encouraging teacher conducting a one-on-one tutoring session.

TOPIC: ${topic || "General Learning"}
CURRENT CONCEPT: ${currentConcept || "General"}
STUDENT GRADE: ${gradeLevel || "Middle School"}

${phaseGuidance}
${feedbackContext}
${curriculumContext}

TEACHING PHILOSOPHY:
1. **FOLLOW THE CURRICULUM**: Systematically cover each subtopic listed in the curriculum before moving forward
2. **Name the Subtopic**: When teaching a new concept, explicitly mention which subtopic you're covering (e.g., "Let's learn about [Subtopic Name]")
3. Use Socratic method - guide with questions, don't just tell answers
4. Provide specific, concrete examples
5. Check for understanding frequently
6. Adapt difficulty based on student responses
7. Celebrate progress and provide encouragement
8. Break complex ideas into digestible chunks
9. Connect to real-world applications

IMPORTANT GUIDELINES:
- Keep responses concise (2-3 paragraphs max)
- When starting a new subtopic, say "Now let's explore [Subtopic Name]"
- Reference the curriculum subtopics by name so progress can be tracked
- Ask a follow-up question to verify understanding
- Provide hints before full explanations
- Use analogies and metaphors appropriate for the grade level
- If student is struggling, simplify and scaffold
- If student is excelling, challenge with extensions
- Always be warm, supportive, and enthusiastic

${requestRating ? `
⭐ RATING REQUEST:
The sub-topic is complete. Please ask the student to rate their understanding on a scale of 1-5 stars:
1 ⭐ = Very confused, need to review
2 ⭐⭐ = Somewhat understand, need more practice
3 ⭐⭐⭐ = Decent understanding, could use review
4 ⭐⭐⭐⭐ = Good understanding, feel confident
5 ⭐⭐⭐⭐⭐ = Excellent understanding, ready to move on

After receiving the rating, provide brief encouragement and suggest next steps.
` : ""}

Conversation so far:
${conversationLines}

Student: ${message}

Tutor: Provide a helpful, concise explanation followed by ONE short check-for-understanding question.`

    console.log("[Tutor API] 🤖 Calling Gemini API...")
    console.log("[Tutor API] Model: gemini-2.0-flash-exp")
    console.log("[Tutor API] Prompt length:", prompt.length, "chars")

    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt,
      temperature: 0.7,
    })

    console.log("[Tutor API] ✅ Gemini responded! Length:", text?.length || 0, "chars")

    const response = typeof text === "string" ? text : String(text)
    
    if (!response || response.trim().length === 0) {
      console.error("[Tutor API] ❌ Empty response from Gemini!")
      throw new Error("AI returned empty response")
    }

    console.log("[Tutor API] Response preview:", response.slice(0, 150) + "...")

    // Analyze student response to determine understanding level
    const understandingLevel: "low" | "medium" | "high" = 
      message.toLowerCase().includes("yes") || message.toLowerCase().includes("got it") || message.toLowerCase().includes("understand")
        ? "high"
        : message.toLowerCase().includes("no") || message.toLowerCase().includes("confused") || message.toLowerCase().includes("don't")
        ? "low"
        : "medium"

    // Update teaching phase if we have teaching state
    if (teachingState && sessionId) {
      const nextPhase = determineNextPhase(teachingState.phase, message, understandingLevel)
      
      // Update progress based on phase transitions
      let progress = teachingState.conceptProgress
      if (nextPhase !== teachingState.phase) {
        progress = Math.min(100, progress + 25) // Each phase completion adds 25%
      }
      
      await updateTeachingPhase(sessionId, nextPhase, progress)
    }

    // Save assistant response to Redis
    if (sessionId) {
      await addMessageToContext(sessionId, {
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      })
    }

    // Also save to Supabase for long-term storage (transcript)
    const fullHistory = [
      ...conversationHistory,
      { role: "user", content: message, timestamp: Date.now() },
      { role: "assistant", content: response, timestamp: Date.now() },
    ]

    if (sessionId) {
      try {
        await supabase
          .from("learning_sessions")
          .update({
            tutor_messages: fullHistory,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId)
      } catch (dbErr) {
        console.error("[tutor-chat-enhanced] Failed to persist tutor_messages:", dbErr)
      }

      // ====== LESSON CONTEXT TRACKING ======
      // Track teaching context for continuity and teacher dashboard
      try {
        // Get current lesson progress if exists
        const { data: lessonProgress } = await supabase
          .from("lesson_progress")
          .select("id")
          .eq("session_id", sessionId)
          .maybeSingle()

        if (lessonProgress) {
          const lessonProgressId = lessonProgress.id

          // Extract concepts from the tutor's response
          const conceptsInResponse = extractConcepts(response, currentConcept)
          const examplesInResponse = extractExamples(response)
          
          // Get existing context
          const { data: existingContext } = await supabase
            .from("lesson_context")
            .select("*")
            .eq("lesson_progress_id", lessonProgressId)
            .maybeSingle()

          // Merge with existing data
          const updatedConceptsTaught = [
            ...(existingContext?.concepts_taught || []),
            ...conceptsInResponse.filter((c: string) => 
              !(existingContext?.concepts_taught || []).includes(c)
            ),
          ]

          const updatedExamples = [
            ...(existingContext?.examples_used || []),
            ...examplesInResponse.filter((e: string) => 
              !(existingContext?.examples_used || []).includes(e)
            ),
          ]

          // Track if this was a question from the student
          const isQuestion = message.includes("?") || 
                           message.toLowerCase().startsWith("what") ||
                           message.toLowerCase().startsWith("how") ||
                           message.toLowerCase().startsWith("why")
          
          const updatedQuestions = isQuestion 
            ? [...(existingContext?.questions_asked || []), message]
            : existingContext?.questions_asked || []

          // Calculate engagement level based on message frequency and quality
          const totalMessages = (existingContext?.total_messages || 0) + 1
          const engagementLevel = calculateEngagementLevel(
            understandingLevel,
            totalMessages,
            isQuestion
          )

          // Upsert lesson context
          await supabase
            .from("lesson_context")
            .upsert({
              lesson_progress_id: lessonProgressId,
              student_id: studentId,
              session_id: sessionId,
              concepts_taught: updatedConceptsTaught,
              examples_used: updatedExamples,
              questions_asked: updatedQuestions,
              total_messages: totalMessages,
              student_engagement_level: engagementLevel,
              tutor_notes: generateTutorNotes(
                teachingState,
                understandingLevel,
                totalMessages
              ),
            })

          console.log("[lesson-context] Updated context:", {
            concepts: updatedConceptsTaught.length,
            examples: updatedExamples.length,
            messages: totalMessages,
            engagement: engagementLevel,
          })
        }
      } catch (contextErr) {
        console.error("[lesson-context] Failed to update context:", contextErr)
        // Don't fail the request if context tracking fails
      }
    }

    // Refresh teaching state for response
    const updatedTeachingState = sessionId ? await getTeachingState(sessionId) : null

    const totalTime = Date.now() - startTime
    console.log(`[Tutor API] ✅ SUCCESS in ${totalTime}ms`)

    return Response.json({
      success: true,
      response,
      cached: !!redisContext,
      teachingState: updatedTeachingState,
      resources: updatedTeachingState?.resources || [],
      currentPhase: updatedTeachingState?.phase || "explain",
      progress: updatedTeachingState?.conceptProgress || 0,
      _debug: {
        responseTime: totalTime,
        responseLength: response.length,
        apiKey: GOOGLE_API_KEY?.slice(0, 15) + "...",
      }
    })
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[Tutor API] ❌ ERROR after ${totalTime}ms:`, error)
    
    // Check if it's a quota error (429 status)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isQuotaError = errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")
    
    if (isQuotaError) {
      console.error("[Tutor API] ⚠️ QUOTA ERROR - API limits exceeded")
      return Response.json(
        {
          success: false,
          error: "AI quota limit reached. Please wait a moment and try again, or upgrade your API plan for higher limits.",
          quotaError: true,
          retryAfter: 60, // seconds
        },
        { status: 429 }
      )
    }

    // Check if it's an API key error
    if (errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("401")) {
      console.error("[Tutor API] ❌ API KEY ERROR")
      return Response.json(
        {
          success: false,
          error: "AI service authentication failed. Please check API key configuration.",
          authError: true,
        },
        { status: 500 }
      )
    }
    
    console.error("[Tutor API] Full error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process chat",
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 }
    )
  }
}
