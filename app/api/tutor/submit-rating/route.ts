import { storeSubTopicRating } from "@/lib/redis-client"
import { createClient } from "@supabase/supabase-js"

/**
 * Submit rating for a completed sub-topic
 * Stores in Redis and optionally triggers feedback analysis
 */
export async function POST(request: Request) {
  try {
    const { sessionId, subTopic, rating, feedback, studentId } = await request.json()

    if (!sessionId || !subTopic || rating === undefined) {
      return Response.json(
        { success: false, error: "sessionId, subTopic, and rating required" },
        { status: 400 }
      )
    }

    // Validate rating is 1-5
    if (rating < 1 || rating > 5) {
      return Response.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      )
    }

    // Store rating in Redis
    await storeSubTopicRating(sessionId, subTopic, rating, feedback)

    // Also store in Supabase for long-term analytics
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: dbError } = await supabase.from("topic_ratings").insert({
      session_id: sessionId,
      student_id: studentId,
      sub_topic: subTopic,
      rating,
      feedback_text: feedback || null,
    })

    if (dbError) {
      console.error("[submit-rating] Failed to store in Supabase:", dbError)
      // Continue even if DB storage fails - Redis has the data
    }

    // If rating is low (1-2), trigger immediate feedback to adjust teaching
    let needsReview = false
    if (rating <= 2) {
      needsReview = true
      
      // Optionally notify Feedback Agent about struggling area
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/feedback/comprehensive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            sessionId,
            strugglingTopic: subTopic,
            immediateAction: true,
          }),
        })
      } catch (feedbackErr) {
        console.warn("[submit-rating] Failed to notify feedback agent:", feedbackErr)
      }
    }

    return Response.json({
      success: true,
      rating,
      needsReview,
      message: needsReview 
        ? "Thanks for the feedback! Let's review this topic together." 
        : "Great! Let's continue to the next topic.",
    })
  } catch (error) {
    console.error("[submit-rating] Error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit rating",
      },
      { status: 500 }
    )
  }
}
