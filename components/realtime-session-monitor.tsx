"use client"

import { useRealtimeSession } from "@/hooks/use-realtime-session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, MessageSquare, Zap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SessionMonitorProps {
  sessionId: string
}

export function RealtimeSessionMonitor({ sessionId }: SessionMonitorProps) {
  const { state } = useRealtimeSession(sessionId)

  // Calculate metrics
  const studentMsgCount = state.messages.filter((m) => m.role === "student").length
  const tutorMsgCount = state.messages.filter((m) => m.role === "tutor").length
  const highPriorityFeedback = state.feedback.filter((f) => f.priority === "high").length
  const sessionMinutes = Math.floor(state.sessionDuration / 60)

  return (
    <div className="w-full space-y-4">
      {/* Engagement Gauge */}
      <Card className="border-purple-500/30 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-sm">Engagement Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Progress value={state.engagementScore} className="h-2" />
            </div>
            <span className="text-white font-semibold">{state.engagementScore}%</span>
          </div>
          <p className="text-xs text-gray-400">
            {state.engagementScore > 75
              ? "Excellent engagement!"
              : state.engagementScore > 50
                ? "Good participation"
                : "Needs encouragement"}
          </p>
        </CardContent>
      </Card>

      {/* Session Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-purple-500/30 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Messages</span>
          </div>
          <p className="text-2xl font-bold text-white">{state.messages.length}</p>
          <p className="text-xs text-gray-500">
            {studentMsgCount} student, {tutorMsgCount} tutor
          </p>
        </Card>

        <Card className="border-purple-500/30 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Duration</span>
          </div>
          <p className="text-2xl font-bold text-white">{sessionMinutes}m</p>
          <p className="text-xs text-gray-500">Active learning</p>
        </Card>
      </div>

      {/* High Priority Feedback Alert */}
      {highPriorityFeedback > 0 && (
        <Alert className="border-red-500/30 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-sm text-red-300">
            {highPriorityFeedback} high-priority feedback item
            {highPriorityFeedback > 1 ? "s" : ""} - student may need support
          </AlertDescription>
        </Alert>
      )}

      {/* Feedback Summary */}
      {state.feedback.length > 0 && (
        <Card className="border-purple-500/30 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.feedback.slice(-3).map((feedback, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-slate-700/50 rounded">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    feedback.priority === "high" ? "border-red-500 text-red-300" : "border-yellow-500 text-yellow-300"
                  }`}
                >
                  {feedback.priority}
                </Badge>
                <span className="text-xs text-gray-300 flex-1">{feedback.content}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Real-time Status</span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${state.isConnected ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
          <span className="text-gray-300">{state.isConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>
    </div>
  )
}
