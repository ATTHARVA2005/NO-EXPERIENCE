import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateDetailedFeedback } from "@/lib/agents/feedback-agent"
import { generateText } from "ai"
import { getSessionRatings } from "@/lib/redis-client"

const MODEL_ID = "google/gemini-2.0-flash-exp"

/**
 * Enhanced Feedback Agent
 * Combines session data, assessment results, and ratings for trend analysis
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const body = await request.json()
    const { 
      studentId, 
      sessionId,
      question, 
      studentAnswer, 
      correctAnswer, 
      topic, 
      gradeLevel, 
      learningStyle,
      assessmentResults, // From assessment agent
      strugglingTopic, // For immediate intervention
      immediateAction = false,
    } = body

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    // Legacy single-question feedback (backward compatibility)
    if (question && !sessionId) {
      const feedback = await generateDetailedFeedback(question, studentAnswer, correctAnswer, {
        studentGradeLevel: gradeLevel || 6,
        topic: topic || "General",
        previousAttempts: 1,
        learningStyle: learningStyle || "mixed",
      })

      const { error: saveError } = await supabase.from("feedback_records").insert([
        {
          student_id: studentId,
          feedback_type: "question",
          content: feedback,
          student_misconceptions: feedback.studentMisconception ? [feedback.studentMisconception] : [],
          learning_gaps: feedback.learningGap ? [feedback.learningGap] : [],
          confidence_score: feedback.confidence,
        },
      ])

      if (saveError) {
        console.error("[feedback] Error saving feedback:", saveError)
      }

      return NextResponse.json({
        success: true,
        feedback,
      })
    }

    // Enhanced comprehensive feedback with trend analysis
    
    // 1. Get session data (tutor interactions, time spent)
    const { data: session } = await supabase
      .from("learning_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    // 2. Get ratings from Redis
    const ratings = sessionId ? await getSessionRatings(sessionId) : []

    // 3. Get recent assessment results
    const { data: recentAssessments } = await supabase
      .from("assessment_results")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5)

    // 4. Get curriculum progress
    const { data: curriculumAnalytics } = await supabase
      .from("curriculum_analytics")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle()

    // 5. Get student profile
    const { data: student } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", studentId)
      .single()

    // Build comprehensive context for Gemini analysis
    const analysisPrompt = `You are an expert educational analyst providing personalized feedback and recommendations.

STUDENT PROFILE:
- Grade Level: ${gradeLevel || student?.grade_level || "Unknown"}
- Learning Style: ${learningStyle || student?.learning_preferences || "Mixed"}

SESSION DATA:
- Topic: ${session?.topic || topic || "General"}
- Duration: ${session?.duration_minutes || "Unknown"} minutes
- Tutor Messages: ${(session?.tutor_messages as any[])?.length || 0} interactions
- Session State: ${session?.current_state || "Unknown"}

RATINGS (1-5 scale):
${ratings.length > 0 ? ratings.map((r: any) => `- ${r.subTopic}: ${r.rating} stars ${r.feedback ? `(${r.feedback})` : ""}`).join("\n") : "- No ratings yet"}

RECENT ASSESSMENT PERFORMANCE:
${recentAssessments && recentAssessments.length > 0 
  ? recentAssessments.map((a: any) => `- Score: ${a.score}%, Weak: ${(a.weak_concepts || []).join(", ")}, Strong: ${(a.strong_concepts || []).join(", ")}`).join("\n")
  : "- No assessments yet"}

${assessmentResults ? `
LATEST ASSESSMENT:
- Score: ${assessmentResults.score}%
- Weak Concepts: ${assessmentResults.weakConcepts?.join(", ") || "None"}
- Strong Concepts: ${assessmentResults.strongConcepts?.join(", ") || "None"}
- AI Analysis: ${assessmentResults.analysis}
` : ""}

${strugglingTopic ? `
⚠️ IMMEDIATE INTERVENTION NEEDED:
Student rated "${strugglingTopic}" very low (1-2 stars). Requires review.
` : ""}

CURRICULUM ANALYTICS:
${curriculumAnalytics ? `
- Engagement Score: ${curriculumAnalytics.engagement_score || "N/A"}
- Completion Rate: ${curriculumAnalytics.completion_rate || "N/A"}%
- Difficulty Level: ${curriculumAnalytics.difficulty_level || "N/A"}
` : "- No analytics yet"}

ANALYSIS REQUIREMENTS:
Provide a comprehensive analysis with:

1. **LEARNING TRENDS** (3-4 insights):
   - Patterns across sessions and assessments
   - Progress trajectory (improving/stable/struggling)
   - Time management and engagement patterns
   - Concept mastery evolution

2. **WEAK AREAS** (Top 3 with specifics):
   - Identify struggling concepts from ratings + assessments
   - Root cause analysis (misconception vs. knowledge gap vs. practice needed)
   - Severity level (high/medium/low priority)

3. **STRENGTHS** (Top 3):
   - Consistently high-performing areas
   - Natural aptitudes or interests
   - Concepts to leverage for harder topics

4. **PERSONALIZED RECOMMENDATIONS**:
   For Tutor Agent:
   - Teaching approach adjustments (Socratic, visual, practice-heavy, etc.)
   - Pacing recommendations (slow down, maintain, accelerate)
   - Concept connection strategies
   
   For Student Dashboard:
   - 3 specific action items (practice problems, review topics, etc.)
   - Resources to focus on
   - Next learning goals

5. **CURRICULUM PROGRESSION**:
   - Ready to advance? (yes/no/partial)
   - Topics requiring review before progression
   - Suggested next chapter/topic

6. **ENGAGEMENT INSIGHTS**:
   - Motivation level assessment
   - Engagement strategies that worked
   - Warning signs if any

Format as clear, actionable insights. Be specific with concept names and numbers.`

    const { text: analysis } = await generateText({
      model: MODEL_ID,
      prompt: analysisPrompt,
      temperature: 0.6,
    })

    // Extract actionable items from analysis for structured storage
    const extractActionsPrompt = `From this feedback analysis, extract:
1. Top 3 weak concepts (just concept names)
2. Top 3 strong concepts (just concept names)
3. Engagement level (1-5 scale)
4. Recommended teaching approach (one phrase)
5. Ready to progress? (yes/no/review)

ANALYSIS:
${analysis}

Return as JSON:
{
  "weakConcepts": ["concept1", "concept2", "concept3"],
  "strongConcepts": ["concept1", "concept2", "concept3"],
  "engagementLevel": 3,
  "recommendedApproach": "approach description",
  "progressionReady": "yes/no/review",
  "recommendationsForTutor": [{"type": "pacing", "recommendation": "..."}, ...],
  "recommendationsForStudent": [{"action": "...", "priority": "high/medium/low"}]
}`

    let structuredData: any = {
      weakConcepts: [],
      strongConcepts: [],
      engagementLevel: 3,
      recommendedApproach: "Standard pacing",
      progressionReady: "yes",
      recommendationsForTutor: [],
      recommendationsForStudent: [],
    }

    try {
      const { text: jsonText } = await generateText({
        model: MODEL_ID,
        prompt: extractActionsPrompt,
        temperature: 0.3,
      })

      // Try to parse JSON from the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.warn("[feedback] Failed to parse structured data:", parseError)
    }

    // Save comprehensive feedback
    const { data: feedbackRecord, error: saveError } = await supabase
      .from("feedback_records")
      .insert({
        student_id: studentId,
        session_id: sessionId,
        feedback_type: "comprehensive",
        content: {
          analysis,
          ...structuredData,
          assessmentResults,
          ratings,
          timestamp: new Date().toISOString(),
        },
        student_misconceptions: structuredData.weakConcepts || [],
        learning_gaps: structuredData.weakConcepts || [],
        confidence_score: structuredData.engagementLevel || 3,
      })
      .select()
      .single()

    if (saveError) {
      console.error("[feedback] Error saving comprehensive feedback:", saveError)
    }

    // Update student dashboard with recommendations
    if (feedbackRecord) {
      await supabase
        .from("student_profiles")
        .update({
          last_feedback_id: feedbackRecord.id,
          learning_insights: {
            weakAreas: structuredData.weakConcepts,
            strongAreas: structuredData.strongConcepts,
            engagementLevel: structuredData.engagementLevel,
            lastUpdated: new Date().toISOString(),
          },
        })
        .eq("id", studentId)
    }

    // If immediate action needed, send to tutor agent
    if (immediateAction && strugglingTopic) {
      // Store intervention flag in Redis or send notification
      console.log(`[feedback] Immediate intervention needed for ${studentId} on ${strugglingTopic}`)
    }

    return NextResponse.json({
      success: true,
      analysis,
      recommendations: {
        forTutor: structuredData.recommendationsForTutor,
        forStudent: structuredData.recommendationsForStudent,
      },
      insights: {
        weakConcepts: structuredData.weakConcepts,
        strongConcepts: structuredData.strongConcepts,
        engagementLevel: structuredData.engagementLevel,
        progressionReady: structuredData.progressionReady,
      },
      feedbackId: feedbackRecord?.id,
    })
  } catch (error) {
    console.error("[feedback] Comprehensive feedback error:", error)
    return NextResponse.json({ error: "Failed to generate comprehensive feedback" }, { status: 500 })
  }
}
