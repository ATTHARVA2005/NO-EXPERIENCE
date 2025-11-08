"use server"

import { google } from "@ai-sdk/google"
import { generateText, streamText } from "ai"

export interface TutorContext {
  studentName?: string
  gradeLevel?: number
  topic?: string
  learningStyle?: "visual" | "auditory" | "kinesthetic" | "reading"
  previousWeaknesses?: string[]
  recentPerformance?: number // 0-100
  feedbackInsights?: {
    strugglingConcepts?: string[]
    masteredConcepts?: string[]
    recommendedDifficulty?: "easier" | "maintain" | "harder"
    engagementLevel?: "low" | "medium" | "high"
    teachingStrategy?: string
  }
  sessionContext?: {
    messageCount?: number
    topicsCovered?: string[]
    questionsAsked?: number
    conceptsExplained?: string[]
  }
}

/**
 * Advanced Tutor Agent: Provides personalized, adaptive explanations with feedback integration
 * Uses Gemini's thinking capability for better pedagogical reasoning
 * Integrates feedback from assessment and feedback agents for continuous improvement
 */
export async function generateTutorResponse(
  studentMessage: string,
  context: TutorContext,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  retrievalContext?: string,
): Promise<string> {
  const referenceSection = retrievalContext
    ? `\nREFERENCE MATERIAL (prioritise this knowledge before inventing new details):\n${retrievalContext}\n\n`
    : "\nIf information is missing, state what you need and suggest a next step instead of guessing."

  // Build adaptive teaching strategy based on feedback
  const feedbackSection = context.feedbackInsights
    ? `
FEEDBACK INSIGHTS FROM PREVIOUS SESSIONS:
${context.feedbackInsights.strugglingConcepts?.length ? `- Student struggles with: ${context.feedbackInsights.strugglingConcepts.join(", ")}` : ""}
${context.feedbackInsights.masteredConcepts?.length ? `- Student has mastered: ${context.feedbackInsights.masteredConcepts.join(", ")}` : ""}
${context.feedbackInsights.recommendedDifficulty ? `- Recommended difficulty adjustment: ${context.feedbackInsights.recommendedDifficulty}` : ""}
${context.feedbackInsights.engagementLevel ? `- Recent engagement level: ${context.feedbackInsights.engagementLevel}` : ""}
${context.feedbackInsights.teachingStrategy ? `- Suggested teaching strategy: ${context.feedbackInsights.teachingStrategy}` : ""}

ADAPTIVE TEACHING DIRECTIVES:
${context.feedbackInsights.strugglingConcepts?.length ? `- Spend extra time on ${context.feedbackInsights.strugglingConcepts[0]}, using multiple approaches (visual, examples, analogies)` : ""}
${context.feedbackInsights.recommendedDifficulty === "easier" ? "- Simplify explanations, break down into smaller steps, provide more scaffolding" : ""}
${context.feedbackInsights.recommendedDifficulty === "harder" ? "- Introduce more advanced concepts, challenge with complex problems, reduce scaffolding" : ""}
${context.feedbackInsights.engagementLevel === "low" ? "- Use more engaging examples, gamification, real-world connections, and interactive questions" : ""}
`
    : ""

  const sessionSection = context.sessionContext
    ? `
SESSION AWARENESS:
- Messages exchanged: ${context.sessionContext.messageCount ?? 0}
- Topics covered today: ${context.sessionContext.topicsCovered?.join(", ") || "starting fresh"}
- Questions asked: ${context.sessionContext.questionsAsked ?? 0}
- Concepts explained: ${context.sessionContext.conceptsExplained?.join(", ") || "none yet"}

SESSION MANAGEMENT:
${(context.sessionContext.messageCount ?? 0) >= 8 && (context.sessionContext.questionsAsked ?? 0) === 0 ? "- Consider asking a check-for-understanding question" : ""}
${(context.sessionContext.topicsCovered?.length ?? 0) >= 3 ? "- Suggest a practice assignment or quick assessment to reinforce learning" : ""}
${(context.sessionContext.messageCount ?? 0) >= 12 ? "- Consider summarizing key points and transitioning to next topic or assessment" : ""}
`
    : ""

  const systemPrompt = `You are an expert, patient AI tutor with deep pedagogical expertise and ADAPTIVE INTELLIGENCE. Your role is to:

TEACHING APPROACH:
- Explain concepts clearly using examples, analogies, and visualizations appropriate to the learning style
- Ask probing questions to understand the student's knowledge gaps and misconceptions
- Provide scaffolded guidance - break complex concepts into manageable steps
- Never give direct answers; guide students to discover solutions
- Adapt complexity based on student responses and demonstrated understanding
- Use the student's learning style: ${context.learningStyle || "mixed approaches"}
- **CRITICAL**: Integrate feedback from assessment agent to personalize every interaction

STUDENT PROFILE:
${context.studentName ? `- Student Name: ${context.studentName}` : ""}
${context.gradeLevel ? `- Grade Level: ${context.gradeLevel}` : ""}
${context.topic ? `- Current Topic: ${context.topic}` : ""}
${context.recentPerformance ? `- Recent Performance: ${context.recentPerformance}%` : ""}
${context.previousWeaknesses?.length ? `- Areas to strengthen: ${context.previousWeaknesses.join(", ")}` : ""}

${feedbackSection}

${sessionSection}

COMMUNICATION STYLE:
- Keep responses engaging and conversational (2-3 sentences max for chat)
- Be encouraging and build confidence
- Use appropriate vocabulary for the grade level
- Create mental hooks and memory aids
- Relate concepts to real-world applications the student cares about
- **Use multimedia cues**: When explaining visual concepts, say "Let me show you an image..." or "Here's a diagram that illustrates..."

FEEDBACK LOOP:
- After each explanation, check: "Does this make sense so far?"
- Adapt based on response patterns
- Celebrate progress and effort, not just correct answers
- Suggest when a student should practice or move on
- **Signal to assignment agent** when student demonstrates readiness for assessment (e.g., "You've got a good grasp of this! Ready to try some practice problems?")
${referenceSection}`

  const messages = conversationHistory || []
  messages.push({ role: "user" as const, content: studentMessage })

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
      maxOutputTokens: 400,
    })

    return text
  } catch (error) {
    console.error("[tutor-agent] Error:", error)
    throw new Error("Failed to generate tutor response")
  }
}

/**
 * Stream tutor response for real-time conversation UI
 */
export async function streamTutorResponse(studentMessage: string, context: TutorContext) {
  const systemPrompt = `You are an expert, patient AI tutor. Explain concepts clearly using examples and analogies appropriate for grade ${context.gradeLevel || "middle"} students with learning style: ${context.learningStyle || "mixed"}. Ask guiding questions rather than giving answers. Keep responses conversational and encouraging.`

  const stream = streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    prompt: studentMessage,
    temperature: 0.7,
    maxOutputTokens: 400,
  })

  return stream
}
