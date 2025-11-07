"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Flame, Clock, Trophy, Lightbulb } from "lucide-react"
import type { Assignment } from "@/lib/agents/assignment-agent"

interface GameContainerProps {
  assignment: Assignment
  onComplete: (score: number, correct: number, total: number, timeSpent: number) => void
  children: React.ReactNode
}

export function GameContainer({ assignment, onComplete, children }: GameContainerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [startTime] = useState(Date.now())
  const [hintUsed, setHintUsed] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Calculate progress
  const progress = ((currentQuestion + 1) / (assignment.content.quiz?.length || 1)) * 100

  // Calculate time elapsed
  const [timeElapsed, setTimeElapsed] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleCorrectAnswer = () => {
    setScore((prev) => prev + 1)
    setStreak((prev) => prev + 1)

    if (currentQuestion < (assignment.content.quiz?.length || 0) - 1) {
      setCurrentQuestion((prev) => prev + 1)
      setHintUsed(false)
    } else {
      setCompleted(true)
      setShowResults(true)
      const totalQuestions = assignment.content.quiz?.length || 1
      onComplete(score + 1, score + 1, totalQuestions, timeElapsed)
    }
  }

  const handleWrongAnswer = () => {
    setStreak(0)

    if (currentQuestion < (assignment.content.quiz?.length || 0) - 1) {
      setCurrentQuestion((prev) => prev + 1)
      setHintUsed(false)
    } else {
      setCompleted(true)
      setShowResults(true)
      const totalQuestions = assignment.content.quiz?.length || 1
      onComplete(score, score, totalQuestions, timeElapsed)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/5 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{assignment.title}</CardTitle>
                <CardDescription>{assignment.description}</CardDescription>
              </div>
              <Badge className="bg-primary/20 text-primary">{assignment.gameType}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-2">
              <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg">
                <Trophy className="w-4 h-4 text-accent" />
                <div>
                  <div className="text-xs text-muted-foreground">Points</div>
                  <div className="font-bold">{score * 10}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-lg">
                <Flame className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Streak</div>
                  <div className="font-bold">{streak}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Time</div>
                  <div className="font-bold text-sm">{formatTime(timeElapsed)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
                <div className="text-xs text-muted-foreground">Progress</div>
                <div className="font-bold">
                  {currentQuestion + 1}/{assignment.content.quiz?.length}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Game Content */}
        {!showResults && (
          <>
            {children}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={hintUsed}
                onClick={() => setHintUsed(true)}
                className="gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                {hintUsed ? "Hint Used" : "Get Hint"}
              </Button>
            </div>
          </>
        )}

        {/* Results Screen */}
        {showResults && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-center">🎉 Assignment Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {Math.round((score / (assignment.content.quiz?.length || 1)) * 100)}%
                </div>
                <div className="text-muted-foreground">
                  {score} correct out of {assignment.content.quiz?.length}
                </div>
              </div>
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Another Assignment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
