"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { CheckCircle, XCircle } from "lucide-react"

interface QuizQuestion {
  question: string
  options: string[]
  correct: string
  explanation: string
}

interface QuizGameProps {
  question: QuizQuestion
  questionNumber: number
  total: number
  onCorrect: () => void
  onWrong: () => void
}

export function QuizGame({ question, questionNumber, total, onCorrect, onWrong }: QuizGameProps) {
  const [selected, setSelected] = useState<string>("")
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handleSubmit = () => {
    const correct = selected === question.correct
    setIsCorrect(correct)
    setSubmitted(true)

    setTimeout(() => {
      if (correct) {
        onCorrect()
      } else {
        onWrong()
      }
    }, 2000)
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Question {questionNumber} of {total}
          </p>
          <h3 className="text-xl font-semibold">{question.question}</h3>
        </div>

        <RadioGroup value={selected} onValueChange={setSelected} disabled={submitted}>
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${idx}`} />
                <Label
                  htmlFor={`option-${idx}`}
                  className="flex-1 p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        {submitted && (
          <div
            className={`p-4 rounded-lg flex gap-3 ${isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}
          >
            {isCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold mb-1">{isCorrect ? "Correct!" : "Not quite right"}</p>
              <p className="text-sm">{question.explanation}</p>
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={!selected || submitted} className="w-full" size="lg">
          {submitted ? "Loading..." : "Submit Answer"}
        </Button>
      </CardContent>
    </Card>
  )
}
