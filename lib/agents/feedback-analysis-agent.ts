"use server"

import { google } from "@ai-sdk/google"
import { generateText } from "ai"

export interface FeedbackAnalysisInput {
  studentId: string
  sessionId?: string
  tutorConversation?: Array<{ role: string; content: string }>
  assignmentResults?: Array<{
    assignmentId: string
    topic: string
    score: number
    percentCorrect: number
    timeSpent?: number
    mistakes?: Array<{ concept: string; question: string; studentAnswer: string; correctAnswer: string }>
    studentRating?: number
  }>
  recentPerformance?: {
    averageScore: number
    topicsStruggledWith: string[]
    topicsMastered: string[]
    engagementMetrics?: {
      sessionDuration: number
      questionsAsked: number
      responsiveness: "high" | "medium" | "low"
    }
  }
}

export interface FeedbackAnalysisOutput {
  studentId: string
  sessionId?: string
  weakConcepts: string[]
  strongConcepts: string[]
  learningGaps: string[]
  misconceptions: Array<{ concept: string; description: string; severity: "high" | "medium" | "low" }>
  engagementLevel: "low" | "medium" | "high"
  engagementFactors: string[]
  recommendationsForTutor: Array<{
    priority: "high" | "medium" | "low"
    category: "teaching_strategy" | "pacing" | "content" | "engagement"
    recommendation: string
    reasoning: string
  }>
  recommendationsForAssignment: Array<{
    priority: "high" | "medium" | "low"
    category: "difficulty" | "topic" | "format" | "timing"
    recommendation: string
    reasoning: string
  }>
  suggestedNextTopics: string[]
  recommendedDifficulty: "easier" | "maintain" | "harder"
  suggestedPracticeAreas: string[]
  sessionSummary: string
  keyTakeaways: string[]
  progressIndicators: {
    conceptualUnderstanding: number
    problemSolvingSkill: number
    retentionLikelihood: number
  }
  confidenceScore: number
  dataQuality: "excellent" | "good" | "limited" | "insufficient"
}

const hasModelAccess = Boolean(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY,
)

export async function analyzeLearningProgress(input: FeedbackAnalysisInput): Promise<FeedbackAnalysisOutput> {
  if (!hasModelAccess) {
    return generateFallbackFeedback(input)
  }

  try {
    const analysisPrompt = buildFeedbackPrompt(input)
    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt: analysisPrompt,
      temperature: 0.4,
      maxOutputTokens: 2000,
    })
    const analysis = parseAnalysisResponse(text, input)
    return analysis
  } catch (error) {
    console.error("[feedback-analysis-agent] Analysis error:", error)
    return generateFallbackFeedback(input)
  }
}

function buildFeedbackPrompt(input: FeedbackAnalysisInput): string {
  const conversationSummary = input.tutorConversation
    ? `TUTOR SESSION TRANSCRIPT (${input.tutorConversation.length} messages):\n${input.tutorConversation.map((msg, i) => `${i + 1}. ${msg.role.toUpperCase()}: ${msg.content}`).join("\n")}`
    : ""
  const assignmentSummary = input.assignmentResults
    ? `ASSIGNMENT RESULTS (${input.assignmentResults.length} assignments):\n${input.assignmentResults.map((a, i) => `Assignment ${i + 1}: ${a.topic}\n- Score: ${a.score}/${a.percentCorrect}%\n- Time: ${a.timeSpent ? `${a.timeSpent}s` : "N/A"}\n- Rating: ${a.studentRating ? `${a.studentRating}/5` : "N/A"}\n- Mistakes: ${a.mistakes?.map((m) => `${m.concept}: ${m.question}`).join(", ") || "None"}`).join("\n\n")}`
    : ""
  const performanceSummary = input.recentPerformance
    ? `HISTORICAL PERFORMANCE:\n- Avg score: ${input.recentPerformance.averageScore}%\n- Struggled: ${input.recentPerformance.topicsStruggledWith.join(", ") || "None"}\n- Mastered: ${input.recentPerformance.topicsMastered.join(", ") || "None"}`
    : ""

  return `You are an expert educational psychologist. Analyze this student learning data and provide comprehensive feedback.

${conversationSummary}
${assignmentSummary}
${performanceSummary}

Return ONLY valid JSON:
{
  "weakConcepts": ["concept1"],
  "strongConcepts": ["concept2"],
  "learningGaps": ["gap1"],
  "misconceptions": [{"concept":"X","description":"Y","severity":"high"}],
  "engagementLevel": "medium",
  "engagementFactors": ["factor1"],
  "recommendationsForTutor": [{"priority":"high","category":"teaching_strategy","recommendation":"X","reasoning":"Y"}],
  "recommendationsForAssignment": [{"priority":"high","category":"difficulty","recommendation":"X","reasoning":"Y"}],
  "suggestedNextTopics": ["topic1"],
  "recommendedDifficulty": "maintain",
  "suggestedPracticeAreas": ["area1"],
  "sessionSummary": "summary text",
  "keyTakeaways": ["takeaway1"],
  "progressIndicators": {"conceptualUnderstanding":65,"problemSolvingSkill":55,"retentionLikelihood":70},
  "confidenceScore": 85,
  "dataQuality": "good"
}`
}

function parseAnalysisResponse(text: string, input: FeedbackAnalysisInput): FeedbackAnalysisOutput {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
    return {
      studentId: input.studentId,
      sessionId: input.sessionId,
      weakConcepts: Array.isArray(parsed.weakConcepts) ? parsed.weakConcepts : [],
      strongConcepts: Array.isArray(parsed.strongConcepts) ? parsed.strongConcepts : [],
      learningGaps: Array.isArray(parsed.learningGaps) ? parsed.learningGaps : [],
      misconceptions: Array.isArray(parsed.misconceptions) ? parsed.misconceptions : [],
      engagementLevel: parsed.engagementLevel || "medium",
      engagementFactors: Array.isArray(parsed.engagementFactors) ? parsed.engagementFactors : [],
      recommendationsForTutor: Array.isArray(parsed.recommendationsForTutor) ? parsed.recommendationsForTutor : [],
      recommendationsForAssignment: Array.isArray(parsed.recommendationsForAssignment)
        ? parsed.recommendationsForAssignment
        : [],
      suggestedNextTopics: Array.isArray(parsed.suggestedNextTopics) ? parsed.suggestedNextTopics : [],
      recommendedDifficulty: parsed.recommendedDifficulty || "maintain",
      suggestedPracticeAreas: Array.isArray(parsed.suggestedPracticeAreas) ? parsed.suggestedPracticeAreas : [],
      sessionSummary: parsed.sessionSummary || "Analysis complete.",
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      progressIndicators: parsed.progressIndicators || {
        conceptualUnderstanding: 50,
        problemSolvingSkill: 50,
        retentionLikelihood: 50,
      },
      confidenceScore: parsed.confidenceScore || 50,
      dataQuality: parsed.dataQuality || "limited",
    }
  } catch (error) {
    console.error("[feedback-analysis-agent] Parse error:", error)
    return generateFallbackFeedback(input)
  }
}

function generateFallbackFeedback(input: FeedbackAnalysisInput): FeedbackAnalysisOutput {
  const avgScore =
    input.assignmentResults?.reduce((sum, a) => sum + a.percentCorrect, 0) / (input.assignmentResults?.length || 1) || 0
  const weakConcepts: string[] = []
  const strongConcepts: string[] = []
  input.assignmentResults?.forEach((a) => {
    if (a.percentCorrect < 60) weakConcepts.push(a.topic)
    else if (a.percentCorrect >= 80) strongConcepts.push(a.topic)
  })
  return {
    studentId: input.studentId,
    sessionId: input.sessionId,
    weakConcepts: Array.from(new Set(weakConcepts)),
    strongConcepts: Array.from(new Set(strongConcepts)),
    learningGaps: [],
    misconceptions: [],
    engagementLevel: avgScore >= 70 ? "high" : avgScore >= 50 ? "medium" : "low",
    engagementFactors: ["Based on performance scores"],
    recommendationsForTutor: [
      {
        priority: "medium",
        category: "teaching_strategy",
        recommendation: avgScore < 60 ? "Simplify concepts" : "Continue current approach",
        reasoning: `Average score: ${avgScore.toFixed(0)}%`,
      },
    ],
    recommendationsForAssignment: [
      {
        priority: "medium",
        category: "difficulty",
        recommendation: avgScore < 60 ? "Reduce difficulty" : avgScore >= 85 ? "Increase challenge" : "Maintain difficulty",
        reasoning: `Performance: ${avgScore.toFixed(0)}%`,
      },
    ],
    suggestedNextTopics: [],
    recommendedDifficulty: avgScore < 60 ? "easier" : avgScore >= 85 ? "harder" : "maintain",
    suggestedPracticeAreas: weakConcepts,
    sessionSummary: `Completed ${input.assignmentResults?.length ?? 0} assignments with ${avgScore.toFixed(0)}% average.`,
    keyTakeaways: strongConcepts.length > 0 ? strongConcepts : ["Continue practicing"],
    progressIndicators: {
      conceptualUnderstanding: Math.round(avgScore),
      problemSolvingSkill: Math.round(avgScore * 0.9),
      retentionLikelihood: Math.round(avgScore * 0.8),
    },
    confidenceScore: 40,
    dataQuality: input.assignmentResults && input.assignmentResults.length > 0 ? "limited" : "insufficient",
  }
}
