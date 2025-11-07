// app/api/assessment/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * Validate student answers and calculate score
 * POST /api/assessment/validate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentId, studentId, sessionId, answers, questions } = body;

    if (!answers || !questions) {
      return NextResponse.json(
        { error: "Answers and questions are required" },
        { status: 400 }
      );
    }

    console.log("[assessment-validate] Validating answers for:", assessmentId);

    // Calculate score
    let correctCount = 0;
    const results = questions.map((question: any, index: number) => {
      const studentAnswer = answers[question.id] || answers[index];
      const isCorrect = studentAnswer === question.correctAnswer;
      
      if (isCorrect) {
        correctCount++;
      }

      return {
        questionId: question.id,
        question: question.question,
        studentAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 60; // 60% passing threshold

    console.log(`[assessment-validate] Score: ${score}% (${correctCount}/${questions.length})`);

    // Update assessment in database
    if (assessmentId && studentId) {
      const supabase = await getSupabaseServer();
      
      const { error: updateError } = await supabase
        .from("assessments")
        .update({
          score,
          status: passed ? "completed" : "failed",
          student_answers: answers,
          results,
          completed_at: new Date().toISOString(),
        })
        .eq("id", assessmentId)
        .eq("student_id", studentId);

      if (updateError) {
        console.error("[assessment-validate] Database update error:", updateError);
      }

      // Update session status if passed
      if (passed && sessionId) {
        await supabase
          .from("learning_sessions")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId)
          .eq("student_id", studentId);
      }
    }

    return NextResponse.json({
      success: true,
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
      results,
      message: passed 
        ? "🎉 Congratulations! You passed the assessment!"
        : "Keep learning! Review the material and try again.",
    });
  } catch (error: any) {
    console.error("[assessment-validate] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate assessment" },
      { status: 500 }
    );
  }
}
