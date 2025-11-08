import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { searchEducationalResources } from "@/lib/tavily-client"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const {
      sessionId,
      studentId,
      studentName,
      message,
      topic,
      gradeLevel,
      learningGoals,
      currentLesson,
      curriculum,
      conversationHistory = [],
    } = await request.json()

    if (!message || !studentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Build context for the AI with curriculum awareness
    let context = `You are an expert, patient AI tutor teaching ${topic} to a ${gradeLevel} student named ${studentName}.

Learning Goals: ${learningGoals || "Understanding core concepts"}`

    // Add curriculum context if available
    if (currentLesson) {
      context += `

CURRENT LESSON: ${currentLesson.title}
Lesson Content: ${currentLesson.content || "Core concepts and fundamentals"}
Focus on teaching these subtopics: ${currentLesson.subtopics?.map((st: any) => st.title || st).join(", ")}
Duration: ${currentLesson.duration || "ongoing"}

You should:
- Focus ONLY on topics from this lesson
- Teach the subtopics in a logical order
- Check understanding before moving to next subtopic
- Provide examples related to the lesson content
- Mark progress as subtopics are mastered`
    }

    if (curriculum?.overview) {
      context += `

CURRICULUM OVERVIEW: ${curriculum.overview}
This lesson is part of a larger curriculum. Keep the bigger picture in mind.`
    }

    context += `

Your teaching style:
- Explain concepts clearly using analogies and real-world examples
- Ask clarifying questions to check understanding
- Provide step-by-step guidance
- Use encouraging language
- Adapt to the student's knowledge level
- When explaining complex topics, consider suggesting visual aids

Keep responses concise but thorough (2-3 paragraphs max unless explaining complex topics).`

    // Prepare conversation history for AI
    const messages = [
      { role: "system" as const, content: context },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ]

    // Generate response using Gemini
    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      messages,
      temperature: 0.7,
    })

    // Analyze if we need an image for explanation
    const needsImage = await checkIfNeedsImage(message, text)
    let imageUrl: string | undefined

    if (needsImage) {
      imageUrl = await fetchEducationalImage(needsImage.query, topic)
    }

    // Search for live educational resources using Tavily
    let liveResources: any[] = []
    try {
      // Build specific search query from current lesson
      let searchQuery = topic
      
      if (currentLesson) {
        // Use lesson title and subtopics for very specific search
        searchQuery = `${currentLesson.title} ${topic}`
        
        // Add first 2 subtopics to make it even more specific
        if (currentLesson.subtopics && currentLesson.subtopics.length > 0) {
          const subtopicTerms = currentLesson.subtopics
            .slice(0, 2)
            .map((st: any) => (typeof st === "string" ? st : st.title))
            .join(" ")
          searchQuery += ` ${subtopicTerms}`
        }
        
        console.log("[tutor] Tavily search query:", searchQuery)
      }
      
      const resources = await searchEducationalResources(searchQuery, 4)
      liveResources = resources.slice(0, 3).map((r) => ({
        id: r.url,
        title: r.title,
        type: r.type,
        url: r.url,
        duration: r.type === "video" ? "Video" : r.type === "documentation" ? "Docs" : "Article",
      }))
      
      console.log("[tutor] Found resources:", liveResources.length)
    } catch (error) {
      console.error("[tutor] Tavily resource search failed:", error)
    }

    // Analyze progress based on conversation
    const progressUpdate = await analyzeProgress(conversationHistory, message, text)

    // Extract key takeaways from response and current lesson
    const keyTakeaways = extractKeyTakeaways(text, conversationHistory, currentLesson)

    // Suggest next focus topics based on curriculum
    const nextFocus = suggestNextFocus(topic, text, currentLesson, curriculum)

    return NextResponse.json({
      success: true,
      message: text,
      imageUrl,
      liveResources,
      progressUpdate,
      keyTakeaways,
      nextFocus,
      lessonComplete: progressUpdate.completion >= 100,
    })
  } catch (error) {
    console.error("[tutor] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "I apologize, but I encountered an error. Could you please rephrase your question?",
      },
      { status: 500 }
    )
  }
}

async function checkIfNeedsImage(question: string, response: string) {
  // Check if the conversation mentions visual concepts
  const visualKeywords = [
    "diagram",
    "graph",
    "chart",
    "picture",
    "show",
    "illustrate",
    "visual",
    "example",
    "looks like",
    "appears",
  ]

  const needsVisualization = visualKeywords.some(
    (keyword) =>
      question.toLowerCase().includes(keyword) ||
      response.toLowerCase().includes(keyword)
  )

  if (needsVisualization) {
    // Extract what to visualize
    const query = extractImageQuery(question, response)
    return { needed: true, query }
  }

  return null
}

function extractImageQuery(question: string, response: string): string {
  // Simple extraction - in production, use more sophisticated NLP
  const combined = `${question} ${response}`.toLowerCase()

  // Look for common educational image patterns
  if (combined.includes("probability")) return "probability diagram coin flip"
  if (combined.includes("statistics")) return "statistics chart data visualization"
  if (combined.includes("math")) return "mathematics illustration"
  if (combined.includes("science")) return "science diagram illustration"

  return "educational diagram"
}

async function fetchEducationalImage(query: string, topic: string): Promise<string | undefined> {
  try {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID

    if (!apiKey || !searchEngineId) {
      console.warn("[tutor] Google Custom Search not configured")
      return undefined
    }

    const searchQuery = `${topic} ${query} educational diagram`
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
      searchQuery
    )}&searchType=image&num=1&safe=active&imgSize=medium`

    const response = await fetch(url)
    const data = await response.json()

    if (data.items && data.items.length > 0) {
      return data.items[0].link
    }

    return undefined
  } catch (error) {
    console.error("[tutor] Error fetching image:", error)
    return undefined
  }
}

async function analyzeProgress(
  conversationHistory: any[],
  currentMessage: string,
  response: string
) {
  // Simple progress tracking based on conversation depth
  const totalMessages = conversationHistory.length + 2 // Include current exchange
  const tutorMessages = Math.ceil(totalMessages / 2)

  // Progress increases with each meaningful exchange
  let completion = Math.min(Math.round((tutorMessages / 10) * 100), 100)

  // Check if certain concepts are covered
  let checkpointCompleted: string | null = null

  if (totalMessages >= 2 && totalMessages < 6) {
    checkpointCompleted = "intro"
    completion = Math.max(completion, 25)
  } else if (totalMessages >= 6 && totalMessages < 12) {
    checkpointCompleted = "core"
    completion = Math.max(completion, 50)
  } else if (totalMessages >= 12 && totalMessages < 18) {
    checkpointCompleted = "examples"
    completion = Math.max(completion, 75)
  } else if (totalMessages >= 18) {
    checkpointCompleted = "practice"
    completion = 100
  }

  return {
    completion,
    checkpointCompleted,
  }
}

function extractKeyTakeaways(response: string, conversationHistory: any[], currentLesson?: any): string[] {
  const takeaways: string[] = []

  // Priority 1: Extract from current lesson subtopics
  if (currentLesson?.subtopics && currentLesson.subtopics.length > 0) {
    const subtopics = currentLesson.subtopics
      .slice(0, 3)
      .map((st: any) => (typeof st === "string" ? st : st.title || st))
    takeaways.push(...subtopics)
  }

  // Priority 2: Look for sentences with key educational phrases in response
  const keyPhrases = [
    "is calculated as",
    "is defined as",
    "the formula is",
    "remember that",
    "important to note",
    "key concept",
    "in other words",
    "simply put",
  ]

  const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 0)

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase()
    if (keyPhrases.some((phrase) => lowerSentence.includes(phrase)) && takeaways.length < 3) {
      takeaways.push(sentence.trim())
    }
  }

  // Ensure we have at least 3 takeaways
  if (takeaways.length === 0 && currentLesson?.content) {
    takeaways.push(`Understanding ${currentLesson.title}`)
    takeaways.push("Building foundational knowledge")
    takeaways.push("Applying concepts through practice")
  }

  // Limit to 3 most recent/important takeaways
  return takeaways.slice(0, 3)
}

function suggestNextFocus(topic: string, response: string, currentLesson?: any, curriculum?: any): string[] {
  const suggestions: string[] = []

  // Priority 1: Get next topics from curriculum
  if (curriculum?.lessons && Array.isArray(curriculum.lessons)) {
    const currentIndex = curriculum.lessons.findIndex((l: any) => l.title === currentLesson?.title)
    
    if (currentIndex !== -1 && currentIndex < curriculum.lessons.length - 1) {
      // Get next 2 lessons from curriculum
      const nextLessons = curriculum.lessons.slice(currentIndex + 1, currentIndex + 3)
      suggestions.push(...nextLessons.map((l: any) => l.title))
    }
  }

  // Priority 2: Get remaining subtopics from current lesson
  if (suggestions.length < 2 && currentLesson?.subtopics) {
    const remainingSubtopics = currentLesson.subtopics
      .slice(3, 5)
      .map((st: any) => (typeof st === "string" ? st : st.title))
    suggestions.push(...remainingSubtopics)
  }

  // Priority 3: Generic topic-based suggestions (fallback)
  if (suggestions.length === 0) {
    if (topic.toLowerCase().includes("probability")) {
      suggestions.push("Learning through examples with dice")
      suggestions.push("Probability with playing cards")
    } else if (topic.toLowerCase().includes("physics")) {
      suggestions.push("Newton's Laws in everyday life")
      suggestions.push("Energy conservation examples")
    } else if (topic.toLowerCase().includes("math")) {
      suggestions.push("Practical applications")
      suggestions.push("Problem-solving strategies")
    } else {
      suggestions.push(`Advanced ${topic} concepts`)
      suggestions.push(`${topic} practice problems`)
    }
  }

  return suggestions.slice(0, 2)
}
