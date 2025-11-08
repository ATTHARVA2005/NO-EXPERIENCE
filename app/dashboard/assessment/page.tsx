"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"
import { CheckCircle, XCircle, Loader2, Brain, ArrowRight } from "lucide-react"

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  topic: string
}

interface AssessmentResult {
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  topic: string
}

export default function AssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({})
  const [showResults, setShowResults] = useState(false)
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([])
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<string>("")
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  const sessionId = searchParams.get("sessionId") || ""
  const topic = searchParams.get("topic") || ""
  const gradeLevel = searchParams.get("gradeLevel") || ""

  useEffect(() => {
    generateAssessment()
  }, [])

  const generateAssessment = async () => {
    try {
      setGenerating(true)

      // Get conversation history and lessons from URL params
      const conversationHistory = searchParams.get("conversationHistory")
      const allLessons = searchParams.get("allLessons")
      
      let parsedHistory = []
      let parsedLessons = []
      
      try {
        parsedHistory = conversationHistory ? JSON.parse(conversationHistory) : []
        parsedLessons = allLessons ? JSON.parse(allLessons) : []
      } catch (e) {
        console.error("Error parsing params:", e)
      }

      // Call assessment generation API
      const response = await fetch("/api/agents/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          topic,
          gradeLevel,
          conversationHistory: parsedHistory,
          lessons: parsedLessons,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate assessment")
      }

      const data = await response.json()

      if (data.success && data.questions) {
        setQuestions(data.questions)
      } else {
        throw new Error("Invalid assessment data")
      }
    } catch (error) {
      console.error("[assessment] Generation error:", error)
      toast({
        title: "Error",
        description: "Failed to generate assessment. Redirecting...",
        variant: "destructive",
      })
      setTimeout(() => router.push("/dashboard"), 2000)
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: answerIndex,
    })
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmitAssessment = async () => {
    // Calculate results
    const results: AssessmentResult[] = questions.map((q, index) => {
      const userAnswerIndex = selectedAnswers[index]
      const isCorrect = userAnswerIndex === q.correctAnswer
      
      return {
        question: q.question,
        userAnswer: q.options[userAnswerIndex] || "Not answered",
        correctAnswer: q.options[q.correctAnswer],
        isCorrect,
        topic: q.topic,
      }
    })

    const correctCount = results.filter(r => r.isCorrect).length
    const scorePercentage = Math.round((correctCount / questions.length) * 100)

    setAssessmentResults(results)
    setScore(scorePercentage)
    setShowResults(true)

    // Generate AI feedback
    await generateFeedback(results, scorePercentage)

    // Save to database
    await saveAssessmentResults(results, scorePercentage)
  }

  const generateFeedback = async (results: AssessmentResult[], scorePercentage: number) => {
    try {
      setLoadingFeedback(true)

      const response = await fetch("/api/agents/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          topic,
          gradeLevel,
          assessmentResults: results,
          score: scorePercentage,
          questions: questions.map(q => q.question),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate feedback")
      }

      const data = await response.json()

      if (data.success && data.feedback) {
        setFeedback(data.feedback)
      }
    } catch (error) {
      console.error("[feedback] Generation error:", error)
      setFeedback("Great work on completing the assessment! Keep learning and improving.")
    } finally {
      setLoadingFeedback(false)
    }
  }

  const saveAssessmentResults = async (results: AssessmentResult[], scorePercentage: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const correctCount = results.filter(r => r.isCorrect).length
      const incorrectCount = results.filter(r => !r.isCorrect).length

      // Save to existing assessments table
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          student_id: user.id,
          session_id: sessionId,
          topic: topic,
          type: "quiz",
          difficulty: "medium",
          questions: questions,
          student_answers: results.map(r => r.userAnswer),
          correct_answers: results.map(r => r.correctAnswer),
          total_questions: questions.length,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          skipped_count: 0,
          score: correctCount,
          percentage: scorePercentage,
          accuracy: scorePercentage,
          weak_concepts: results.filter(r => !r.isCorrect).map(r => r.topic),
          strong_concepts: results.filter(r => r.isCorrect).map(r => r.topic),
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (assessmentError) {
        console.error("[assessment] Error saving to assessments:", assessmentError)
        return
      }

      console.log("[assessment] Saved to assessments table:", assessmentData?.id)

      // Update session progress to 100%
      await supabase
        .from("learning_sessions")
        .update({
          progress: 100,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)

      console.log("[assessment] Results saved successfully")
    } catch (error) {
      console.error("[assessment] Error saving results:", error)
    }
  }

  const handleReturnToDashboard = () => {
    router.push("/dashboard")
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-orange-500 animate-pulse mx-auto mb-4" />
          <h2 className="text-2xl font-black text-black mb-2">Generating Your Assessment</h2>
          <p className="text-black/60 font-semibold">Creating personalized questions based on your learning...</p>
        </div>
      </div>
    )
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Results Header */}
          <div className="relative mb-8">
            <div className="absolute -right-3 -bottom-3 w-full h-full border-4 border-black" />
            <div className="relative bg-white border-4 border-black p-8 text-center">
              <h1 className="text-4xl font-black text-black mb-4">Assessment Complete!</h1>
              <div className="text-6xl font-black text-orange-500 mb-2">{score}%</div>
              <p className="text-xl font-bold text-black">
                {assessmentResults.filter(r => r.isCorrect).length} out of {questions.length} correct
              </p>
            </div>
          </div>

          {/* AI Feedback */}
          <div className="relative mb-8">
            <div className="absolute -right-3 -bottom-3 w-full h-full border-4 border-black" />
            <div className="relative bg-orange-500 border-4 border-black">
              <div className="bg-orange-500 border-b-4 border-black p-4">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Brain className="w-6 h-6" />
                  AI Feedback & Insights
                </h2>
              </div>
              <div className="bg-white p-6">
                {loadingFeedback ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    <p className="text-black font-semibold">Analyzing your performance...</p>
                  </div>
                ) : (
                  <p className="text-black font-semibold whitespace-pre-wrap">{feedback}</p>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="relative mb-8">
            <div className="absolute -right-3 -bottom-3 w-full h-full border-4 border-black" />
            <div className="relative bg-white border-4 border-black">
              <div className="bg-white border-b-4 border-black p-4">
                <h2 className="text-xl font-black text-black">Detailed Results</h2>
              </div>
              <div className="p-6 space-y-4">
                {assessmentResults.map((result, index) => (
                  <div
                    key={index}
                    className={`border-4 border-black p-4 ${
                      result.isCorrect ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      {result.isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-black text-black mb-2">Question {index + 1}</p>
                        <p className="text-black font-semibold mb-3">{result.question}</p>
                        
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-black text-black/60">YOUR ANSWER:</span>
                            <p className="text-black font-bold">{result.userAnswer}</p>
                          </div>
                          
                          {!result.isCorrect && (
                            <div>
                              <span className="text-xs font-black text-black/60">CORRECT ANSWER:</span>
                              <p className="text-green-700 font-bold">{result.correctAnswer}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleReturnToDashboard}
            className="w-full bg-orange-500 text-white font-black border-4 border-black px-8 py-4 hover:bg-orange-600 transition flex items-center justify-center gap-2"
          >
            RETURN TO DASHBOARD
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-black text-black">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-black text-black">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 border-3 border-black h-4">
            <div
              className="bg-orange-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="relative mb-8">
          <div className="absolute -right-3 -bottom-3 w-full h-full border-4 border-black" />
          <div className="relative bg-white border-4 border-black">
            <div className="bg-orange-500 border-b-4 border-black p-4">
              <span className="text-xs font-black text-white">TOPIC: {currentQuestion?.topic}</span>
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-black text-black mb-6">{currentQuestion?.question}</h2>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion?.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(index)}
                    className={`w-full text-left p-4 border-4 border-black font-bold transition ${
                      selectedAnswers[currentQuestionIndex] === index
                        ? "bg-orange-500 text-white"
                        : "bg-white text-black hover:bg-orange-50"
                    }`}
                  >
                    <span className="font-black mr-3">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex-1 bg-white text-black font-black border-4 border-black px-6 py-4 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            PREVIOUS
          </button>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmitAssessment}
              disabled={Object.keys(selectedAnswers).length < questions.length}
              className="flex-1 bg-orange-500 text-white font-black border-4 border-black px-6 py-4 hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SUBMIT ASSESSMENT
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 bg-orange-500 text-white font-black border-4 border-black px-6 py-4 hover:bg-orange-600 transition"
            >
              NEXT
            </button>
          )}
        </div>

        {/* Answer Status */}
        <div className="mt-6 flex justify-center gap-2">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 border-2 border-black ${
                selectedAnswers[index] !== undefined
                  ? "bg-orange-500"
                  : index === currentQuestionIndex
                  ? "bg-white"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
