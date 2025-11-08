// app/api/tutor/chat/route.ts
/**
 * Tutor Chat API
 * Handles real-time chat with the AI tutor
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateTutorResponse, type TutorContext } from "@/lib/agents/tutor-agent"
import { rankRagChunks, splitIntoChunks, type RagChunk } from "@/lib/rag-engine"

type ConversationMessage = {
  role?: string
  content?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const body = await request.json()
    const { message, conversationHistory = [], topic, gradeLevel, studentId } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const normalizedHistory = Array.isArray(conversationHistory)
      ? (conversationHistory as ConversationMessage[])
          .filter((entry) => typeof entry?.content === "string" && entry.content.trim().length > 0)
          .map((entry) => ({
            role: entry.role === "teacher" || entry.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: entry.content!.trim(),
          }))
      : []

    const { data: profile } = await supabase.from("student_profiles").select("*").eq("id", studentId).single()

    // Fetch latest feedback insights to inform tutor responses
    const { data: latestFeedback } = await supabase
      .from("feedback_records")
      .select("content")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let feedbackInsights = undefined
    if (latestFeedback && latestFeedback.content) {
      const content = latestFeedback.content as any
      const analysis = content.analysis || {}
      feedbackInsights = {
        strugglingConcepts: analysis.weakConcepts || [],
        masteredConcepts: analysis.strongConcepts || [],
        recommendedDifficulty: analysis.recommendedDifficulty,
        engagementLevel: analysis.engagementLevel,
        teachingStrategy:
          analysis.recommendationsForTutor && analysis.recommendationsForTutor.length > 0
            ? analysis.recommendationsForTutor[0].recommendation
            : undefined,
      }
    }

    const ragCandidates: RagChunk[] = []
    const retrievalDiagnostics: string[] = []

    try {
      const { data: sessionRow } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sessionRow) {
        const syllabusContent = typeof sessionRow.syllabus_content === "string" ? sessionRow.syllabus_content : null
        if (syllabusContent) {
          splitIntoChunks(syllabusContent)
            .slice(0, 5)
            .forEach((chunk, index) => {
              ragCandidates.push({
                id: `syllabus-${index}`,
                source: "Uploaded syllabus",
                content: chunk,
              })
            })
          retrievalDiagnostics.push("syllabus")
        }

        const curriculumPlan = sessionRow.curriculum_plan as any
        if (curriculumPlan && typeof curriculumPlan === "object") {
          if (Array.isArray(curriculumPlan.lessons)) {
            let lessonAdded = false
            curriculumPlan.lessons.slice(0, 5).forEach((lesson: any, index: number) => {
              const lessonSummary = [
                `Lesson ${index + 1}: ${lesson.title ?? "Untitled"}`,
                lesson.topic ? `Focus: ${lesson.topic}` : null,
                lesson.content ? `Plan: ${lesson.content}` : null,
              ]
                .filter(Boolean)
                .join("\n")

              if (lessonSummary) {
                ragCandidates.push({
                  id: `lesson-${index}`,
                  source: "Curriculum plan",
                  content: lessonSummary,
                })
                lessonAdded = true
              }
            })
            if (lessonAdded) {
              retrievalDiagnostics.push("lessons")
            }
          }

          if (Array.isArray(curriculumPlan.resources)) {
            let curriculumResourcesAdded = false
            curriculumPlan.resources.slice(0, 5).forEach((resource: any, index: number) => {
              const resourceSummary = [
                resource.title ? `Resource: ${resource.title}` : null,
                resource.url ? `Link: ${resource.url}` : null,
                resource.description ?? resource.summary ?? null,
              ]
                .filter(Boolean)
                .join("\n")

              if (resourceSummary) {
                ragCandidates.push({
                  id: `curriculum-resource-${index}`,
                  source: "Curriculum resources",
                  content: resourceSummary,
                })
                curriculumResourcesAdded = true
              }
            })
            if (curriculumResourcesAdded) {
              retrievalDiagnostics.push("curriculum-resources")
            }
          }
        }

        const sessionNotes = sessionRow.session_notes || sessionRow.session_summary
        if (typeof sessionNotes === "string" && sessionNotes.trim().length > 0) {
          splitIntoChunks(sessionNotes)
            .slice(0, 3)
            .forEach((chunk, index) => {
              ragCandidates.push({
                id: `session-note-${index}`,
                source: "Session notes",
                content: chunk,
              })
            })
          retrievalDiagnostics.push("session-notes")
        }
      }
    } catch (sessionError) {
      console.warn("[rag] Unable to load learning session context", sessionError)
    }

    try {
      const { data: resourceRows } = await supabase
        .from("resources")
        .select("title, url, summary, notes")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(8)

      if (Array.isArray(resourceRows)) {
        let added = false
        resourceRows.forEach((row, index) => {
          const resourceSummary = [
            row.title ? `Resource: ${row.title}` : null,
            row.summary ?? row.notes ?? null,
            row.url ? `Link: ${row.url}` : null,
          ]
            .filter(Boolean)
            .join("\n")

          if (resourceSummary) {
            ragCandidates.push({
              id: `resource-${index}`,
              source: "Recent resources",
              content: resourceSummary,
            })
            added = true
          }
        })
        if (added) {
          retrievalDiagnostics.push("resources-table")
        }
      }
    } catch (resourceError) {
      console.warn("[rag] Unable to load resources", resourceError)
    }

    try {
      const { data: pastSessions } = await supabase
        .from("tutor_sessions")
        .select("session_notes, topics_discussed")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(3)

      if (Array.isArray(pastSessions)) {
        let added = false
        pastSessions.forEach((row, index) => {
          const notes = [
            row.topics_discussed && Array.isArray(row.topics_discussed)
              ? `Topics: ${row.topics_discussed.join(", ")}`
              : null,
            row.session_notes ?? null,
          ]
            .filter(Boolean)
            .join("\n")

          if (notes) {
            ragCandidates.push({
              id: `past-session-${index}`,
              source: "Past session notes",
              content: notes,
            })
            added = true
          }
        })
        if (added) {
          retrievalDiagnostics.push("past-sessions")
        }
      }
    } catch (pastSessionError) {
      console.warn("[rag] Unable to load past tutor sessions", pastSessionError)
    }

    const { data: recentSessions } = await supabase
      .from("learning_sessions")
      .select("performance_data")
      .eq("student_id", studentId)
      .not("performance_data", "is", null)
      .order("created_at", { ascending: false })
      .limit(3)

    let recentPerformance = 0
    const previousWeaknesses: string[] = []

    if (recentSessions && recentSessions.length > 0) {
      const avgScore =
        recentSessions.reduce((sum, s) => sum + (s.performance_data?.avgScore || 0), 0) / recentSessions.length
      recentPerformance = Math.round(avgScore)

      recentSessions.forEach((s) => {
        if (s.performance_data?.strugglingAreas) {
          previousWeaknesses.push(...s.performance_data.strugglingAreas)
        }
      })
    }

    const context: TutorContext = {
      studentName: profile?.name || "Student",
      gradeLevel: gradeLevel || profile?.grade_level || 6,
      topic: topic,
      learningStyle: (profile?.learning_style as any) || "auditory",
      previousWeaknesses: Array.from(new Set(previousWeaknesses)),
      recentPerformance,
      feedbackInsights,
      sessionContext: {
        messageCount: normalizedHistory.length,
        topicsCovered: [topic].filter(Boolean),
        questionsAsked: normalizedHistory.filter((m) => m.content.includes("?")).length,
        conceptsExplained: [],
      },
    }

    const ragQuery = [message, ...normalizedHistory.slice(-3).map((entry) => entry.content)].join("\n")
    const rankedChunks = await rankRagChunks(ragQuery, ragCandidates, 4)
    const ragContext = rankedChunks
      .map((chunk) => {
        const relevance = typeof chunk.score === "number" ? ` (relevance ${(chunk.score * 100).toFixed(0)}%)` : ""
        return `${chunk.source}${relevance}:\n${chunk.content}`
      })
      .join("\n\n")

    const retrievalContext = ragContext.trim().length > 0 ? ragContext : undefined

    const response = await generateTutorResponse(message, context, normalizedHistory, retrievalContext)

    const readyForAssessment = normalizedHistory.length >= 3 && recentPerformance === 0

    const diagnosticSources = Array.from(new Set(retrievalDiagnostics))

    return NextResponse.json({
      success: true,
      response,
      readyForAssessment,
      topicsCovered: [topic || context.topic].filter(Boolean),
      context: {
        gradeLevel: context.gradeLevel,
        learningStyle: context.learningStyle,
        recentPerformance,
        strugglingAreas: previousWeaknesses.slice(0, 3),
      },
      retrieval: {
        candidates: ragCandidates.length,
        sourcesUsed: diagnosticSources,
        topChunks: rankedChunks.map((chunk) => ({
          id: chunk.id,
          source: chunk.source,
          score: chunk.score,
        })),
      },
    })
  } catch (error) {
    console.error("[v0] Tutor chat error:", error)
    return NextResponse.json({ error: "Failed to generate tutor response" }, { status: 500 })
  }
}
