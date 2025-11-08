"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface Question {
  id: string
  text: string
  type: "multiple-choice" | "text" | "numeric"
  options?: string[]
  correctAnswer: string
}

export function AssessmentQuestion({
  question,
  onSubmit,
  isSubmitting,
}: {
  question: Question
  onSubmit: (answer: string) => void
  isSubmitting: boolean
}) {
  const [answer, setAnswer] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (answer.trim()) {
      onSubmit(answer)
      setAnswer("")
    }
  }

  if (question.type === "multiple-choice") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3">
          {question.options?.map((option) => (
            <button
              key={option}
              onClick={() => onSubmit(option)}
              disabled={isSubmitting}
              className="p-4 text-left border border-border rounded-lg hover:bg-muted hover:border-primary transition-colors disabled:opacity-50"
            >
              <span className="font-medium">{option}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Enter your answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={isSubmitting}
        type={question.type === "numeric" ? "number" : "text"}
      />
      <Button type="submit" disabled={isSubmitting || !answer.trim()} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Evaluating...
          </>
        ) : (
          "Submit Answer"
        )}
      </Button>
    </form>
  )
}
