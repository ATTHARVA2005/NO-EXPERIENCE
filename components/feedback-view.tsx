"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X } from "lucide-react"

interface Question {
  id: string
  text: string
  correctAnswer: string
}

interface QuestionResult {
  questionId: string
  studentAnswer: string
  correct: boolean
  feedback: string
  reasoning: string
  timeMs: number
}

export function FeedbackView({
  results,
  questions,
}: {
  results: QuestionResult[]
  questions: Question[]
}) {
  const router = useRouter()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const correctCount = results.filter((r) => r.correct).length
  const accuracy = Math.round((correctCount / results.length) * 100)
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.timeMs, 0) / results.length / 1000)

  return (
    <div className="flex-1 space-y-8 p-8 max-w-4xl mx-auto">
      {/* Summary */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assessment Complete!</h1>
        <p className="text-muted-foreground mt-2">Here's how you performed</p>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{accuracy}%</div>
            <p className="text-sm text-muted-foreground mt-2">
              {correctCount} of {results.length} correct
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{avgTime}s</div>
            <p className="text-sm text-muted-foreground mt-2">average per question</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${accuracy >= 70 ? "text-green-500" : "text-yellow-500"}`}>
              {accuracy >= 70 ? "Great!" : "Keep Going"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {accuracy >= 70 ? "Excellent performance" : "Room for improvement"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Feedback */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Question-by-Question Feedback</h2>
        {results.map((result, idx) => {
          const question = questions.find((q) => q.id === result.questionId)
          const isExpanded = expandedIndex === idx

          return (
            <Card key={idx}>
              <button onClick={() => setExpandedIndex(isExpanded ? null : idx)} className="w-full text-left">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 flex items-start gap-3">
                      <div className={`mt-1 p-2 rounded-lg ${result.correct ? "bg-green-500/10" : "bg-red-500/10"}`}>
                        {result.correct ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{question?.text}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your answer: <span className="font-medium text-foreground">{result.studentAnswer}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded">{result.timeMs / 1000}s</span>
                  </div>
                </CardHeader>
              </button>

              {isExpanded && (
                <CardContent className="pt-0 border-t border-border">
                  <div className="space-y-3 mt-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Feedback</p>
                      <p className="mt-1">{result.feedback}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Explanation</p>
                      <p className="mt-1">{result.reasoning}</p>
                    </div>
                    {!result.correct && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Correct Answer</p>
                        <p className="mt-1 font-medium text-green-500">{question?.correctAnswer}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={() => router.push("/dashboard")} variant="outline" className="flex-1">
          Back to Dashboard
        </Button>
        <Button onClick={() => router.push("/assessment")} className="flex-1">
          Retake Assessment
        </Button>
      </div>
    </div>
  )
}
