"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Brain,
  ArrowRight,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface AssessmentModalProps {
  open: boolean;
  onClose: () => void;
  topic: string;
  questions: Question[];
  assessmentId: string;
  studentId: string;
  sessionId: string;
  onPass: () => void;
  onRetry: () => void;
}

export function AssessmentModal({
  open,
  onClose,
  topic,
  questions,
  assessmentId,
  studentId,
  sessionId,
  onPass,
  onRetry,
}: AssessmentModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const selectAnswer = (questionId: string, answer: string) => {
    if (!submitted) {
      setAnswers({ ...answers, [questionId]: answer });
    }
  };

  const handleSubmit = async () => {
    // Check if all questions answered
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      alert(`Please answer all questions! ${unanswered.length} remaining.`);
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch("/api/assessment/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          studentId,
          sessionId,
          answers,
          questions,
        }),
      });

      const data = await response.json();
      setResults(data);
      setSubmitted(true);

      if (data.passed) {
        setTimeout(() => {
          onPass();
        }, 3000);
      }
    } catch (error) {
      console.error("[assessment] Validation error:", error);
      alert("Failed to submit assessment. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResults(null);
    setCurrentQuestion(0);
    onRetry();
  };

  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const questionResult = submitted
    ? results?.results?.find((r: any) => r.questionId === question.id)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            {submitted ? "Assessment Results" : `Assessment: ${topic}`}
          </DialogTitle>
          <DialogDescription>
            {submitted
              ? results?.message
              : "Answer all questions to proceed to the next lesson. You need 60% to pass."}
          </DialogDescription>
        </DialogHeader>

        {submitted && results ? (
          // Results View
          <div className="space-y-6">
            <Card className={cn(
              "p-6 border-2",
              results.passed
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-orange-500/50 bg-orange-500/10"
            )}>
              <div className="text-center">
                {results.passed ? (
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                ) : (
                  <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                )}
                <h3 className="text-3xl font-bold mb-2">
                  {results.score}%
                </h3>
                <p className="text-lg text-muted-foreground">
                  {results.correctCount} out of {results.totalQuestions} correct
                </p>
              </div>
            </Card>

            {/* Detailed Results */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Review Your Answers:</h4>
              {results.results.map((result: any, index: number) => (
                <Card
                  key={result.questionId}
                  className={cn(
                    "p-4 border-l-4",
                    result.isCorrect
                      ? "border-l-emerald-500 bg-emerald-500/5"
                      : "border-l-red-500 bg-red-500/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {result.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">{result.question}</p>
                      <div className="flex gap-2 mb-2">
                        <Badge variant={result.isCorrect ? "default" : "destructive"}>
                          Your answer: {result.studentAnswer}
                        </Badge>
                        {!result.isCorrect && (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                            Correct: {result.correctAnswer}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {result.explanation}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {results.passed ? (
                <Button
                  onClick={onPass}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
                  size="lg"
                >
                  Continue to Next Lesson
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    className="flex-1 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/20"
                    size="lg"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Retry Assessment
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 border-orange-500/40 text-orange-300 hover:bg-orange-900/20"
                    size="lg"
                  >
                    Review Lesson
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          // Question View
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Question {currentQuestion + 1} of {questions.length}</span>
                <span>{Object.keys(answers).length} answered</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question */}
            <Card className="p-6 border-emerald-500/20 bg-slate-900/70">
              <h3 className="text-xl font-semibold mb-4">{question.question}</h3>
              <div className="space-y-3">
                {question.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index); // A, B, C, D
                  const isSelected = answers[question.id] === letter;

                  return (
                    <button
                      key={letter}
                      onClick={() => selectAnswer(question.id, letter)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2 transition-all",
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/20"
                          : "border-gray-700 hover:border-emerald-500/50 hover:bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0",
                            isSelected
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-700 text-gray-300"
                          )}
                        >
                          {letter}
                        </div>
                        <span className="flex-1">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                variant="outline"
                disabled={currentQuestion === 0}
                className="border-emerald-500/40"
              >
                Previous
              </Button>

              {isLastQuestion ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isValidating || Object.keys(answers).length !== questions.length}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
                  size="lg"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Assessment"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
                >
                  Next Question
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
