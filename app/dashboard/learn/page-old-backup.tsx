"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Award,
  BookOpen,
  Brain,
  Clock,
  Code,
  ExternalLink,
  FileText,
  LogOut,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Upload,
  User,
  Video,
  Volume2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { FeedbackPanel } from "@/components/feedback-panel"
import { MiniGameModal } from "@/components/mini-game-modal"
import { EnhancedCurriculumView } from "@/components/enhanced-curriculum-view"

interface StudentProfile {
  id: string
  name?: string
  grade_level?: number
  learning_style?: string
}

interface LessonPlan {
  id: string
  title: string
  topic: string
  duration?: number
  completed?: boolean
  content?: string
}

interface ResourceItem {
  id: string
  title: string
  type?: string
  url: string
  duration?: number
}

interface AssignmentItem {
  id: string
  title: string
  description?: string
  topic?: string
  status: "pending" | "completed" | "in-progress"
  dueDate?: string | null
  score?: number
  miniGames?: Array<{
    id: string
    title: string
    type: string
    instructions: string
    points: number
    questions: Array<{
      question: string
      options?: string[]
      correctAnswer: string
      explanation?: string
      hint?: string
    }>
  }>
  totalPoints?: number
}

interface Message {
  role: "teacher" | "student"
  content: string
  timestamp: Date
  hasAudio?: boolean
}

type SetupPhase = "topic" | "syllabus" | "curriculum" | "learning"

type ConversationTurn = {
  role: "user" | "assistant"
  content: string
}

const POPULAR_TOPICS = ["Mathematics", "Physics", "Chemistry", "Biology", "History", "English"]

export default function UnifiedLearningPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()
  const { toast } = useToast()

  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const [setupPhase, setSetupPhase] = useState<SetupPhase>("topic")
  const [selectedTopic, setSelectedTopic] = useState("")
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null)

  const [lessons, setLessons] = useState<LessonPlan[]>([])
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [inputText, setInputText] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<AssignmentItem | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  const [sessionStart, setSessionStart] = useState<Date | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Handle URL parameters for session continuation
  useEffect(() => {
    const topicParam = searchParams.get("topic")
    const sessionIdParam = searchParams.get("sessionId")
    const isNew = searchParams.get("new") === "true"

    if (topicParam) {
      setSelectedTopic(topicParam)
      
      if (isNew) {
        // New session from /new-session page - skip syllabus page
        setSetupPhase("curriculum")
        
        // Check for pending syllabus in sessionStorage
        const syllabusContent = sessionStorage.getItem("pendingSyllabusContent")
        const syllabusFilename = sessionStorage.getItem("pendingSyllabusFilename")
        
        if (syllabusContent && syllabusFilename) {
          // Create a File object from the stored content
          const blob = new Blob([syllabusContent], { type: "text/plain" })
          const file = new File([blob], syllabusFilename, { type: "text/plain" })
          setSyllabusFile(file)
          
          // Clear from sessionStorage
          sessionStorage.removeItem("pendingSyllabusContent")
          sessionStorage.removeItem("pendingSyllabusFilename")
        }
      } else if (sessionIdParam && student?.id) {
        // Continuing existing session - load from database
        setSessionId(sessionIdParam)
        loadSessionData(sessionIdParam)
      }
    }
  }, [searchParams, student?.id])

  // Function to load session data from database
  const loadSessionData = async (loadSessionId: string) => {
    try {
      const { data: session, error } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("id", loadSessionId)
        .single()

      if (error || !session) {
        console.error("[load-session] Error:", error)
        toast({
          title: "Session not found",
          description: "Unable to load the session. Starting fresh.",
          variant: "destructive",
        })
        return
      }

      // Restore session data
      setSelectedTopic(session.topic || "")
      
      if (session.curriculum_plan) {
        const plan = session.curriculum_plan as any
        setLessons(plan.lessons || [])
        setResources(plan.resources || [])
        setAssignments(plan.assignments || [])
      }
      
      if (session.tutor_messages && Array.isArray(session.tutor_messages) && session.tutor_messages.length > 0) {
        const msgs = session.tutor_messages.map((msg: any) => ({
          role: msg.role === "assistant" ? "teacher" : "student",
          content: msg.content,
          timestamp: new Date(msg.timestamp || Date.now())
        }))
        setMessages(msgs)
        setConversationHistory(session.tutor_messages)
        setSetupPhase("learning")
        
        toast({
          title: "Session restored",
          description: `Continuing your ${session.topic} session`
        })
      } else {
        // No messages yet, show curriculum
        setSetupPhase("curriculum")
      }
    } catch (error) {
      console.error("[load-session] Failed:", error)
      toast({
        title: "Error loading session",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace("/login")
          return
        }

        const { data: profile } = await supabase.from("students").select("*").eq("id", user.id).single<any>()

        if (profile) {
          setStudent(profile as StudentProfile)
          if ((profile as any).last_topic) {
            setSelectedTopic((profile as any).last_topic)
          }
        } else {
          setStudent({ id: user.id, name: user.email ?? "Student" })
        }
      } catch (error) {
        console.error("[dashboard] Failed to load user", error)
        toast({ title: "Unable to load profile", description: "Please sign in again.", variant: "destructive" })
        router.replace("/login")
      } finally {
        setIsBootstrapping(false)
      }
    }

    bootstrap()
  }, [router, supabase, toast])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (setupPhase !== "learning") {
      return
    }

    if (!sessionStart) {
      setSessionStart(new Date())
      setElapsedSeconds(0)
    }

    const interval = window.setInterval(() => {
      if (!sessionStart) return
      setElapsedSeconds(Math.floor((Date.now() - sessionStart.getTime()) / 1000))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [setupPhase, sessionStart])

  useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) {
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
      }
      setIsListening(false)
    }
    recognition.onerror = () => {
      setIsListening(false)
      toast({ title: "Voice input error", description: "Could not capture audio. Please try again.", variant: "destructive" })
    }
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
  }, [toast])

  // Load last session when component mounts
  useEffect(() => {
    if (!student?.id || setupPhase !== "topic") return
    
    const loadLastSession = async () => {
      try {
        const response = await fetch(`/api/session/summary?studentId=${student.id}`)
        if (!response.ok) return
        
        const data = await response.json()
        if (data.hasSession && data.session) {
          const session = data.session
          
          // Ask user if they want to continue
          const shouldContinue = window.confirm(
            `Continue your last session on "${session.topic}"?`
          )
          
          if (shouldContinue) {
            setSelectedTopic(session.topic)
            setSessionId(session.id)
            
            if (session.curriculumPlan) {
              const plan = session.curriculumPlan
              setLessons(plan.lessons || [])
              setResources(plan.resources || [])
              setAssignments(plan.assignments || [])
            }
            
            if (session.conversationHistory && session.conversationHistory.length > 0) {
              const msgs = session.conversationHistory.map((msg: any) => ({
                role: msg.role === "assistant" ? "teacher" : "student",
                content: msg.content,
                timestamp: new Date()
              }))
              setMessages(msgs)
              setConversationHistory(session.conversationHistory)
              setSetupPhase("learning")
              
              toast({ 
                title: "Session restored", 
                description: `Continuing your ${session.topic} session` 
              })
            }
          }
        }
      } catch (error) {
        console.error("[load-session] Failed:", error)
      }
    }
    
    loadLastSession()
  }, [student?.id, setupPhase, toast])

  // Auto-save conversation every 3 minutes
  useEffect(() => {
    if (!sessionId || !student?.id || setupPhase !== "learning") return
    
    const autoSave = async () => {
      try {
        const response = await fetch("/api/session/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.id,
            sessionId,
            conversationHistory,
            topic: selectedTopic,
            metadata: { phase: setupPhase }
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.summary) {
            console.log("[auto-save] Session summary:", data.summary)
            // Optionally show toast
            toast({ 
              title: "Progress saved", 
              description: "Your session has been auto-saved" 
            })
          }
        }
      } catch (error) {
        console.error("[auto-save] Failed:", error)
      }
    }

    const interval = setInterval(autoSave, 3 * 60 * 1000) // Every 3 minutes
    return () => clearInterval(interval)
  }, [sessionId, student?.id, conversationHistory, selectedTopic, setupPhase, toast])

  const progressData = useMemo(() => {
    const totalLessons = lessons.length
    const completedLessons = lessons.filter((lesson) => lesson.completed).length
    const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100)

    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = elapsedSeconds % 60
    const formattedElapsed = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

    return { totalLessons, completedLessons, progressPercent, formattedElapsed }
  }, [lessons, elapsedSeconds])

  const speakMessage = (text: string) => {
    if (typeof window === "undefined" || !text) {
      return
    }

    const synth = window.speechSynthesis
    if (!synth) {
      toast({
        title: "Voice unavailable",
        description: "Speech synthesis is not supported in this browser.",
        variant: "destructive",
      })
      return
    }

    try {
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.pitch = 1
      utterance.rate = 1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      synth.speak(utterance)
    } catch (error) {
      console.error("[voice] speech synthesis error", error)
      setIsSpeaking(false)
    }
  }

  const beginLearningSession = (lessonPlan: LessonPlan[], resourceList: ResourceItem[], assignmentList: AssignmentItem[], newSessionId?: string | null) => {
    setLessons(lessonPlan)
    setResources(resourceList)
    setAssignments(assignmentList)
    setSessionId(newSessionId ?? null)
    setCurrentLessonIndex(0)
    setSetupPhase("learning")
    setConversationHistory([])

    const firstLesson = lessonPlan[0]
    const welcomeText = `Hello ${student?.name ?? "there"}! Today we will explore ${selectedTopic || firstLesson?.topic || "our chosen topic"}. Let me walk you through ${firstLesson?.title || "the first concept"}.`

    const welcomeMessage: Message = {
      role: "teacher",
      content: welcomeText,
      timestamp: new Date(),
      hasAudio: true,
    }

    setMessages([welcomeMessage])
    setConversationHistory([{ role: "assistant", content: welcomeText }])
    setSessionStart(new Date())
    setElapsedSeconds(0)
    speakMessage(welcomeText)
  }

  const handleTopicContinue = () => {
    if (!selectedTopic.trim()) {
      toast({ title: "Choose a topic", description: "Please enter or select a topic to teach." })
      return
    }
    setSetupPhase("syllabus")
  }

  const handleCurriculumRequest = async () => {
    if (!student) return

    setIsProcessing(true)

    try {
      let syllabusText = undefined
      
      // Try to get syllabus from file
      if (syllabusFile) {
        syllabusText = await syllabusFile.text()
      }

      const response = await fetch("/api/agents/generate-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          topic: selectedTopic,
          gradeLevel: student.grade_level,
          learningStyle: student.learning_style,
          syllabus: syllabusText,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const payload = await response.json()

      if (!payload.success) {
        throw new Error(payload.error || "Failed to generate curriculum")
      }

      const lessonPlan: LessonPlan[] = Array.isArray(payload.lessons) ? payload.lessons : []
      const resourceList: ResourceItem[] = Array.isArray(payload.resources) ? payload.resources : []
      const assignmentList: AssignmentItem[] = Array.isArray(payload.assignments)
        ? payload.assignments.map((item: any) => ({
            id: item.id ?? `assignment-${Math.random().toString(36).slice(2)}`,
            title: item.title ?? "Practice assignment",
            description: item.description,
            topic: item.topic ?? selectedTopic,
            status: "pending",
            dueDate: item.dueDate ?? item.due_date ?? null,
          }))
        : []

      if (lessonPlan.length === 0) {
        throw new Error("Curriculum agent did not return lessons")
      }

      setLessons(lessonPlan)
      setResources(resourceList)
      setAssignments(assignmentList)
      setSessionId(payload.sessionId ?? null)
      setSetupPhase("curriculum")

      toast({ title: "Curriculum ready", description: "Review the lessons and start the session when you're ready." })
    } catch (error) {
      console.error("[curriculum] generation error", error)
      toast({
        title: "Curriculum generation failed",
        description: error instanceof Error ? error.message : "The curriculum agent was unable to respond.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Auto-generate curriculum when coming from new-session page
  useEffect(() => {
    if (student && selectedTopic && setupPhase === "curriculum" && lessons.length === 0 && !isProcessing) {
      handleCurriculumRequest()
    }
  }, [student, selectedTopic, setupPhase])

  const handleSendMessage = async () => {
    if (!student || !inputText.trim()) return

    const trimmed = inputText.trim()
    const userMessage: Message = {
      role: "student",
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setConversationHistory((prev) => [...prev, { role: "user", content: trimmed }])
    setInputText("")
    setIsProcessing(true)

    try {
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          message: trimmed,
          topic: lessons[currentLessonIndex]?.topic || selectedTopic,
          gradeLevel: student.grade_level,
          conversationHistory: [...conversationHistory, { role: "user", content: trimmed }],
        }),
      })

      if (!response.ok) {
        throw new Error(`Tutor responded with status ${response.status}`)
      }

      const payload = await response.json()

      if (!payload.success || !payload.response) {
        throw new Error(payload.error || "The tutor was unable to respond")
      }

      const teacherMessage: Message = {
        role: "teacher",
        content: payload.response,
        timestamp: new Date(),
        hasAudio: true,
      }

      setMessages((prev) => [...prev, teacherMessage])
      setConversationHistory((prev) => [...prev, { role: "assistant", content: payload.response }])
      speakMessage(payload.response)

      if (Array.isArray(payload.resources)) {
        setResources((prev) => {
          const resourceMap = new Map(prev.map((r) => [r.id, r]))
          payload.resources.forEach((item: ResourceItem) => {
            if (item && item.id && !resourceMap.has(item.id)) {
              resourceMap.set(item.id, item)
            }
          })
          return Array.from(resourceMap.values())
        })
      }

      const topicsCovered: string[] = Array.isArray(payload.topicsCovered) ? payload.topicsCovered.filter(Boolean) : []

      if (payload.readyForAssessment && topicsCovered.length > 0) {
        await createAssignment(topicsCovered)
      }
    } catch (error) {
      console.error("[tutor] message error", error)
      toast({
        title: "Tutor unavailable",
        description: error instanceof Error ? error.message : "Failed to reach the tutor agent.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const createAssignment = async (topics: string[]) => {
    if (!student) return

    try {
      const response = await fetch("/api/assignment/generate-adaptive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          topic: topics[0] ?? selectedTopic,
          gradeLevel: student.grade_level,
        }),
      })

      if (!response.ok) {
        throw new Error(`Assignment generator returned ${response.status}`)
      }

      const payload = await response.json()

      if (!payload.success || !payload.assignment) {
        throw new Error(payload.error || "Assignment agent could not generate a task")
      }

      const assignmentData = payload.assignment
      const assignment: AssignmentItem = {
        id: assignmentData.id ?? `assignment-${Date.now()}`,
        title: assignmentData.title ?? `Practice for ${topics[0] ?? selectedTopic}`,
        description: assignmentData.description,
        topic: assignmentData.topic ?? topics[0] ?? selectedTopic,
        status: "pending",
        dueDate: null,
        score: undefined,
        miniGames: assignmentData.miniGames || [],
        totalPoints: assignmentData.totalPoints || 100,
      }

      setAssignments((prev) => [...prev, assignment])
      
      toast({ 
        title: "New adaptive assignment ready", 
        description: `${assignmentData.miniGames?.length || 0} mini-games created based on your progress`,
        duration: 5000
      })
    } catch (error) {
      console.error("[assignment] generation error", error)
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Could not generate assignment.",
        variant: "destructive",
      })
    }
  }

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      toast({ title: "Voice unavailable", description: "Speech recognition is not supported in this browser." })
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error("[voice] recognition error", error)
        toast({ title: "Unable to start microphone", description: "Please allow microphone access and try again." })
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (isBootstrapping) {
    return (
  <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-purple-400 animate-pulse mx-auto mb-4" />
          <p className="text-white">Preparing your intelligent classroom...</p>
        </div>
      </div>
    )
  }

  if (setupPhase === "topic") {
    return (
  <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-purple-500/30 bg-slate-900/90 backdrop-blur">
          <CardHeader className="text-center space-y-3">
            <Brain className="w-16 h-16 text-purple-400 mx-auto animate-pulse" />
            <CardTitle className="text-3xl text-white">Welcome back{student?.name ? `, ${student.name}` : ""}!</CardTitle>
            <p className="text-gray-400">Let me know what you'd like to teach or explore with your student today.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-white font-medium">Subject or topic focus</label>
              <Input
                value={selectedTopic}
                onChange={(event) => setSelectedTopic(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleTopicContinue()}
                placeholder="e.g. Fractions for Grade 6"
                className="bg-slate-800/50 border-purple-500/30 text-white text-lg h-12"
              />
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Quick picks</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TOPICS.map((topic) => (
                  <Button
                    key={topic}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTopic(topic)}
                    className="border-purple-500/30 hover:bg-purple-500/20"
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleTopicContinue}
              disabled={!selectedTopic.trim()}
              className="w-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg h-12"
            >
              Continue
              <Sparkles className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (setupPhase === "curriculum") {
    return (
      <EnhancedCurriculumView
        topic={selectedTopic}
        lessons={lessons}
        resources={resources}
        assignments={assignments}
        sessionId={sessionId}
        onStartSession={() => beginLearningSession(lessons, resources, assignments, sessionId)}
        onCurriculumUpdate={(updated) => {
          setLessons(updated.lessons)
          setResources(updated.resources)
          setAssignments(updated.assignments)
        }}
      />
    )
  }

  const currentLesson = lessons[currentLessonIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      <header className="bg-slate-900/60 backdrop-blur border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/overview")}
              className="text-gray-400 hover:text-white mr-2"
            >
              ← Back
            </Button>
            <Brain className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-sm text-gray-300">Active topic</p>
              <h1 className="text-xl font-semibold">{selectedTopic || currentLesson?.topic || "Live tutor session"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-500/40 text-white"
              onClick={() => toast({ title: "Progress saved", description: "Session progress auto-saves every few minutes." })}
            >
              Session ID: {sessionId ? sessionId.slice(0, 6) : "offline"}
            </Button>
            <Button variant="outline" size="sm" className="border-purple-500/40 text-white" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
        <div className="flex gap-6 flex-1 flex-col lg:flex-row">
          <aside className="w-full lg:w-64 flex flex-col gap-4">
            <Card className="border-purple-500/20 bg-slate-900/70 text-white">
              <CardHeader>
                <CardTitle className="text-base">Resources & progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-300 mb-2">Live resources</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {resources.length === 0 && <p className="text-xs text-gray-500">Resources will appear as the tutor introduces them.</p>}
                    {resources.map((resource) => (
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
                              {resource.type === "video" && <Video className="w-3 h-3" />}
                              {resource.type === "article" && <FileText className="w-3 h-3" />}
                              {resource.type === "documentation" && <Code className="w-3 h-3" />}
                              {!["video", "article", "documentation"].includes(resource.type || "") && <BookOpen className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white group-hover:text-purple-300 transition line-clamp-2">{resource.title}</p>
                              <p className="text-xs text-gray-400 uppercase mt-0.5">{resource.type || "resource"}</p>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-800/60 p-3">
                  <p className="text-sm text-gray-300">Lesson completion</p>
                  <p className="text-2xl font-bold text-white">{progressData.progressPercent}%</p>
                  <p className="text-xs text-gray-400">{progressData.completedLessons} of {progressData.totalLessons} lessons complete</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-500/20 bg-slate-900/70 text-white">
              <CardHeader>
                <CardTitle className="text-base">Session stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-slate-800/60 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Live session time</p>
                    <p className="text-lg font-semibold">{progressData.formattedElapsed}</p>
                  </div>
                  <Clock className="w-6 h-6 text-purple-400" />
                </div>
                <div className="rounded-lg bg-slate-800/60 p-3">
                  <p className="text-xs text-gray-400 uppercase">Current focus</p>
                  <p className="text-sm font-medium text-white">{currentLesson?.title || "Engage with the tutor"}</p>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="flex-1 flex flex-col gap-4 min-h-[60vh]">
            <Card className="border-purple-500/20 bg-slate-900/70 text-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Tutor board</CardTitle>
                  <p className="text-sm text-gray-400">{currentLesson?.title ?? "Interactive teaching"}</p>
                </div>
                <div className="flex gap-2">
                  {lessons.map((lesson, index) => (
                    <Button
                      key={lesson.id}
                      size="sm"
                      variant={index === currentLessonIndex ? "default" : "outline"}
                      className={`text-xs ${index === currentLessonIndex ? "bg-purple-600 border-transparent" : "border-purple-500/40 text-white"}`}
                      onClick={() => setCurrentLessonIndex(index)}
                    >
                      L{index + 1}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {currentLesson?.content ? (
                  <>
                    <div className="rounded-lg bg-slate-800/60 p-4 text-sm text-gray-200 whitespace-pre-line">
                      {currentLesson.content}
                    </div>
                    
                    {/* NEW: Media Resources Section */}
                    {resources.some(r => r.type === 'image' || r.type === 'diagram' || r.type === 'video') && (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs text-gray-400 uppercase font-semibold">Visual Aids</p>
                        <div className="grid grid-cols-2 gap-3">
                          {resources
                            .filter(r => r.type === 'image' || r.type === 'diagram')
                            .slice(0, 4)
                            .map(resource => (
                              <div key={resource.id} className="relative group">
                                <img 
                                  src={resource.url} 
                                  alt={resource.title}
                                  className="w-full h-32 object-cover rounded-lg border border-purple-500/30"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                                  <p className="text-white text-xs text-center px-2">{resource.title}</p>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-300">The tutor will introduce the lesson plan as the conversation begins.</p>
                )}
              </CardContent>
            </Card>

            <div className="flex-1 rounded-xl bg-slate-900/70 border border-purple-500/20 p-4 overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex gap-3 ${message.role === "student" ? "justify-end" : "justify-start"}`}>
                      {message.role === "teacher" && (
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-2xl rounded-2xl p-4 ${
                          message.role === "teacher"
                            ? "bg-slate-800/60 border border-purple-500/30"
                            : "bg-linear-to-r from-purple-600 to-pink-600"
                        } text-white`}
                      >
                        <p className="whitespace-pre-line text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-300">
                          <span>{message.timestamp.toLocaleTimeString()}</span>
                          {message.hasAudio && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-gray-200" onClick={() => speakMessage(message.content)}>
                              <Volume2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {message.role === "student" && (
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isSpeaking && (
                    <div className="flex items-center gap-2 text-purple-300">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span className="text-xs">Tutor is speaking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="mt-4 border-t border-purple-500/10 pt-4">
                  <Textarea
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    placeholder="Ask the tutor or respond to the prompt..."
                    rows={3}
                    className="bg-slate-800/60 border-purple-500/20 text-white"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className={`border-purple-500/30 text-white ${isListening ? "bg-red-500/20" : ""}`}
                        onClick={handleVoiceToggle}
                      >
                        {isListening ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
                      </Button>
                      {isListening && (
                        <Badge variant="outline" className="text-red-400 border-red-400">
                          <span className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-ping" /> Recording
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() || isProcessing}
                      className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isProcessing ? "Thinking..." : <><Send className="w-4 h-4 mr-2" /> Send</>}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="w-full lg:w-72 flex flex-col gap-4">
            <Card className="border-purple-500/20 bg-slate-900/70 text-white">
              <CardHeader>
                <CardTitle className="text-base">Assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {assignments.length === 0 && <p className="text-sm text-gray-400">Assignments appear here after each lesson to keep learners engaged.</p>}
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-lg bg-slate-800/60 p-3 border border-purple-500/20">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{assignment.title}</p>
                        {assignment.description && <p className="text-xs text-gray-400 mt-1">{assignment.description}</p>}
                      </div>
                      <Badge variant={assignment.status === "completed" ? "default" : "secondary"}>{assignment.status}</Badge>
                    </div>
                    {assignment.dueDate && (
                      <p className="text-xs text-gray-500 mt-2">Due {new Date(assignment.dueDate).toLocaleDateString()}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      {assignment.status !== "completed" && (
                        <Button
                          size="sm"
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          onClick={() =>
                            setAssignments((prev) =>
                              prev.map((item) =>
                                item.id === assignment.id ? { ...item, status: "completed", score: item.score ?? 100 } : item,
                              ),
                            )
                          }
                        >
                          Mark complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-purple-500/30 text-white"
                        onClick={() => setActiveAssignment(assignment)}
                      >
                        Launch
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <FeedbackPanel 
              studentId={student?.id || ""} 
              sessionId={sessionId || undefined}
              autoRefresh={true}
              refreshInterval={120000}
            />
          </aside>
        </div>
      </main>

      <MiniGameModal 
        isOpen={!!activeAssignment}
        onClose={() => setActiveAssignment(null)}
        assignment={activeAssignment}
      />
    </div>
  )
}
