"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { resourceIdFromUrl } from "@/lib/utils"
import {
  Brain,
  BookOpen,
  Video,
  FileText,
  Code,
  ExternalLink,
  PlayCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react"

interface Lesson {
  id: string
  title: string
  topic: string
  duration?: number
  content?: string
}

interface Resource {
  id: string
  title: string
  type: string
  url: string
  duration?: number
  platform?: string
  description?: string
}

interface Assignment {
  id: string
  title: string
  description?: string
  topic: string
}

export default function CurriculumBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()
  const { toast } = useToast()

  const [isGenerating, setIsGenerating] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [student, setStudent] = useState<any>(null)
  
  const topic = searchParams.get("topic") || ""
  const gradeLevel = searchParams.get("gradeLevel") || ""
  const learningGoals = searchParams.get("learningGoals") || ""

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    loadStudentAndGenerateCurriculum()
  }, [])

  const loadStudentAndGenerateCurriculum = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      setStudent(profile || { id: user.id })

      // Get syllabus from sessionStorage if uploaded
      const syllabusContent = sessionStorage.getItem("syllabusContent")
      
      // Generate curriculum using the agent
      const response = await fetch("/api/agents/generate-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user.id,
          topic,
          gradeLevel,
          learningStyle: profile?.learning_style,
          syllabus: syllabusContent,
          learningGoals,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate curriculum: ${response.status}`)
      }

      const data = await response.json()

      console.log("[curriculum-builder] 📦 API Response:", { 
        success: data.success, 
        sessionId: data.sessionId,
        sessionIdType: typeof data.sessionId,
        sessionIdIsNull: data.sessionId === null,
        sessionIdIsUndefined: data.sessionId === undefined,
        lessonsCount: data.lessons?.length,
        resourcesCount: data.resources?.length,
        fullData: data
      })

      if (!data.success) {
        throw new Error(data.error || "Curriculum generation failed")
      }

      let lessonsList: Lesson[] = Array.isArray(data.lessons) ? data.lessons : []
      let resourcesList: Resource[] = Array.isArray(data.resources) ? data.resources : []
      const assignmentsList: Assignment[] = Array.isArray(data.assignments)
        ? data.assignments
        : []

      // If resources are sparse, fetch more using Tavily
      if (resourcesList.length < 5) {
        const resourceResponse = await fetch("/api/resources/fetch-real", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, count: 8 }),
        })

        if (resourceResponse.ok) {
          const resourceData = await resourceResponse.json()
          if (Array.isArray(resourceData.resources)) {
            resourcesList = [...resourcesList, ...resourceData.resources]
            // Dedupe by URL
            const byUrl = new Map(resourcesList.map((r: any) => [r.url, r]))
            resourcesList = Array.from(byUrl.values()).map((r: any) => ({
              id: r.id || resourceIdFromUrl(r.url),
              ...r,
            }))
          }
        }
      }

      setLessons(lessonsList)
      setResources(resourcesList)
      setAssignments(assignmentsList)
      setSessionId(data.sessionId || null)
      
      console.log("[curriculum-builder] 💾 State updated:", { 
        sessionId: data.sessionId || null,
        lessonsCount: lessonsList.length,
        resourcesCount: resourcesList.length 
      })

      // Clear syllabus from sessionStorage
      sessionStorage.removeItem("syllabusContent")
      sessionStorage.removeItem("syllabusFilename")

      toast({
        title: "Curriculum generated!",
        description: "Review your personalized learning path below",
      })
    } catch (error) {
      console.error("[curriculum-builder] Error:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      setTimeout(() => router.back(), 2000)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartSession = async () => {
    console.log("[curriculum-builder] 🔵 Start session clicked", { 
      sessionId, 
      lessonsCount: lessons.length,
      hasStudent: !!student,
      studentId: student?.id
    })
    
    if (!student?.id) {
      console.error("[curriculum-builder] ❌ No student loaded")
      toast({
        title: "Cannot start session",
        description: "Student profile not loaded. Please refresh the page.",
        variant: "destructive",
      })
      return
    }
    
    if (!sessionId || lessons.length === 0) {
      console.log("[curriculum-builder] ❌ Validation failed", { sessionId, lessonsCount: lessons.length })
      toast({
        title: "Cannot start session",
        description: sessionId ? "Curriculum must be generated first" : "No session ID found. Please try generating curriculum again.",
        variant: "destructive",
      })
      return
    }

    console.log("[curriculum-builder] ✅ Starting session...")
    setIsStarting(true)

    try {
      // Send initial context to feedback agent
      console.log("[curriculum-builder] 📤 Sending feedback...")
      const feedbackResponse = await fetch("/api/feedback/comprehensive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          sessionId,
          syllabusContext: {
            topic,
            gradeLevel,
            learningGoals,
            lessons: lessons.map(l => ({ title: l.title, topic: l.topic })),
            resources: resources.map(r => ({ title: r.title, type: r.type, url: r.url })),
          },
        }),
      })

      console.log("[curriculum-builder] 📥 Feedback response:", feedbackResponse.status, feedbackResponse.ok)

      // Navigate to learn page with session
      const learnUrl = `/dashboard/learn?sessionId=${sessionId}&topic=${encodeURIComponent(topic)}&new=true`
      console.log("[curriculum-builder] 🚀 Navigating to:", learnUrl)
      
      router.push(learnUrl)
      console.log("[curriculum-builder] ✅ Navigation called")
    } catch (error) {
      console.error("[curriculum-builder] ❌ Error:", error)
      toast({
        title: "Error starting session",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      setIsStarting(false)
    }
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="relative">
            <div className="w-24 h-24 bg-linear-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <Sparkles className="absolute top-0 right-1/3 w-6 h-6 text-yellow-400 animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Creating Your Personalized Curriculum
          </h2>
          <p className="text-gray-400 mb-4">
            Our AI is analyzing your topic and gathering the best resources...
          </p>
          <div className="space-y-2 text-sm text-gray-300">
            <p className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Structuring lessons
            </p>
            <p className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching educational resources
            </p>
            <p className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing assessments
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">Curriculum Ready!</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Review your personalized learning path for <span className="text-purple-300 font-semibold">{topic}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lessons */}
          <Card className="lg:col-span-2 border-purple-500/20 bg-slate-900/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Learning Path ({lessons.length} Lessons)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="rounded-lg bg-slate-800/60 p-4 border border-purple-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{lesson.title}</h3>
                        {lesson.content && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {lesson.content.substring(0, 120)}...
                          </p>
                        )}
                        {lesson.duration && (
                          <Badge
                            variant="outline"
                            className="mt-2 border-purple-500/30 text-purple-300"
                          >
                            {lesson.duration} mins
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resources & Actions */}
          <div className="space-y-6">
            {/* Resources */}
            <Card className="border-purple-500/20 bg-slate-900/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Resources ({resources.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {resources.slice(0, 6).map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block group"
                    >
                      <div className="rounded-lg bg-slate-800/60 p-3 hover:bg-slate-800 transition border border-transparent hover:border-purple-500/20">
                        <div className="flex items-start gap-2">
                          <div className="text-purple-400 mt-0.5 shrink-0">
                            {resource.type === "video" && <Video className="w-4 h-4" />}
                            {resource.type === "article" && <FileText className="w-4 h-4" />}
                            {resource.type === "documentation" && <Code className="w-4 h-4" />}
                            {!["video", "article", "documentation"].includes(
                              resource.type
                            ) && <BookOpen className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white group-hover:text-purple-300 transition line-clamp-2">
                              {resource.title}
                            </p>
                            <p className="text-xs text-gray-400 uppercase mt-0.5">
                              {resource.type || "resource"}
                            </p>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-500 shrink-0 mt-1" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Start Session Button */}
            <Card className="border-purple-500/20 bg-slate-900/70 backdrop-blur">
              <CardContent className="p-6">
                <Button
                  onClick={handleStartSession}
                  disabled={isStarting}
                  className="w-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg h-14"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Starting Session...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Start Learning Session
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-400 text-center mt-3">
                  Your AI tutor will guide you through each lesson
                </p>
              </CardContent>
            </Card>

            {/* Assignments Info */}
            {assignments.length > 0 && (
              <Card className="border-purple-500/20 bg-slate-900/70 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white text-base">
                    📝 {assignments.length} Assignments Prepared
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400">
                    Interactive assessments will appear as you complete each topic
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
