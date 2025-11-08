"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface QuizQuestion {
  id: string
  question: string
  type: "multiple-choice" | "true-false" | "short-answer" | "fill-blank"
  options?: string[]
  correctAnswer: string
  explanation: string
  difficulty: "easy" | "medium" | "hard"
  concept: string
  timeEstimate: number
}

interface AssessmentPopupProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  sessionId: string
  topic: string
  concepts?: string[]
  onComplete?: (results: any) => void
}

export function AssessmentPopup({
  isOpen,
  onClose,
  studentId,
  sessionId,
  topic,
  concepts = [],
  onComplete,
}: AssessmentPopupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [quizId, setQuizId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, string>>(new Map())
  const [questionStartTimes, setQuestionStartTimes] = useState<Map<string, number>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState<any>(null)

  // Generate quiz when modal opens
  useEffect(() => {
    if (isOpen && !quizId) {
      generateQuiz()
    }
  }, [isOpen])

  // Start timer for current question
  useEffect(() => {
    if (questions.length > 0 && !questionStartTimes.has(questions[currentQuestionIndex].id)) {
      setQuestionStartTimes(prev => new Map(prev).set(questions[currentQuestionIndex].id, Date.now()))
    }
  }, [currentQuestionIndex, questions])

  const generateQuiz = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/assessment/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          sessionId,
          topic,
          concepts,
          questionCount: 5,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate quiz")
      }

      const data = await response.json()
      if (data.success && data.quiz) {
        setQuizId(data.quiz.quizId)
        setQuestions(data.quiz.questions)
      }
    } catch (error) {
      console.error("[assessment-popup] Failed to generate quiz:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (value: string) => {
    const newAnswers = new Map(answers)
    newAnswers.set(questions[currentQuestionIndex].id, value)
    setAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Calculate time spent per question
      const answersWithTime = Array.from(answers.entries()).map(([questionId, studentAnswer]) => {
        const startTime = questionStartTimes.get(questionId) || Date.now()
        const timeSpent = Math.floor((Date.now() - startTime) / 1000)
        return {
          questionId,
          studentAnswer,
          timeSpent,
        }
      })

      const response = await fetch("/api/assessment/submit-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          sessionId,
          quizId,
          answers: answersWithTime,
          topic,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit results")
      }

      const data = await response.json()
      if (data.success && data.results) {
        setResults(data.results)
        if (onComplete) {
          onComplete(data.results)
        }
      }
    } catch (error) {
      console.error("[assessment-popup] Failed to submit results:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-purple-500/30 text-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-purple-500/20">
          <div>
            <CardTitle className="text-xl">Topic Assessment</CardTitle>
            <p className="text-sm text-gray-400 mt-1">{topic}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
              <p className="text-gray-400">Generating adaptive quiz...</p>
            </div>
          ) : results ? (
            // Results view
            <div className="space-y-6">
              <div className="text-center">
                <div className={`text-6xl font-bold mb-2 ${results.score >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {results.score.toFixed(0)}%
                </div>
                <p className="text-lg text-gray-300">
                  {results.correctCount} out of {results.totalQuestions} correct
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/60 rounded-lg p-4 border border-green-500/20">
                  <p className="text-sm text-gray-400">Strong Concepts</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {results.strongConcepts.slice(0, 3).map((concept: string, idx: number) => (
                      <Badge key={idx} variant="default" className="bg-green-600">
                        {concept}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/60 rounded-lg p-4 border border-red-500/20">
                  <p className="text-sm text-gray-400">Areas to Review</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {results.weakConcepts.slice(0, 3).map((concept: string, idx: number) => (
                      <Badge key={idx} variant="destructive" className="bg-red-600">
                        {concept}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {results.analysis && (
                <div className="bg-slate-800/60 rounded-lg p-4 border border-purple-500/20">
                  <p className="text-sm text-gray-400 mb-2">AI Analysis</p>
                  <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
                    {results.analysis}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  className="flex-1 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Continue Learning
                </Button>
              </div>
            </div>
          ) : currentQuestion ? (
            // Quiz view
            <div className="space-y-6">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                  <Badge variant="outline" className="border-purple-500/40">
                    {currentQuestion.difficulty}
                  </Badge>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-linear-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="bg-slate-800/60 rounded-lg p-6 border border-purple-500/20">
                <p className="text-lg font-medium mb-4">{currentQuestion.question}</p>

                {currentQuestion.type === "multiple-choice" && currentQuestion.options && (
                  <RadioGroup
                    value={answers.get(currentQuestion.id) || ""}
                    onValueChange={handleAnswerChange}
                  >
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, idx) => (
                        <div
                          key={idx}
                          className="flex items-center space-x-3 p-3 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 transition"
                        >
                          <RadioGroupItem value={option} id={`option-${idx}`} />
                          <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {currentQuestion.type === "true-false" && (
                  <RadioGroup
                    value={answers.get(currentQuestion.id) || ""}
                    onValueChange={handleAnswerChange}
                  >
                    <div className="space-y-3">
                      {["True", "False"].map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-3 p-3 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 transition"
                        >
                          <RadioGroupItem value={option} id={`tf-${option}`} />
                          <Label htmlFor={`tf-${option}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {(currentQuestion.type === "short-answer" || currentQuestion.type === "fill-blank") && (
                  <Input
                    value={answers.get(currentQuestion.id) || ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Type your answer here..."
                    className="bg-slate-700/40 border-purple-500/30 text-white"
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="border-purple-500/40 text-white"
                >
                  Previous
                </Button>

                <div className="flex gap-1">
                  {questions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentQuestionIndex
                          ? "bg-purple-500"
                          : answers.has(questions[idx].id)
                          ? "bg-green-500"
                          : "bg-slate-600"
                      }`}
                    />
                  ))}
                </div>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || answers.size < questions.length}
                    className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Quiz"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No questions available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
