import { generateText } from "ai"

const MODEL_ID = "google/gemini-2.0-flash-exp"

/**
 * Enhanced syllabus parser with AI-powered extraction
 * Handles PDF, DOCX, TXT files and extracts structured information
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("syllabus") || formData.get("file")

    if (!file || !(file instanceof File)) {
      return Response.json({ success: false, error: "No syllabus file provided" }, { status: 400 })
    }

    // Extract raw text based on file type
    let rawText = ""
    const fileType = file.type || file.name.split(".").pop()?.toLowerCase()

    if (fileType?.includes("pdf")) {
      // For PDF files, use Gemini's multimodal capabilities
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")
      
      try {
        const { text } = await generateText({
          model: MODEL_ID,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all text content from this PDF document. Return only the extracted text, preserving structure and formatting as much as possible.",
                },
                {
                  type: "file",
                  data: `data:application/pdf;base64,${base64}`,
                  mediaType: "application/pdf",
                },
              ],
            },
          ],
        })
        rawText = text
      } catch (pdfError) {
        console.warn("[syllabus] PDF parsing with AI failed, using basic extraction", pdfError)
        rawText = await file.text()
      }
    } else {
      // For text-based files (TXT, DOCX as text, etc.)
      rawText = await file.text()
    }

    // Use AI to extract structured information from syllabus
    const analysisPrompt = `Analyze this course syllabus and extract key information:

SYLLABUS CONTENT:
${rawText}

Extract and structure:
1. **Course Title/Topic**
2. **Grade/Level**
3. **Main Topics/Modules** (list all)
4. **Learning Objectives**
5. **Key Concepts** (important terms and ideas)
6. **Assessment Methods** (if mentioned)
7. **Prerequisites** (if any)

Return a clear, structured summary focusing on what will be taught and in what order.`

    let structuredSummary = ""
    try {
      const { text } = await generateText({
        model: MODEL_ID,
        prompt: analysisPrompt,
      })
      structuredSummary = text
    } catch (aiError) {
      console.warn("[syllabus] AI analysis failed, using basic summary", aiError)
      structuredSummary = rawText.slice(0, 1000)
    }

    return Response.json({
      success: true,
      content: rawText,
      summary: structuredSummary,
      wordCount: rawText.split(/\s+/).length,
      fileName: file.name,
      fileType,
    })
  } catch (error) {
    console.error("[syllabus] Failed to parse upload", error)
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to parse syllabus" 
      }, 
      { status: 500 }
    )
  }
}
