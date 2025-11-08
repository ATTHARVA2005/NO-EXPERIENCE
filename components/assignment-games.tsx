// components/assignment-games.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Assignment, MiniGameType, MiniGame } from "@/lib/types/assignment"

interface StudentAnswer {
  gameId: string
  answer: string | number
  timeSpent: number
  attemptsCount: number
}

interface AssignmentGameProps {
  assignment: Assignment
  onComplete: (answers: Record<string, any>) => void
}

export function AssignmentGame({ assignment, onComplete }: AssignmentGameProps) {
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [answers, setAnswers] = useState<StudentAnswer[]>([])
  const [currentAnswer, setCurrentAnswer] = useState("")

  const currentGame = assignment.miniGames[currentGameIndex]
  const progress = ((currentGameIndex + 1) / assignment.miniGames.length) * 100

  const handleAnswer = (answer: string) => {
    const studentAnswer: StudentAnswer = {
      gameId: currentGame.id,
      answer,
      timeSpent: 30, // You can track actual time
      attemptsCount: 1,
    }

    const newAnswers = [...answers, studentAnswer]
    setAnswers(newAnswers)
    setCurrentAnswer("")

    if (currentGameIndex < assignment.miniGames.length - 1) {
      setCurrentGameIndex(currentGameIndex + 1)
    } else {
      // Convert answers to the format expected by the API
      const answerMap = newAnswers.reduce((acc, ans) => {
        acc[ans.gameId] = ans.answer
        return acc
      }, {} as Record<string, any>)
      onComplete(answerMap)
    }
  }

  const GameComponent = getGameComponent(currentGame.type)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{assignment.title}</h2>
          <p className="text-muted-foreground">{assignment.description}</p>
        </div>
        <Badge variant="secondary">
          {currentGameIndex + 1} / {assignment.miniGames.length}
        </Badge>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />

      {/* Game */}
      <GameComponent
        game={currentGame}
        onAnswer={handleAnswer}
        currentAnswer={currentAnswer}
        setCurrentAnswer={setCurrentAnswer}
      />
    </div>
  )
}

// Balloon Pop Math
function BalloonPopGame({ game, onAnswer, currentAnswer, setCurrentAnswer }: GameComponentProps) {
  const balloons = game.gameData.balloons || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{game.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Balloons */}
        <div className="grid grid-cols-5 gap-4">
          {balloons.map((balloon: any, idx: number) => (
            <div
              key={idx}
              className="relative flex items-center justify-center h-20"
            >
              <div
                className={cn(
                  "w-16 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg transition-transform hover:scale-110"
                )}
              >
                {balloon.value}
              </div>
              <div className="absolute -bottom-2 w-0.5 h-8 bg-gray-400" />
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-lg font-medium">{game.instructions}</p>
        </div>

        {/* Answer Input */}
        <div className="flex gap-2">
          <Input
            type="number"
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Your answer..."
            className="text-lg text-center"
            onKeyPress={(e) => e.key === "Enter" && onAnswer(currentAnswer)}
          />
          <Button onClick={() => onAnswer(currentAnswer)} size="lg">
            Pop! 🎈
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Cat Counting Game
function CatCountingGame({ game, onAnswer, currentAnswer, setCurrentAnswer }: GameComponentProps) {
  const rounds = game.gameData.rounds || []
  const currentRound = rounds[0] || { catsShown: 5 }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{game.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Cats */}
        <div className="flex justify-center items-center gap-2 flex-wrap">
          {Array.from({ length: currentRound.catsShown }).map((_, i) => (
            <div key={i} className="text-4xl">
              🐱
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-lg font-medium">{game.instructions}</p>
        </div>

        {/* Answer Input */}
        <div className="flex gap-2">
          <Input
            type="number"
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="How many cats?"
            className="text-lg text-center"
            onKeyPress={(e) => e.key === "Enter" && onAnswer(currentAnswer)}
          />
          <Button onClick={() => onAnswer(currentAnswer)} size="lg">
            Count! 🐱
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Number Story Game
function NumberStoryGame({ game, onAnswer, currentAnswer, setCurrentAnswer }: GameComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{game.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Story */}
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-6">
          <p className="text-lg leading-relaxed">{game.gameData.story || game.instructions}</p>
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-lg font-medium">{game.instructions}</p>
        </div>

        {/* Answer Input */}
        <div className="flex gap-2">
          <Input
            type="number"
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Your answer..."
            className="text-lg text-center"
            onKeyPress={(e) => e.key === "Enter" && onAnswer(currentAnswer)}
          />
          <Button onClick={() => onAnswer(currentAnswer)} size="lg">
            Submit 📖
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Math Race Game
function MathRaceGame({ game, onAnswer }: GameComponentProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const equations = game.gameData.equations || []
  const currentEq = equations[0] || { problem: "2 + 2", answer: 4 }
  const options = [currentEq.answer, currentEq.answer + 1, currentEq.answer - 1, currentEq.answer + 2]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Math Race! 🏁</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Problem */}
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">{currentEq.problem}</div>
          <p className="text-lg">{game.instructions}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          {options.map((option: any, idx: number) => (
            <Button
              key={idx}
              variant={selectedAnswer === option.toString() ? "default" : "outline"}
              className="h-20 text-2xl"
              onClick={() => {
                setSelectedAnswer(option.toString())
                onAnswer(option.toString())
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Treasure Hunt Game
function TreasureHuntGame({ game, onAnswer, currentAnswer, setCurrentAnswer }: GameComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Treasure Hunt! 🏴‍☠️</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Map/Scenario */}
        <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-6">
          <p className="text-lg">{game.instructions}</p>
        </div>

        {/* Answer Input */}
        <div className="flex gap-2">
          <Input
            type="number"
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Find the treasure..."
            className="text-lg text-center"
            onKeyPress={(e) => e.key === "Enter" && onAnswer(currentAnswer)}
          />
          <Button onClick={() => onAnswer(currentAnswer)} size="lg">
            Dig! ⛏️
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Quiz Game
function QuizGame({ game, onAnswer }: GameComponentProps) {
  const questions = game.gameData.questions || []
  const currentQ = questions[0] || { question: "What is 2 + 2?", options: ["3", "4", "5", "6"] }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Quick Quiz! 📝</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question */}
        <div className="text-center">
          <p className="text-xl font-medium mb-6">{currentQ.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options?.map((option: string, idx: number) => (
            <Button
              key={idx}
              variant="outline"
              className="w-full justify-start text-left h-auto py-4 px-6 hover:bg-primary hover:text-primary-foreground"
              onClick={() => onAnswer(option)}
            >
              <span className="font-bold mr-3">
                {String.fromCharCode(65 + idx)}.
              </span>
              <span className="text-base">{option}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to get the right component for each game type
function getGameComponent(gameType: MiniGameType) {
  switch (gameType) {
    case "balloon-pop-math":
      return BalloonPopGame
    case "cat-counting":
      return CatCountingGame
    case "number-story":
      return NumberStoryGame
    case "math-race":
      return MathRaceGame
    case "treasure-hunt-math":
      return TreasureHuntGame
    case "quiz":
      return QuizGame
    default:
      return QuizGame
  }
}

interface GameComponentProps {
  game: MiniGame
  onAnswer: (answer: string) => void
  currentAnswer: string
  setCurrentAnswer: (answer: string) => void
}
