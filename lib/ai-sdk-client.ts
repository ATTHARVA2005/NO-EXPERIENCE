// AI SDK client for tutor agent using Vercel AI Gateway
import { generateText } from "ai"

export async function tutorResponse(studentMessage: string, context: string, topicId?: string): Promise<string> {
  const systemPrompt = `You are an expert, patient AI tutor. Your role is to:
- Explain concepts clearly using analogies and examples
- Ask clarifying questions to understand the student's knowledge gaps
- Provide step-by-step guidance without giving direct answers
- Adapt your teaching style based on the student's responses
- Encourage and motivate the student
- Keep responses concise (2-3 sentences) for real-time conversation

${topicId ? `Current topic: ${topicId}` : ""}

${context ? `Student context:\n${context}` : ""}`

  const { text } = await generateText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    prompt: studentMessage,
    temperature: 0.7,
    maxTokens: 200,
  })

  return text
}

export async function feedbackAgent(
  studentAnswer: string,
  correctAnswer: string,
  questionText: string,
): Promise<{
  correct: boolean
  reasoning: string
  feedback: string
  nextStep: string
  errorType?: "concept" | "arithmetic" | "careless" | "reading"
}> {
  const { text } = await generateText({
    model: "openai/gpt-4o-mini",
    system: `You are an expert educational evaluator. Analyze the student's answer and provide structured feedback.
Return a JSON object with: correct (boolean), reasoning (explanation of evaluation), feedback (constructive feedback for student), nextStep (what to do next), errorType (if wrong).`,
    prompt: `Question: ${questionText}
Student Answer: ${studentAnswer}
Correct Answer: ${correctAnswer}

Provide feedback as JSON.`,
    temperature: 0.5,
    maxTokens: 300,
  })

  try {
    return JSON.parse(text)
  } catch {
    return {
      correct: studentAnswer.toLowerCase().includes(correctAnswer.toLowerCase()),
      reasoning: "Evaluation completed",
      feedback: "Good attempt. Review the concept again.",
      nextStep: "Try another question or ask for clarification.",
    }
  }
}
