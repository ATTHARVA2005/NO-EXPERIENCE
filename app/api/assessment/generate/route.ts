import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getSupabaseServer } from "@/lib/supabase-server"

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, topics, gradeLevel, difficulty, sessionId, lessonContent } = body

    console.log("[assessment] Request body:", { studentId, topics, gradeLevel, sessionId })

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
        { status: 400 }
      )
    }

    const topic = topics?.[0] || "General"
    console.log("[assessment] Generating questions for:", topic)

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const prompt = `You are an educational assessment expert. Generate 5 multiple-choice questions to test understanding of: ${topic}

Grade Level: ${gradeLevel || 6}
Difficulty: ${difficulty || "medium"}
${lessonContent ? `Lesson content: ${lessonContent}` : ""}

Requirements:
1. Each question should test key concepts
2. Provide 4 options (A, B, C, D)
3. Only ONE correct answer
4. Include brief explanation for correct answer
5. Questions should be clear and unambiguous
6. Cover different aspects of the topic
7. Make questions age-appropriate for grade ${gradeLevel || 6}

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "This is correct because..."
    }
  ]
}`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response")
    }

    const assessmentData = JSON.parse(jsonMatch[0])

    // Store assessment in database
    let assessmentId = `assessment_${Date.now()}`
    
    if (studentId && sessionId) {
      const supabase = await getSupabaseServer()
      
      const { data: assessment, error } = await supabase
        .from("assessments")
        .insert({
          student_id: studentId,
          session_id: sessionId,
          topic,
          questions: assessmentData.questions,
          status: "pending",
          total_points: assessmentData.questions.length * 10,
        })
        .select()
        .single()

      if (error) {
        console.error("[assessment] Database error:", error)
      } else {
        console.log("[assessment] Stored in database:", assessment.id)
        assessmentId = assessment.id
      }
    }

    return NextResponse.json({
      success: true,
      questions: assessmentData.questions,
      assessmentId,
      totalQuestions: assessmentData.questions.length,
      passingScore: 60,
    })
  } catch (error: any) {
    console.error("[assessment] Generation error:", error)
    console.error("[assessment] Error stack:", error.stack)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to generate assessment",
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
