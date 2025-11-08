"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, TrendingUp, TrendingDown, Target, Sparkles } from "lucide-react"

interface FeedbackInsights {
  weakConcepts: string[]
  strongConcepts: string[]
  engagementLevel: "low" | "medium" | "high"
  suggestedNextTopics: string[]
  progressIndicators: {
    conceptualUnderstanding: number
    problemSolvingSkill: number
    retentionLikelihood: number
  }
  sessionSummary: string
  keyTakeaways: string[]
}

interface FeedbackPanelProps {
  studentId: string
  sessionId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function FeedbackPanel({ studentId, sessionId, autoRefresh = true, refreshInterval = 30000 }: FeedbackPanelProps) {
  const [insights, setInsights] = useState<FeedbackInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchFeedback = async () => {
    if (!studentId) {
      console.warn("[FeedbackPanel] No studentId provided")
      return
    }

    console.log("[FeedbackPanel] 🔄 Fetching feedback...", { studentId: studentId.slice(0, 8), sessionId: sessionId?.slice(0, 8) })
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/feedback/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, sessionId, mode: "session" }),
      })

      console.log("[FeedbackPanel] Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[FeedbackPanel] ✅ Data received:", {
          success: data.success,
          hasFeedback: !!data.feedback,
          engagementLevel: data.feedback?.engagementLevel,
        })
        
        if (data.success && data.feedback) {
          setInsights(data.feedback)
          setLastUpdated(new Date())
          setError(null)
        } else {
          console.warn("[FeedbackPanel] No feedback in response")
        }
      } else {
        const errorText = await response.text().catch(() => "Unknown error")
        console.error("[FeedbackPanel] ❌ API error:", response.status, errorText)
        setError(`Failed to load insights (${response.status})`)
      }
    } catch (error) {
      console.error("[FeedbackPanel] ❌ Fetch error:", error)
      setError("Network error - check connection")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log("[FeedbackPanel] 🎬 Mounting with:", { studentId: studentId?.slice(0, 8), sessionId: sessionId?.slice(0, 8), autoRefresh, refreshInterval })
    
    // Initial fetch
    fetchFeedback()

    // Set up auto-refresh if enabled
    if (autoRefresh && refreshInterval > 0) {
      console.log("[FeedbackPanel] ⏰ Setting up auto-refresh every", refreshInterval, "ms")
      const interval = setInterval(fetchFeedback, refreshInterval)
      return () => {
        console.log("[FeedbackPanel] 🧹 Cleaning up auto-refresh")
        clearInterval(interval)
      }
    }
  }, [studentId, sessionId, autoRefresh, refreshInterval])

  if (!insights && !isLoading) {
    return (
      <Card className="border-purple-500/20 bg-slate-900/70 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Feedback Pulse
            {error && <span className="text-xs text-red-400 ml-auto">⚠ {error}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400">
          <p>Feedback insights will appear after a few interactions.</p>
          <p className="text-xs mt-2">The system analyzes conversations and assignments to provide personalized guidance.</p>
          <button 
            onClick={fetchFeedback}
            className="mt-3 text-xs text-purple-400 hover:text-purple-300 underline"
          >
            Refresh Now
          </button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading && !insights) {
    return (
      <Card className="border-purple-500/20 bg-slate-900/70 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="animate-pulse">Analyzing Progress...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 bg-slate-800/60 rounded animate-pulse" />
            <div className="h-8 bg-slate-800/60 rounded animate-pulse" />
            <div className="h-8 bg-slate-800/60 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const engagementColor = {
    low: "text-red-400",
    medium: "text-yellow-400",
    high: "text-green-400",
  }[insights?.engagementLevel || "medium"]

  return (
    <Card className="border-purple-500/20 bg-slate-900/70 text-white relative overflow-hidden">
      {/* Pulsing border effect when loading */}
      {isLoading && (
        <div className="absolute inset-0 border-2 border-purple-500/50 rounded-lg animate-pulse pointer-events-none" />
      )}
      
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className={`w-4 h-4 text-purple-400 ${isLoading ? 'animate-pulse' : ''}`} />
            <span>Feedback Pulse</span>
            {isLoading && <span className="text-xs text-purple-400 animate-pulse">●</span>}
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                {Math.floor((Date.now() - lastUpdated.getTime()) / 60000)}m ago
              </span>
            )}
            <button
              onClick={fetchFeedback}
              disabled={isLoading}
              className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh feedback"
            >
              🔄
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Engagement Level */}
        {insights?.engagementLevel && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Engagement</span>
              <span className={`text-sm font-semibold ${engagementColor}`}>{insights.engagementLevel.toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Progress Indicators */}
        {insights?.progressIndicators && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-300">Understanding</span>
                <span className="text-gray-400">{insights.progressIndicators.conceptualUnderstanding}%</span>
              </div>
              <Progress value={insights.progressIndicators.conceptualUnderstanding} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-300">Problem Solving</span>
                <span className="text-gray-400">{insights.progressIndicators.problemSolvingSkill}%</span>
              </div>
              <Progress value={insights.progressIndicators.problemSolvingSkill} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-300">Retention</span>
                <span className="text-gray-400">{insights.progressIndicators.retentionLikelihood}%</span>
              </div>
              <Progress value={insights.progressIndicators.retentionLikelihood} className="h-2" />
            </div>
          </div>
        )}

        {/* Strong Concepts */}
        {insights?.strongConcepts && insights.strongConcepts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-sm text-gray-300 font-medium">Mastered</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.strongConcepts.slice(0, 3).map((concept) => (
                <Badge key={concept} variant="outline" className="text-xs bg-green-500/20 border-green-500/40 text-green-300">
                  {concept}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Weak Concepts */}
        {insights?.weakConcepts && insights.weakConcepts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-3 h-3 text-orange-400" />
              <span className="text-sm text-gray-300 font-medium">Needs Practice</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.weakConcepts.slice(0, 3).map((concept) => (
                <Badge key={concept} variant="outline" className="text-xs bg-orange-500/20 border-orange-500/40 text-orange-300">
                  {concept}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Next Focus Areas */}
        {insights?.suggestedNextTopics && insights.suggestedNextTopics.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3 h-3 text-purple-400" />
              <span className="text-sm text-gray-300 font-medium">Next Focus</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.suggestedNextTopics.slice(0, 3).map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs bg-purple-500/20 border-purple-500/40 text-purple-300">
                  🎯 {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Key Takeaways */}
        {insights?.keyTakeaways && insights.keyTakeaways.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span className="text-sm text-gray-300 font-medium">Key Takeaways</span>
            </div>
            <ul className="space-y-1">
              {insights.keyTakeaways.slice(0, 3).map((takeaway, index) => (
                <li key={index} className="text-xs text-gray-400 flex items-start gap-2">
                  <span className="text-yellow-400">•</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Session Summary */}
        {insights?.sessionSummary && (
          <div className="pt-3 border-t border-purple-500/20">
            <p className="text-xs text-gray-400 leading-relaxed">{insights.sessionSummary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
