"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, TrendingUp, Target, BookOpen, Lightbulb } from "lucide-react"
import type { FeedbackData } from "@/lib/types"

interface IntegratedFeedbackProps {
  question: string
  studentAnswer: string
  correctAnswer: string
  feedback: FeedbackData
  onContinue: () => void
  questionNumber: number
  totalQuestions: number
}

export function IntegratedFeedbackView({
  question,
  studentAnswer,
  correctAnswer,
  feedback,
  onContinue,
  questionNumber,
  totalQuestions,
}: IntegratedFeedbackProps) {
  const [expandedSection, setExpandedSection] = useState("overview")

  const isCorrect = feedback.isCorrect
  const confidenceColor =
    feedback.confidence >= 80 ? "text-green-500" : feedback.confidence >= 60 ? "text-yellow-500" : "text-orange-500"

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Question Context */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg">{question}</CardTitle>
              <CardDescription className="mt-2">
                Question {questionNumber} of {totalQuestions}
              </CardDescription>
            </div>
            <Badge variant={isCorrect ? "default" : "secondary"}>{feedback.correctnessScore}%</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Main Feedback */}
      <Tabs value={expandedSection} onValueChange={setExpandedSection} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Result</TabsTrigger>
          <TabsTrigger value="explanation">Concept</TabsTrigger>
          <TabsTrigger value="gap">Gap</TabsTrigger>
          <TabsTrigger value="next">Next</TabsTrigger>
        </TabsList>

        {/* Result Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Correct!
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    Not quite
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Answer</p>
                <div className="p-3 bg-muted rounded-lg border border-border">{studentAnswer}</div>
              </div>

              {!isCorrect && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Correct Answer</p>
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <p className="font-medium text-green-700">{correctAnswer}</p>
                  </div>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{feedback.reasoning}</AlertDescription>
              </Alert>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">AI Confidence</span>
                <span className={`font-bold ${confidenceColor}`}>{feedback.confidence}%</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Concept Tab */}
        <TabsContent value="explanation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Concept Explanation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{feedback.conceptExplanation}</p>

              {feedback.followUpResources && feedback.followUpResources.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recommended Resources</p>
                  <div className="space-y-2">
                    {feedback.followUpResources.map((resource, idx) => (
                      <Badge key={idx} variant="secondary" className="mr-2">
                        {resource}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gap Tab */}
        <TabsContent value="gap">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Learning Gap Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedback.studentMisconception && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <p className="text-sm font-medium mb-1">Possible Misconception</p>
                  <p className="text-sm">{feedback.studentMisconception}</p>
                </div>
              )}

              {feedback.learningGap && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm font-medium mb-1">Area to Focus On</p>
                  <p className="text-sm">{feedback.learningGap}</p>
                </div>
              )}

              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  Spend extra time on this concept before moving to more advanced topics
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Next Tab */}
        <TabsContent value="next">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Guided Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm font-medium mb-1">Your Guided Question</p>
                <p className="text-sm italic">{feedback.guidedQuestion}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Recommended Actions</p>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  <li>Review the concept explanation above</li>
                  <li>Answer the guided question to reinforce learning</li>
                  {!isCorrect && <li>Revisit similar practice problems</li>}
                  {isCorrect && <li>Move to the next, more challenging question</li>}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Continue Button */}
      <Button onClick={onContinue} className="w-full" size="lg">
        Continue to Next Question
      </Button>
    </div>
  )
}
