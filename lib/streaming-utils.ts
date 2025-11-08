// Utilities for streaming AI responses in real-time
import { streamText } from "ai"

export async function streamTutorResponse(studentMessage: string, context: string, onChunk: (chunk: string) => void) {
  try {
    const result = await streamText({
      model: "openai/gpt-4o-mini",
      system: `You are an expert, patient AI tutor. Explain concepts clearly using analogies and examples. Ask clarifying questions. Provide step-by-step guidance. Adapt to the student's knowledge level.
${context ? `Context: ${context}` : ""}`,
      prompt: studentMessage,
      temperature: 0.7,
    })

    for await (const event of result.textStream) {
      onChunk(event)
    }
  } catch (error) {
    console.error("Streaming error:", error)
    throw error
  }
}
