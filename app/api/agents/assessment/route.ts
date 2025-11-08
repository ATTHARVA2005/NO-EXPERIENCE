import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  topic: string
}

export async function POST(request: Request) {
  try {
    const { sessionId, topic, gradeLevel, conversationHistory, lessons } = await request.json()

    if (!topic) {
      return NextResponse.json(
        { success: false, error: "Topic is required" },
        { status: 400 }
      )
    }

    console.log("[assessment] Generating questions for:", topic)

    // Build context from conversation and lessons
    let context = `Generate exactly 5 multiple-choice assessment questions for a ${gradeLevel} student who just completed learning about ${topic}.

`

    // Add lesson context
    if (lessons && lessons.length > 0) {
      context += `CURRICULUM COVERED:\n`
      lessons.forEach((lesson: any, index: number) => {
        context += `\nLesson ${index + 1}: ${lesson.title}\n`
        if (lesson.subtopics) {
          context += `Subtopics:\n`
          lesson.subtopics.forEach((st: any) => {
            context += `- ${st.title || st}\n`
          })
        }
      })
      context += `\n`
    }

    // Add conversation context
    if (conversationHistory && conversationHistory.length > 0) {
      context += `TOPICS DISCUSSED IN TUTORING SESSION:\n`
      const tutorMessages = conversationHistory
        .filter((msg: any) => msg.role === "assistant" || msg.role === "tutor")
        .slice(-10) // Last 10 tutor messages
        .map((msg: any) => msg.content)
        .join("\n")
      
      context += tutorMessages + `\n\n`
    }

    context += `INSTRUCTIONS:
1. Create 5 questions that test understanding of the key concepts covered
2. Mix difficulty levels: 2 easy, 2 medium, 1 challenging
3. Each question should have 4 options (A, B, C, D)
4. Questions should test actual understanding, not just memorization
5. Cover different topics/subtopics from the curriculum
6. Make questions clear and appropriate for ${gradeLevel} level

CRITICAL: Return ONLY valid JSON array with this exact structure:
[
  {
    "id": "q1",
    "question": "Clear question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "topic": "Specific subtopic name"
  }
]

Rules:
- correctAnswer is the index (0-3) of the correct option
- ALL strings must use double quotes
- NO trailing commas
- NO markdown code blocks
- NO extra text before or after JSON`

    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt: context,
      temperature: 0.7,
    })

    console.log("[assessment] Raw response:", text.substring(0, 500))

    // Parse JSON
    let questions: Question[] = []
    try {
      let cleaned = text.trim()
      
      // Remove markdown code blocks
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "")
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "")
      }

      // Remove any text before opening bracket
      const firstBracket = cleaned.indexOf('[')
      if (firstBracket > 0) {
        cleaned = cleaned.substring(firstBracket)
      }

      // Remove any text after closing bracket
      const lastBracket = cleaned.lastIndexOf(']')
      if (lastBracket !== -1 && lastBracket < cleaned.length - 1) {
        cleaned = cleaned.substring(0, lastBracket + 1)
      }

      questions = JSON.parse(cleaned)

      // Validate questions
      if (!Array.isArray(questions) || questions.length !== 5) {
        throw new Error("Invalid number of questions")
      }

      // Ensure all required fields are present
      questions = questions.map((q, index) => ({
        id: q.id || `q${index + 1}`,
        question: q.question || "Question not provided",
        options: Array.isArray(q.options) && q.options.length === 4 
          ? q.options 
          : ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer < 4
          ? q.correctAnswer
          : 0,
        topic: q.topic || topic,
      }))

      console.log("[assessment] Successfully generated", questions.length, "questions")

    } catch (parseError) {
      console.error("[assessment] Failed to parse questions:", parseError)
      
      // Fallback: Create generic questions
      questions = [
        {
          id: "q1",
          question: `What is the main concept of ${topic}?`,
          options: [
            "A fundamental principle that was discussed",
            "An unrelated concept",
            "Something not covered",
            "A different subject",
          ],
          correctAnswer: 0,
          topic: topic,
        },
        {
          id: "q2",
          question: `Which of the following best describes a key aspect of ${topic}?`,
          options: [
            "An incorrect description",
            "The correct description based on lessons",
            "Something unrelated",
            "A different topic",
          ],
          correctAnswer: 1,
          topic: topic,
        },
        {
          id: "q3",
          question: `How would you apply ${topic} in a real-world scenario?`,
          options: [
            "By ignoring the principles",
            "By using unrelated methods",
            "By applying the concepts learned",
            "By doing something different",
          ],
          correctAnswer: 2,
          topic: topic,
        },
        {
          id: "q4",
          question: `What is an important consideration when working with ${topic}?`,
          options: [
            "Ignoring best practices",
            "Following random approaches",
            "Not considering the context",
            "Following the principles discussed",
          ],
          correctAnswer: 3,
          topic: topic,
        },
        {
          id: "q5",
          question: `Which statement about ${topic} is most accurate?`,
          options: [
            "It aligns with what was taught in the session",
            "It contradicts the lessons",
            "It's completely unrelated",
            "It's from a different subject",
          ],
          correctAnswer: 0,
          topic: topic,
        },
      ]
      
      console.log("[assessment] Using fallback questions")
    }

    return NextResponse.json({
      success: true,
      questions,
    })

  } catch (error) {
    console.error("[assessment] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
