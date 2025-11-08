"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Award, Target, Zap, Plus, Trash2, Clock } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

interface Session {
  id: string
  topic: string
  created_at: string
  status: "active" | "completed" | "paused"
  progress: number
  grade_level?: string
  learning_goals?: string
}

interface Assignment {
  id: string
  title: string
  status: "pending" | "completed"
}

export default function DashboardOverviewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assessmentScores, setAssessmentScores] = useState<any[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null)

  useEffect(() => {
    loadStudentData()
  }, [])

  const loadStudentData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      // Fetch student profile from database
      const { data: profileData } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      // Use full_name from profile, fall back to user metadata, then email extraction
      let displayName = "Student"
      
      if (profileData?.full_name) {
        displayName = profileData.full_name
      } else if (user.user_metadata?.full_name) {
        displayName = user.user_metadata.full_name
      } else if (user.email) {
        // Fallback: Extract and capitalize from email
        const emailName = user.email.split("@")[0]
        displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1).replace(/[._-]/g, ' ')
      }

      setStudent({
        id: user.id,
        email: user.email,
        name: displayName,
        profile: profileData,
      })

      // Fetch sessions from backend
      const { data: sessionsData } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })

      setSessions(sessionsData || [])

      // Fetch assignments from backend
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })

      setAssignments(assignmentsData || [])

      // Fetch assessments from existing assessments table
      const { data: assessmentData } = await supabase
        .from("assessments")
        .select("*")
        .eq("student_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })

      setAssessmentScores(assessmentData || [])
    } catch (error) {
      console.error("Error loading student data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = (session: Session) => {
    setSessionToDelete(session)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return

    try {
      const { error } = await supabase
        .from("learning_sessions")
        .delete()
        .eq("id", sessionToDelete.id)

      if (error) throw error

      setSessions(sessions.filter((s) => s.id !== sessionToDelete.id))
      toast({
        title: "Session deleted",
        description: `${sessionToDelete.topic} session has been removed`,
      })
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete session",
        variant: "destructive",
      })
    }
  }

  const handleNewSession = () => {
    router.push("/dashboard/new-session")
  }

  const handleContinueSession = (session: Session) => {
    // Navigate to chat interface with session context
    router.push(
      `/dashboard/learn?sessionId=${session.id}&topic=${encodeURIComponent(
        session.topic
      )}&gradeLevel=${encodeURIComponent(session.grade_level || "")}&learningGoals=${encodeURIComponent(
        session.learning_goals || ""
      )}`
    )
  }

  // Calculate average progress across all sessions
  const calculateAverageProgress = () => {
    if (sessions.length === 0) return "0%"
    const totalProgress = sessions.reduce((sum, session) => sum + (session.progress || 0), 0)
    const average = Math.round(totalProgress / sessions.length)
    return `${average}%`
  }

  // Calculate average assessment score
  const calculateAverageScore = () => {
    if (assessmentScores.length === 0) return "N/A"
    const totalScore = assessmentScores.reduce((sum, assessment) => sum + (assessment.percentage || 0), 0)
    const average = Math.round(totalScore / assessmentScores.length)
    return `${average}%`
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black text-black mb-2">
              Hey, {student?.name || "Student"}! 👋
            </h1>
            <p className="text-lg text-black/70 font-semibold">
              Ready to learn something new today?
            </p>
          </div>
          <button
            onClick={handleNewSession}
            className="bg-orange-500 text-white font-black border-4 border-black px-6 py-3 hover:bg-orange-600 transition inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            NEW SESSION
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-12">
          {[
            { label: "TOTAL SESSIONS", value: loading ? "..." : sessions.length.toString(), icon: BookOpen, bg: "bg-white" },
            { label: "ASSESSMENTS", value: loading ? "..." : assessmentScores.length.toString(), icon: Award, bg: "bg-white" },
            { label: "AVERAGE SCORE", value: loading ? "..." : calculateAverageScore(), icon: Target, bg: "bg-white" },
            { label: "STUDY STREAK", value: "0", icon: Zap, bg: "bg-white" },
          ].map((stat, i) => (
            <div key={i} className="relative">
              <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black" />
              <div className="relative bg-white border-4 border-black p-6">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-xs font-black text-black/60 uppercase">{stat.label}</p>
                  <stat.icon className="w-6 h-6 text-orange-500" />
                </div>
                <p className="text-4xl font-black text-black">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Recent Sessions */}
          <div className="col-span-2">
            <div className="relative">
              <div className="absolute -right-3 -bottom-3 w-full h-full border-4 border-black" />
              <div className="relative bg-orange-500 border-4 border-black">
                {/* Header */}
                <div className="bg-orange-500 border-b-4 border-black p-6 flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-black text-white">Recent Sessions</h2>
                </div>

                {/* Content */}
                <div className="bg-orange-500 p-4 space-y-4">
                  {sessions.length === 0 ? (
                    <div className="bg-white border-4 border-black p-8 text-center">
                      <BookOpen className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                      <p className="text-lg font-black text-black">No sessions yet</p>
                      <p className="text-sm text-black/60 mt-2">Start your first learning session</p>
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-white border-4 border-black p-6 relative"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="mb-3">
                              <h3 className="text-lg font-black text-black mb-1">
                                {session.topic}
                              </h3>
                              {session.grade_level && (
                                <p className="text-xs font-semibold text-black/60">
                                  {session.grade_level}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                              <Clock className="w-4 h-4 text-black/60" />
                              <span className="text-xs font-semibold text-black/70">
                                {new Date(session.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white bg-orange-500 border-2 border-black px-2 py-1">
                                {session.status.toUpperCase()}
                              </span>
                              <span className="text-xs font-semibold text-black/70">
                                {session.progress || 0}% progress
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleContinueSession(session)}
                              className="bg-orange-500 text-white font-black border-2 border-black px-4 py-2 hover:bg-orange-600 active:bg-orange-700 transition flex items-center gap-2 whitespace-nowrap"
                            >
                              ▶ CONTINUE
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session)}
                              className="p-2 border-2 border-red-600 bg-white hover:bg-red-600 transition"
                              title="Delete session"
                            >
                              <Trash2 className="w-5 h-5 text-red-600 hover:text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="relative">
            <div className="absolute -right-3 -bottom-3 w-full h-full border-4 border-black" />
            <div className="relative bg-blue-500 border-4 border-black h-full flex flex-col">
              {/* Header */}
              <div className="bg-blue-500 border-b-4 border-black p-6 flex items-center gap-3">
                <Award className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-black text-white">Recent Assignments</h2>
              </div>

              {/* Content */}
              <div className="bg-blue-500 p-8 flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 border-4 border-white mx-auto mb-4 flex items-center justify-center">
                    <Award className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-xl font-black text-white mb-2">No assignments yet</p>
                  <p className="text-sm font-semibold text-white/80">
                    Complete lessons to unlock assignments
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-white border-4 border-black p-8 max-w-md">
            <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black -z-10" />
            <h2 className="text-2xl font-black text-black mb-4">Delete Session?</h2>
            <p className="text-black/70 mb-6">
              Are you sure you want to delete the <strong>{sessionToDelete?.topic}</strong> session? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 bg-white border-2 border-black text-black font-black px-4 py-2 hover:bg-gray-100 transition"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDeleteSession}
                className="flex-1 bg-red-600 border-2 border-black text-white font-black px-4 py-2 hover:bg-red-700 transition"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
