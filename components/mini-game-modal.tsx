"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Trophy } from "lucide-react"

interface MiniGameModalProps {
  isOpen: boolean
  onClose: () => void
  assignment: any // Your AssignmentItem type
}

export function MiniGameModal({ isOpen, onClose, assignment }: MiniGameModalProps) {
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  
  const miniGames = assignment?.miniGames || []
  if (miniGames.length === 0) return null
  
  const currentGame = miniGames[currentGameIndex]
  const questions = currentGame?.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  
  const handleSubmit = () => {
    if (!selectedAnswer || !currentQuestion) return
    
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    if (isCorrect) {
      setScore(score + currentGame.points / questions.length)
    }
    setShowResult(true)
  }
  
  const handleNext = () => {
    setShowResult(false)
    setSelectedAnswer(null)
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else if (currentGameIndex < miniGames.length - 1) {
      setCurrentGameIndex(currentGameIndex + 1)
      setCurrentQuestionIndex(0)
    } else {
      // Assignment complete
      alert(`Assignment complete! Score: ${score}/${assignment.totalPoints}`)
      onClose()
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{currentGame?.title || "Mini Game"}</span>
            <Badge variant="outline" className="text-purple-300">
              <Trophy className="w-3 h-3 mr-1" />
              {score} pts
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Instructions */}
          <div className="rounded-lg bg-slate-800/60 p-4">
            <p className="text-sm text-gray-300">{currentGame?.instructions}</p>
          </div>
          
          {/* Question */}
          {currentQuestion && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">{currentQuestion.question}</p>
                <Badge variant="secondary" className="text-xs">
                  Q {currentQuestionIndex + 1}/{questions.length}
                </Badge>
              </div>
              
              {/* Options */}
              <RadioGroup value={selectedAnswer || ""} onValueChange={setSelectedAnswer} disabled={showResult}>
                <div className="space-y-3">
                  {currentQuestion.options?.map((option: string) => (
                    <div 
                      key={option} 
                      className={`flex items-center space-x-2 p-3 rounded-lg border transition ${
                        showResult && option === currentQuestion.correctAnswer
                          ? "border-green-500 bg-green-500/10"
                          : showResult && option === selectedAnswer
                          ? "border-red-500 bg-red-500/10"
                          : "border-purple-500/30 hover:border-purple-500/60"
                      }`}
                    >
                      <RadioGroupItem value={option} id={option} />
                      <Label htmlFor={option} className="flex-1 cursor-pointer text-sm">
                        {option}
                      </Label>
                      {showResult && option === currentQuestion.correctAnswer && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {showResult && option === selectedAnswer && option !== currentQuestion.correctAnswer && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </RadioGroup>
              
              {/* Explanation (after answer) */}
              {showResult && currentQuestion.explanation && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
                  <p className="text-sm text-blue-200">
                    <strong>Explanation:</strong> {currentQuestion.explanation}
                  </p>
                </div>
              )}
              
              {/* Hint */}
              {!showResult && currentQuestion.hint && (
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-300">Need a hint?</summary>
                  <p className="mt-2 pl-4 border-l-2 border-purple-500/30">{currentQuestion.hint}</p>
                </details>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose} className="border-purple-500/30">
              Exit
            </Button>
            {!showResult ? (
              <Button 
                onClick={handleSubmit} 
                disabled={!selectedAnswer}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Submit Answer
              </Button>
            ) : (
              <Button 
                onClick={handleNext}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {currentQuestionIndex < questions.length - 1 
                  ? "Next Question" 
                  : currentGameIndex < miniGames.length - 1
                  ? "Next Game"
                  : "Complete"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
