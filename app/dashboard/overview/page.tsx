"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatsCard } from "@/components/stats-card"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import {
  Brain,
  BookOpen,
  TrendingUp,
  Clock,
  Award,
  Plus,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Trash2,
  History,
  Zap,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Session {
  id: string
  topic: string
  created_at: string
  updated_at: string
  progress: number
  status: "active" | "completed" | "paused"
  curriculum_plan?: any
}

interface Assignment {
  id: string
  title: string
  topic: string
  score?: number
  status: "pending" | "completed" | "in-progress"
  created_at: string
  due_date?: string
}

interface ProgressMetrics {
  totalSessions: number
  completedSessions: number
  totalAssignments: number
  completedAssignments: number
  averageScore: number
  totalStudyTime: number // in minutes
  streak: number // days
}

export default function DashboardOverviewPage() {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null)
  const [metrics, setMetrics] = useState<ProgressMetrics>({
    totalSessions: 0,
    completedSessions: 0,
    totalAssignments: 0,
    completedAssignments: 0,
    averageScore: 0,
    totalStudyTime: 0,
    streak: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      // Load student profile
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      setStudent(profile || { id: user.id, name: user.email })

      // Load sessions
      const { data: sessionsData } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("student_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5)

      setSessions(sessionsData || [])

      // Load assignments
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      setAssignments(assignmentsData || [])

      // Calculate metrics
      const { data: allSessions } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("student_id", user.id)

      const { data: allAssignments } = await supabase
        .from("assignments")
        .select("*")
        .eq("student_id", user.id)

      const completedAssignments = allAssignments?.filter(a => a.status === "completed") || []
      const avgScore = completedAssignments.length > 0
        ? completedAssignments.reduce((sum, a) => sum + (a.score || 0), 0) / completedAssignments.length
        : 0

      setMetrics({
        totalSessions: allSessions?.length || 0,
        completedSessions: allSessions?.filter(s => s.status === "completed").length || 0,
        totalAssignments: allAssignments?.length || 0,
        completedAssignments: completedAssignments.length,
        averageScore: Math.round(avgScore),
        totalStudyTime: 0, // TODO: Calculate from session durations
        streak: 0, // TODO: Calculate study streak
      })
    } catch (error) {
      console.error("[dashboard] Error loading data:", error)
      toast({
        title: "Error loading dashboard",
        description: "Please try refreshing the page",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewSession = () => {
    router.push("/dashboard/new-session")
  }

  const handleContinueSession = (sessionId: string, topic: string) => {
    router.push(`/dashboard/learn?sessionId=${sessionId}&topic=${encodeURIComponent(topic)}`)
  }

  const handleDeleteSession = async (session: Session) => {
    setSessionToDelete(session)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return

    try {
      console.log("[dashboard] Attempting to delete session:", sessionToDelete.id)
      
      const { data, error } = await supabase
        .from("learning_sessions")
        .delete()
        .eq("id", sessionToDelete.id)
        .select()

      console.log("[dashboard] Delete result:", { data, error })

      if (error) {
        console.error("[dashboard] Delete error details:", error)
        throw error
      }

      toast({
        title: "Session deleted",
        description: `"${sessionToDelete.topic}" has been removed`,
      })

      // Refresh sessions list
      setSessions(sessions.filter(s => s.id !== sessionToDelete.id))
      setDeleteDialogOpen(false)
      setSessionToDelete(null)

      // Reload data to update metrics
      await loadDashboardData()
    } catch (error: any) {
      console.error("[dashboard] Error deleting session:", error)
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete the session. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center fade-in">
          <div className="relative inline-block">
            <Brain className="w-16 h-16 text-purple-400 animate-pulse mx-auto mb-4" />
            <div className="absolute inset-0 blur-2xl bg-purple-400/30 animate-pulse-slow" />
          </div>
          <p className="text-white text-lg">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 fade-in">
          <div>
            <h1 className="heading-lg gradient-text mb-2">
              Welcome back, {student?.name || "Student"}! ✨
            </h1>
            <p className="text-gray-400 text-lg">Continue your learning journey</p>
          </div>
          <Button
            onClick={handleNewSession}
            className="btn-primary hover-lift gap-2"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            New Session
            <Zap className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 slide-up">
          <Card className="glass-card border-purple-500/30 hover-lift card-interactive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl gradient-purple-pink">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  +{metrics.completedSessions > 0 
                    ? Math.round((metrics.completedSessions / metrics.totalSessions) * 100)
                    : 0}%
                </Badge>
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Sessions</p>
              <p className="text-3xl font-bold text-white">{metrics.totalSessions}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-pink-500/30 hover-lift card-interactive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl gradient-pink-purple">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {metrics.completedAssignments > 0
                    ? Math.round((metrics.completedAssignments / metrics.totalAssignments) * 100)
                    : 0}%
                </Badge>
              </div>
              <p className="text-gray-400 text-sm mb-1">Assignments</p>
              <p className="text-3xl font-bold text-white">{metrics.totalAssignments}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-green-500/30 hover-lift card-interactive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl gradient-green-teal">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <Badge className={metrics.averageScore >= 70 ? "status-success" : "status-warning"}>
                  {metrics.averageScore >= 70 ? "Great!" : "Keep Going"}
                </Badge>
              </div>
              <p className="text-gray-400 text-sm mb-1">Average Score</p>
              <p className="text-3xl font-bold text-white">{metrics.averageScore}%</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-orange-500/30 hover-lift card-interactive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl gradient-orange-red">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  🔥 Streak
                </Badge>
              </div>
              <p className="text-gray-400 text-sm mb-1">Study Streak</p>
              <p className="text-3xl font-bold text-white">{metrics.streak} days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sessions */}
          <Card className="glass-card border-purple-500/30 card-interactive">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <div className="p-2 rounded-lg gradient-purple-pink">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-purple-pink flex items-center justify-center">
                    <History className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-400 mb-4">No sessions yet</p>
                  <Button
                    onClick={handleNewSession}
                    className="btn-secondary hover-scale"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Start your first session
                  </Button>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="glass-effect rounded-xl p-4 border border-purple-500/30 hover:border-purple-500/50 transition-all hover-lift"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg mb-1">{session.topic}</h3>
                        <p className="text-xs text-gray-400">
                          {new Date(session.updated_at).toLocaleDateString()} • {new Date(session.updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            session.status === "completed"
                              ? "status-success"
                              : session.status === "active"
                              ? "status-active"
                              : "status-pending"
                          }
                        >
                          {session.status}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSession(session)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {session.progress !== undefined && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                          <span className="font-medium">Progress</span>
                          <span className="font-bold text-purple-300">{session.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all duration-500"
                            style={{ width: `${session.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      onClick={() => handleContinueSession(session.id, session.topic)}
                      size="sm"
                      className="w-full btn-primary hover-scale gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Continue Session
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Assignments */}
          <Card className="glass-card border-pink-500/30 card-interactive">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <div className="p-2 rounded-lg gradient-pink-purple">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                Recent Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-green-teal flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-400">No assignments yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Complete lessons to unlock assignments
                  </p>
                </div>
              ) : (
                assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="glass-effect rounded-xl p-4 border border-pink-500/30 hover:border-pink-500/50 transition-all hover-lift"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg mb-1">{assignment.title}</h3>
                        <p className="text-xs text-gray-400">{assignment.topic}</p>
                      </div>
                      {assignment.status === "completed" ? (
                        <div className="p-2 rounded-lg bg-green-500/20">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                      ) : assignment.status === "in-progress" ? (
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-orange-500/20">
                          <AlertCircle className="w-5 h-5 text-orange-400" />
                        </div>
                      )}
                    </div>
                    {assignment.score !== undefined && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 mb-3">
                        <span className="text-gray-400 text-sm font-medium">Score</span>
                        <span className="font-bold text-xl gradient-text">{assignment.score}%</span>
                      </div>
                    )}
                    {assignment.due_date && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-red-400 text-xl">
              <div className="p-3 rounded-xl bg-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              Delete Session?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 text-base pt-2">
              Are you sure you want to delete the session <span className="font-semibold text-white">"{sessionToDelete?.topic}"</span>? 
              <br /><br />
              This action cannot be undone. All progress and data from this session will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="glass-effect border-slate-700 text-white hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSession}
              className="gradient-orange-red text-white hover:opacity-90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
