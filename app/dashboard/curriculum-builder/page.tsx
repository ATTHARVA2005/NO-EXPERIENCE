"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Edit2,
  Play,
  Loader,
} from "lucide-react"

interface Lesson {
  id: string
  title: string
  duration?: number
  topics?: string[]
}

interface CurriculumWeek {
  week: number
  title: string
  duration: number
  lessons: Lesson[]
}

export default function CurriculumBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [isGenerating, setIsGenerating] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)

  const topic = searchParams.get("topic") || "Your Course"
  const gradeLevel = searchParams.get("gradeLevel") || ""
  const learningGoals = searchParams.get("learningGoals") || ""

  // Load curriculum from backend API
  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        setIsGenerating(true)

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast({
            title: "Authentication required",
            description: "Please log in to continue",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        // Get syllabus content if available (from sessionStorage)
        const syllabusContent = sessionStorage.getItem("syllabusContent") || undefined

        // Call the backend curriculum generation API
        const response = await fetch("/api/agents/generate-curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: user.id,
            topic: topic || "General Knowledge",
            gradeLevel: gradeLevel || "General",
            learningGoals: learningGoals || undefined,
            syllabus: syllabusContent,
            learningStyle: "visual",
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to generate curriculum")
        }

        const data = await response.json()

        if (data.success && data.lessons) {
          // Transform lessons into week structure
          const weeks: CurriculumWeek[] = []
          const lessonsPerWeek = Math.ceil(data.lessons.length / 4) // Distribute over 4 weeks
          
          data.lessons.forEach((lesson: any, index: number) => {
            const weekNum = Math.floor(index / lessonsPerWeek) + 1
            
            if (!weeks[weekNum - 1]) {
              weeks[weekNum - 1] = {
                week: weekNum,
                title: `${topic} - Week ${weekNum}`,
                duration: 0,
                lessons: [],
              }
            }
            
            const lessonDuration = lesson.duration || 50
            weeks[weekNum - 1].duration += Math.ceil(lessonDuration / 60) // Convert to hours
            weeks[weekNum - 1].lessons.push({
              id: lesson.id || `lesson-${index}`,
              title: lesson.title,
              duration: lessonDuration,
              topics: lesson.subtopics?.map((s: any) => s.title) || [],
            })
          })

          setCurriculum(weeks)
          setSessionId(data.sessionId || null)

          // Store session ID for later reference
          if (data.sessionId) {
            sessionStorage.setItem('currentSessionId', data.sessionId)
          }

          toast({
            title: "Curriculum generated! 🎓",
            description: "Your personalized learning path is ready",
          })
        } else {
          throw new Error("Invalid response from curriculum API")
        }
      } catch (error: any) {
        console.error("[curriculum-builder] Error:", error)
        toast({
          title: "Failed to generate curriculum",
          description: error.message || "Please try again",
          variant: "destructive",
        })
        // Fallback: go back to new-session
        setTimeout(() => router.back(), 2000)
      } finally {
        setIsGenerating(false)
      }
    }

    loadCurriculum()
  }, [])

  const totalLessons = curriculum.reduce((sum, week) => sum + week.lessons.length, 0)
  const totalDuration = curriculum.reduce((sum, week) => sum + week.duration, 0)
  const totalTopics = new Set(curriculum.flatMap(w => w.lessons.flatMap(l => l.topics || []))).size

  const handleStartLearning = () => {
    setIsStarting(true)
    toast({
      title: "Starting your learning journey!",
      description: "Redirecting to your first lesson...",
    })
    setTimeout(() => {
      // Build URL with session parameters
      const params = new URLSearchParams()
      
      if (sessionId) {
        params.append('sessionId', sessionId)
      }
      params.append('topic', topic)
      params.append('gradeLevel', gradeLevel)
      if (learningGoals) {
        params.append('learningGoals', learningGoals)
      }
      
      const learnUrl = `/dashboard/learn?${params.toString()}`
      console.log("[curriculum-builder] Navigating to:", learnUrl)
      
      router.push(learnUrl)
    }, 1000)
  }

  const handleModifyDetails = () => {
    router.back()
  }

  // Show loading screen while generating curriculum
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <Sparkles className="w-24 h-24 text-orange-500 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-black mb-4">GENERATING YOUR</h1>
          <h1 className="text-4xl font-black text-orange-500 mb-6">PERSONALIZED CURRICULUM</h1>
          <div className="flex items-center justify-center gap-3">
            <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-lg font-bold text-black">This may take a moment...</p>
          </div>
          <p className="mt-6 text-sm text-black/60 max-w-md mx-auto">
            Our AI is analyzing your learning style and creating the perfect learning path for you.
          </p>
        </div>
      </div>
    )
  }

  // Show empty state if no curriculum generated
  if (curriculum.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20 pb-12">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-black text-black mb-4">NO CURRICULUM</h1>
          <p className="text-lg text-black/70 mb-8">Unable to generate curriculum. Please try again.</p>
          <button
            onClick={() => router.back()}
            className="bg-orange-500 text-white font-black border-4 border-black px-8 py-4 hover:bg-orange-600 transition"
          >
            ← GO BACK
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500" />
                <span className="text-sm font-black text-black uppercase tracking-wider">CURRICULUM READY</span>
              </div>
              <h1 className="text-6xl font-black text-black mb-2">Curriculum Ready!</h1>
              <p className="text-lg text-black/70 font-semibold">Review your personalized learning path</p>
            </div>
            <Sparkles className="w-16 h-16 text-orange-500" />
          </div>

          {/* Stats Banner */}
          <div className="relative">
            <div className="absolute -right-4 -bottom-4 w-full h-full border-4 border-black" />
            <div className="relative bg-yellow-300 border-4 border-black p-8">
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-4xl font-black text-black">{totalLessons}</p>
                  <p className="text-sm font-black text-black mt-2 uppercase">LESSONS</p>
                </div>
                <div className="border-l-4 border-r-4 border-black">
                  <p className="text-4xl font-black text-black">{totalDuration} hrs</p>
                  <p className="text-sm font-black text-black mt-2 uppercase">DURATION</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-black">{totalTopics}</p>
                  <p className="text-sm font-black text-black mt-2 uppercase">TOPICS</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum Weeks */}
        <div className="space-y-8 mb-12">
          {curriculum.map((week, weekIdx) => (
            <div key={week.week} className="relative">
              <div className="absolute -right-3 -bottom-3 w-full h-full border-4 border-black" />
              <div className="relative bg-white border-4 border-black p-8">
                {/* Week Header */}
                <div className="mb-8 pb-6 border-b-4 border-black">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-orange-500 border-2 border-black flex items-center justify-center font-black text-white text-lg">
                      {week.week}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-black">{week.title}</h2>
                      <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-black/70">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {week.duration} hours
                        </span>
                        <span>{week.lessons.length} lessons</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lessons */}
                <div className="space-y-4">
                  {week.lessons.map((lesson, lessonIdx) => (
                    <div key={lesson.id} className="bg-gray-50 border-2 border-black p-4 hover:bg-orange-50 transition">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-orange-400 border-2 border-black flex items-center justify-center font-black text-white shrink-0">
                          {lessonIdx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-black text-black">{lesson.title}</h3>
                          {lesson.duration && (
                            <p className="text-sm font-semibold text-black/60 mt-1">
                              ⏱️ {lesson.duration} minutes
                            </p>
                          )}
                          {lesson.topics && lesson.topics.length > 0 && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {lesson.topics.map((topic, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs font-black text-white bg-blue-500 border-2 border-black px-3 py-1"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button className="px-3 py-2 bg-orange-500 text-white font-black border-2 border-black hover:bg-orange-600 transition shrink-0">
                          START HERE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-6">
          {/* Start Learning Button */}
          <div className="relative">
            <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black" />
            <button
              onClick={handleStartLearning}
              disabled={isStarting}
              className="relative w-full bg-orange-500 text-white border-4 border-black py-6 font-black text-lg uppercase hover:bg-orange-600 disabled:bg-gray-400 transition flex items-center justify-center gap-3"
            >
              <Play className="w-6 h-6" />
              {isStarting ? "STARTING..." : "START LEARNING"}
            </button>
          </div>

          {/* Modify Details Button */}
          <div className="relative">
            <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black" />
            <button
              onClick={handleModifyDetails}
              className="relative w-full bg-white text-black border-4 border-black py-6 font-black text-lg uppercase hover:bg-gray-100 transition flex items-center justify-center gap-3"
            >
              <Edit2 className="w-6 h-6" />
              MODIFY DETAILS
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-sm font-semibold text-black/60">
            ✅ Your AI tutor will guide you through each lesson with personalized feedback
          </p>
        </div>
      </div>
    </div>
  )
}
