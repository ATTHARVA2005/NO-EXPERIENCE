import { createClient } from "@supabase/supabase-js"
import { generateText } from "ai"

const MODEL_ID = "google/gemini-2.0-flash-exp"

export async function POST(request: Request) {
  try {
    const { sessionId, studentId, currentCurriculum, editPrompt, topic } = await request.json()

    if (!editPrompt || !currentCurriculum) {
      return Response.json(
        { success: false, error: "editPrompt and currentCurriculum are required" },
        { status: 400 }
      )
    }

    const prompt = `You are an expert curriculum designer. The user wants to modify their curriculum.

CURRENT CURRICULUM:
${JSON.stringify(currentCurriculum, null, 2)}

USER REQUEST: ${editPrompt}

Please update the curriculum based on the user's request. Maintain the same JSON structure.

Return ONLY a valid JSON object with this EXACT structure:
{
  "lessons": [
    {
      "id": "lesson-1",
      "title": "Concise lesson title",
      "topic": "${topic}",
      "duration": 20,
      "completed": false,
      "content": "Detailed teaching plan with intro, main concepts, activities, and assessment"
    }
  ],
  "resources": [
    {
      "id": "resource-1",
      "title": "Resource title",
      "type": "video|article|pdf|interactive",
      "url": "URL to resource",
      "duration": 15
    }
  ],
  "assignments": [
    {
      "id": "assignment-1",
      "title": "Assignment title",
      "description": "What students will do",
      "topic": "${topic}",
      "status": "pending",
      "dueDate": "ISO date string"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.`

    const { text } = await generateText({
      model: MODEL_ID,
      prompt,
      temperature: 0.7,
    })

    // Clean up the response
    let cleanedText = text.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "")
    }

    const updatedCurriculum = JSON.parse(cleanedText)

    // Update in database if sessionId provided
    if (sessionId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
        
        await supabase
          .from("learning_sessions")
          .update({
            curriculum_plan: updatedCurriculum,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId)
      }
    }

    return Response.json({
      success: true,
      curriculum: updatedCurriculum,
    })
  } catch (error) {
    console.error("[curriculum-editor] Error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to edit curriculum",
      },
      { status: 500 }
    )
  }
}
