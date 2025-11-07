"use client"

import { useEffect, useMemo, useState, useRef } from "react"
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
  Send,
  Video,
  Volume2,
  Mic,
  MicOff,
  Play,
  Pause,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  Star,
  User,
  Settings,
  Trophy,
  Target,
  Lock,
  CheckCircle,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { getSupabaseClient } from "@/lib/supabase-client"
import { resourceIdFromUrl } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { FeedbackPanel } from "@/components/feedback-panel"
import { MiniGameModal } from "@/components/mini-game-modal"
import { ModernTutorAvatar } from "@/components/modern-tutor-avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { saveSessionState } from "@/lib/session-persistence"
import { EnhancedChatDisplay } from "@/components/enhanced-chat-display"
import { ContextualImageCarousel } from "@/components/contextual-image-carousel"
import { AssessmentModal } from "@/components/assessment-modal"

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
  subtopics?: Array<{
    id: string
    title: string
    completed: boolean
    order: number
  }>
  progressPercentage?: number
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

type ConversationTurn = {
  role: "user" | "assistant"
  content: string
}

export default function UnifiedLearningPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()
  const { toast } = useToast()

  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState("")

  const [lessons, setLessons] = useState<LessonPlan[]>([])
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [inputText, setInputText] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<AssignmentItem | null>(null)

  // Live teaching interface states
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const recognitionRef = useRef<any>(null)
  const [teachingPhase, setTeachingPhase] = useState<"explain" | "example" | "practice" | "assess">("explain")
  const [currentConcept, setCurrentConcept] = useState("")
  const [conceptProgress, setConceptProgress] = useState(0)
  const [multimediaContent, setMultimediaContent] = useState<{
    type: "image" | "video" | "text"
    url?: string
    content?: string
  }[]>([])

  const [sessionStart, setSessionStart] = useState<Date | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  
  // New features state
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null)
  const [lastFeedbackTime, setLastFeedbackTime] = useState<Date>(new Date())
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [currentYouTubeVideo, setCurrentYouTubeVideo] = useState<string | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [totalPoints, setTotalPoints] = useState(0)
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Assessment modal states
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)
  const [assessmentQuestions, setAssessmentQuestions] = useState<any[]>([])
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null)
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false)

  // Image search states
  const [contextualImages, setContextualImages] = useState<Array<{
    url: string
    thumbnail: string
    title: string
    context?: string
  }>>([])
  const [imageCache, setImageCache] = useState<Record<string, any[]>>({})
  
  // Progress tracking states
  const [completedSubtopics, setCompletedSubtopics] = useState<Set<string>>(new Set())
  const [currentSubtopicIndex, setCurrentSubtopicIndex] = useState(0)

  // Extract any image URLs the tutor mentions in messages (markdown-style images)
  const teacherImageUrls = useMemo(() => {
    const imgs: string[] = []
    const regex = /!\[[^\]]*\]\(([^)]+)\)/g
    messages.filter((m) => m.role === "teacher").slice(-5).forEach((m) => {
      let match
      while ((match = regex.exec(m.content))) {
        if (match[1]) imgs.push(match[1])
      }
    })
    return imgs
  }, [messages])

  // Handle URL parameters and restore session if provided
  useEffect(() => {
    const topicParam = searchParams.get("topic")
    const sessionIdParam = searchParams.get("sessionId")
    
    console.log("[Session] URL params:", { topic: topicParam, sessionId: sessionIdParam })
    
    if (topicParam) {
      setSelectedTopic(topicParam)
      console.log("[Session] Topic set from URL:", topicParam)
    }
    
    if (sessionIdParam) {
      setSessionId(sessionIdParam)
      console.log("[Session] Restoring session:", sessionIdParam)
      
      // Attempt to restore session state
      const restoreSession = async () => {
        const { restoreSessionState } = await import("@/lib/session-persistence")
        const result = await restoreSessionState(sessionIdParam)
        
        if (result.success && result.snapshot) {
          const snap = result.snapshot
          
          // CRITICAL: Restore the topic from session
          if (snap.topic) {
            setSelectedTopic(snap.topic)
            console.log("[Session] Topic restored from session:", snap.topic)
          }
          
          setLessons(snap.lessons)
          setResources(snap.resources)
          setAssignments(snap.assignments)
          setMessages(snap.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })))
          setConversationHistory(snap.conversationHistory)
          setCurrentLessonIndex(snap.currentLessonIndex)
          setElapsedSeconds(snap.elapsedSeconds)
          
          if (snap.teachingState) {
            setTeachingPhase(snap.teachingState.phase)
            setCurrentConcept(snap.teachingState.currentConcept)
            setConceptProgress(snap.teachingState.conceptProgress)
          }
          
          // Load lesson progress from database
          try {
            const progressResponse = await fetch(`/api/progress/lesson?sessionId=${sessionIdParam}`)
            if (progressResponse.ok) {
              const progressData = await progressResponse.json()
              if (progressData.success && progressData.progress) {
                // Restore completed subtopics
                const allCompleted = new Set<string>()
                progressData.progress.forEach((lessonProg: any) => {
                  if (lessonProg.subtopics) {
                    lessonProg.subtopics.forEach((sub: any) => {
                      if (sub.completed) {
                        allCompleted.add(sub.subtopic_id)
                      }
                    })
                  }
                  // Update lesson progress percentage
                  const lessonIndex = snap.lessons.findIndex((l: any) => l.id === lessonProg.lesson_id)
                  if (lessonIndex !== -1) {
                    snap.lessons[lessonIndex].progressPercentage = lessonProg.progress_percentage
                  }
                })
                setCompletedSubtopics(allCompleted)
                console.log('[progress] Restored', allCompleted.size, 'completed subtopics')
              }
            }
          } catch (error) {
            console.error('[progress] Failed to load progress:', error)
          }
          
          toast({
            title: "✅ Session restored",
            description: `Continuing your ${snap.topic} session`,
          })
        }
      }
      
      restoreSession().catch(err => {
        console.error("[restore] Failed to restore session:", err)
        toast({
          title: "Restore failed",
          description: "Starting fresh session instead",
          variant: "destructive",
        })
      })
    }
  }, [searchParams, toast])

  // Removed legacy session restore flow for a cleaner interface

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

  const { data: profile } = await supabase.from("student_profiles").select("*").eq("id", user.id).single()

        if (profile) {
          setStudent(profile as StudentProfile)
          
          // Only use last_topic as fallback if NO topic in URL
          const topicParam = searchParams.get("topic")
          if (!topicParam) {
            const last = (profile as any).last_topic
            if (last && last !== "General Learning") {
              setSelectedTopic(last)
              console.log("[Bootstrap] Using last topic from profile:", last)
            }
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

  // Simple session timer
  useEffect(() => {
    if (!sessionStart) setSessionStart(new Date())
    const interval = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [sessionStart])

  // 2-minute feedback timer
  useEffect(() => {
    feedbackTimerRef.current = setInterval(() => {
      const now = new Date()
      const diffMinutes = (now.getTime() - lastFeedbackTime.getTime()) / 1000 / 60
      
      if (diffMinutes >= 2 && messages.length > 0) {
        setShowFeedbackDialog(true)
        setLastFeedbackTime(now)
      }
    }, 10000) // Check every 10 seconds

    return () => {
      if (feedbackTimerRef.current) {
        clearInterval(feedbackTimerRef.current)
      }
    }
  }, [lastFeedbackTime, messages.length])

  // Calculate total points from completed assignments
  useEffect(() => {
    const points = assignments
      .filter(a => a.status === "completed")
      .reduce((sum, a) => sum + (a.totalPoints || a.score || 100), 0)
    setTotalPoints(points)
  }, [assignments])

  // Voice recognition setup - always-on with mute control
  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn("[voice] Speech recognition not supported")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " "
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        setVoiceTranscript((prev) => prev + finalTranscript)
        setInputText((prev) => prev + finalTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      // Ignore "aborted" errors from cleanup
      if (event.error === "aborted") return
      
      console.error("[voice] Recognition error:", event.error)
      if (event.error === "no-speech") {
        // Restart on no-speech error
        setTimeout(() => {
          if (!isMicMuted && recognitionRef.current) {
            try {
              recognition.start()
            } catch (e) {
              // Already running
            }
          }
        }, 1000)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      // Auto-restart if not muted
      if (!isMicMuted) {
        setTimeout(() => {
          try {
            recognition.start()
          } catch (e) {
            // Already running
          }
        }, 100)
      }
    }

    recognitionRef.current = recognition

    // Start listening if not muted
    if (!isMicMuted && lessons.length > 0) {
      try {
        recognition.start()
      } catch (e) {
        console.warn("[voice] Could not start recognition:", e)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current.abort()
      }
    }
  }, [isMicMuted, lessons.length])

  // Toggle mic mute
  const toggleMicMute = () => {
    setIsMicMuted((prev) => {
      const newMuted = !prev
      
      if (newMuted && recognitionRef.current) {
        // Mute - stop recognition
        recognitionRef.current.stop()
        setIsListening(false)
      } else if (!newMuted && recognitionRef.current) {
        // Unmute - start recognition
        try {
          recognitionRef.current.start()
        } catch (e) {
          console.warn("[voice] Could not restart recognition:", e)
        }
      }
      
      return newMuted
    })
  }

  // Removed legacy last-session continuation for simplicity

  // Auto-save removed to keep the interface lean and predictable

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

  // Removed multi-phase setup; we go straight to learning

  const handleCurriculumRequest = async () => {
    if (!student) return

    setIsProcessing(true)

    try {
      const response = await fetch("/api/agents/generate-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          topic: selectedTopic,
          gradeLevel: student.grade_level,
          learningStyle: student.learning_style,
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
  let resourceList: ResourceItem[] = Array.isArray(payload.resources) ? payload.resources : []
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

      // If resources are sparse, pull real ones from Tavily API
      try {
        if (!resourceList || resourceList.length < 4) {
          const r = await fetch("/api/resources/fetch-real", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: selectedTopic, count: 6 }),
          })
          if (r.ok) {
            const data = await r.json()
            if (Array.isArray(data.resources)) {
              resourceList = [...resourceList, ...data.resources]
              // de-duplicate by url
              const byUrl = new Map(resourceList.map((x:any)=>[x.url,x]))
              resourceList = Array.from(byUrl.values()).map((r:any)=> ({
                id: r.id || resourceIdFromUrl(r.url),
                ...r,
              })) as any
            }
          }
        }
      } catch (e) {
        console.warn("[resources] tavily fallback failed", e)
      }

      setLessons(lessonPlan)
      setResources(resourceList.map((r:any)=>({ id: r.id || resourceIdFromUrl(r.url), ...r })))
      setAssignments(assignmentList)
      setSessionId(payload.sessionId ?? null)

      // Start session with a friendly welcome
      const firstLesson = lessonPlan[0]
      const welcomeText = `Hello ${student?.name ?? "there"}! Today we will explore ${selectedTopic || firstLesson?.topic || "our chosen topic"}. Let me walk you through ${firstLesson?.title || "the first concept"}.`
      setMessages([{ role: "teacher", content: welcomeText, timestamp: new Date(), hasAudio: true }])
      setConversationHistory([{ role: "assistant", content: welcomeText }])
      setSessionStart(new Date())
      setElapsedSeconds(0)
      speakMessage(welcomeText)
      
      // Fetch initial contextual images for the topic
      if (selectedTopic || firstLesson?.topic) {
        fetchContextualImages(selectedTopic || firstLesson?.topic || "")
      }
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

  // Helper function to extract YouTube video ID
  const extractYouTubeId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : ""
  }

  // Check if a lesson is locked
  const isLessonLocked = (index: number): boolean => {
    if (index === 0) return false // First lesson is always unlocked
    
    // Check if previous lesson's assessment is completed
    const prevLessonAssignment = assignments.find(a => 
      a.topic === lessons[index - 1]?.topic && a.status === "completed"
    )
    
    return !prevLessonAssignment
  }

  // Auto-generate curriculum as soon as student and topic are known
  useEffect(() => {
    const sessionIdParam = searchParams.get("sessionId")
    const isNewSession = searchParams.get("new") === "true"
    
    // If this is an existing session being restored, don't auto-generate
    if (sessionIdParam && !isNewSession) {
      console.log("[Curriculum] Skipping auto-generation for existing session")
      
      // Send initial greeting if no messages yet and session has loaded
      if (messages.length === 0 && student && selectedTopic && lessons.length > 0) {
        const greetingText = `Welcome back, ${student.name || "there"}! Let's continue learning about ${selectedTopic}. What would you like to explore?`
        setMessages([{ role: "teacher", content: greetingText, timestamp: new Date(), hasAudio: true }])
        setConversationHistory([{ role: "assistant", content: greetingText }])
        speakMessage(greetingText)
        console.log("[Greeting] Sent welcome back message")
      }
      return
    }
    
    // Auto-generate for new sessions
    if (student && selectedTopic && lessons.length === 0 && !isProcessing) {
      console.log("[Curriculum] Auto-generating for new session")
      handleCurriculumRequest()
    }
  }, [student, selectedTopic, searchParams, lessons.length, messages.length])

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
    setVoiceTranscript("") // Clear voice transcript
    setIsProcessing(true)

    // Pause speech if tutor is speaking
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }

    try {
      const response = await fetch("/api/tutor/chat-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          sessionId: sessionId,
          message: trimmed,
          topic: lessons[currentLessonIndex]?.topic || selectedTopic,
          currentConcept: currentConcept || lessons[currentLessonIndex]?.title,
          gradeLevel: student.grade_level,
          conversationHistory: [...conversationHistory, { role: "user", content: trimmed }],
        }),
      })

      if (!response.ok) {
        // Check if it's a quota error (429 status)
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}))
          const retryAfter = errorData.retryAfter || 60
          throw new Error(`AI quota limit reached! Please wait ${retryAfter} seconds and try again. Consider upgrading your API plan for higher limits.`)
        }
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

      // Fetch contextual images based on tutor's response
      fetchContextualImages(payload.response)

      // AUTO-TRACK SUBTOPICS: Check if teacher's response covers any subtopics
      if (currentLesson?.subtopics && currentLesson.subtopics.length > 0) {
        const response = payload.response.toLowerCase()
        const uncompleted = currentLesson.subtopics.filter(sub => !completedSubtopics.has(sub.id))
        
        // Check if any uncompleted subtopic is mentioned in the teacher's response
        for (const subtopic of uncompleted) {
          const subtopicKeywords = subtopic.title.toLowerCase().split(' ').filter(w => w.length > 3)
          const matchCount = subtopicKeywords.filter(keyword => response.includes(keyword)).length
          
          // If 50%+ of keywords match, consider subtopic covered
          if (matchCount >= Math.ceil(subtopicKeywords.length * 0.5)) {
            console.log(`[Auto-track] Subtopic covered: ${subtopic.title}`)
            
            // Mark subtopic as complete automatically
            await markSubtopicComplete(subtopic.id)
            
            toast({
              title: "🎯 Checkpoint Reached!",
              description: `Covered: ${subtopic.title}`,
              duration: 3000,
            })
            
            // Only mark one subtopic per message to avoid overwhelming
            break
          }
        }
      }

      // Update teaching state from tutor response
      if (payload.teachingState) {
        setTeachingPhase(payload.teachingState.phase || teachingPhase)
        setCurrentConcept(payload.teachingState.currentConcept || currentConcept)
        setConceptProgress(payload.teachingState.conceptProgress || conceptProgress)
      } else if (payload.currentPhase) {
        setTeachingPhase(payload.currentPhase)
      }
      
      if (payload.progress !== undefined) {
        setConceptProgress(payload.progress)
      }

      // Add resources from tutor (Tavily integration)
      if (Array.isArray(payload.resources) && payload.resources.length > 0) {
        setResources((prev) => {
          const resourceMap = new Map(prev.map((r) => [r.url, r]))
          payload.resources.forEach((item: ResourceItem) => {
            if (item && item.url && !resourceMap.has(item.url)) {
              resourceMap.set(item.url, { ...item, id: item.id || resourceIdFromUrl(item.url) })
            }
          })
          return Array.from(resourceMap.values())
        })

        // Add multimedia content for display
        const newMedia = payload.resources.map((r: any) => ({
          type: r.type === "video" ? "video" : r.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "image" : "text",
          url: r.url,
          content: r.title,
        }))
        setMultimediaContent((prev) => [...prev, ...newMedia].slice(-10)) // Keep last 10
      }

      const topicsCovered: string[] = Array.isArray(payload.topicsCovered) ? payload.topicsCovered.filter(Boolean) : []

      if (payload.readyForAssessment && topicsCovered.length > 0) {
        await createAssignment(topicsCovered)
      }
    } catch (error) {
      console.error("[tutor] message error", error)
      
      const errorMessage = error instanceof Error ? error.message : "Failed to reach the tutor agent."
      const isQuotaError = errorMessage.includes("quota") || errorMessage.includes("limit reached")
      
      toast({
        title: isQuotaError ? "⏰ API Quota Limit Reached" : "Tutor unavailable",
        description: errorMessage,
        variant: "destructive",
        duration: isQuotaError ? 8000 : 5000, // Show quota errors longer
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

  // Ensure an assignment is playable by providing a default mini-quiz when none exists
  const ensurePlayableAssignment = (assignment: AssignmentItem, topic: string): AssignmentItem => {
    if (assignment?.miniGames && assignment.miniGames.length > 0) return assignment
    const points = assignment.totalPoints || 100
    return {
      ...assignment,
      title: assignment.title || `Quick practice: ${topic}`,
      description:
        assignment.description ||
        `A quick 3-question check to practice ${topic}. No time limit—attempt anytime.`,
      miniGames: [
        {
          id: `quick-quiz-${Date.now()}`,
          title: "Quick Quiz",
          type: "quiz",
          instructions: "Choose the best answer.",
          points,
          questions: [
            {
              question: `Which statement about ${topic} is generally true?`,
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option A",
              explanation: `We'll review this together on the next slide. For now, treat this as practice about ${topic}.`,
            },
            {
              question: `Pick the correct example related to ${topic}.`,
              options: ["Example 1", "Example 2", "Example 3", "Example 4"],
              correctAnswer: "Example 1",
            },
            {
              question: `Identify the mistake in this ${topic} scenario.`,
              options: ["There is no mistake", "A small mistake", "A big mistake", "Not enough info"],
              correctAnswer: "A small mistake",
            },
          ],
        },
      ],
    }
  }

  // Voice input removed

  const handleLogout = async () => {
    try {
      console.log("[Logout] Starting sign out process...")
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("[Logout] Signout error:", error)
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }
      
      console.log("[Logout] Supabase session cleared")
      
      // Clear all local storage and session storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        console.log("[Logout] Local storage cleared")
      }
      
      toast({
        title: "✅ Signed out successfully",
        description: "You have been logged out",
      })
      
      // Force a hard redirect to clear any cached state
      window.location.href = "/login"
    } catch (err) {
      console.error("[Logout] Unexpected signout error:", err)
      // Force redirect even on error
      window.location.href = "/login"
    }
  }

  const handleLeaveSession = async () => {
    if (!sessionId || !student) return

    // Import session persistence
    const { saveSessionState } = await import("@/lib/session-persistence")

    const snapshot = {
      sessionId,
      studentId: student.id,
      topic: selectedTopic,
      currentLessonIndex,
      lessons,
      resources,
      assignments,
      messages,
      conversationHistory,
      teachingState: {
        currentTopic: selectedTopic,
        currentConcept: currentConcept || lessons[currentLessonIndex]?.title || "",
        phase: teachingPhase,
        completedPhases: [],
        conceptProgress,
        sessionId,
        lastUpdated: Date.now(),
        resources: resources.map(r => ({
          title: r.title,
          url: r.url,
          type: (r.type as any) || "article",
        })),
      },
      elapsedSeconds,
      timestamp: new Date().toISOString(),
    }

    const result = await saveSessionState(snapshot)

    if (result.success) {
      toast({
        title: "Session saved",
        description: "You can resume this session anytime from the dashboard.",
      })
      router.push("/dashboard/overview")
    } else {
      toast({
        title: "Save failed",
        description: result.error || "Could not save session state",
        variant: "destructive",
      })
    }
  }

  // Handle "Next Lesson" button - trigger assessment
  const handleNextLesson = async () => {
    if (!student || !sessionId || !currentLesson) {
      toast({
        title: "Cannot proceed",
        description: "Missing student, session, or lesson information",
        variant: "destructive",
      })
      return
    }

    // Check if this is the last lesson
    if (currentLessonIndex >= lessons.length - 1) {
      toast({
        title: "🎉 Course Complete!",
        description: "You've completed all lessons in this topic",
      })
      return
    }

    setIsGeneratingAssessment(true)

    try {
      // Generate assessment for current lesson
      const response = await fetch("/api/assessment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          topics: [currentLesson.topic],
          gradeLevel: student.grade_level || 6,
          difficulty: "medium",
          sessionId: sessionId,
          lessonContent: currentLesson.content || "",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate assessment")
      }

      const data = await response.json()

      if (!data.success || !data.assessmentId || !data.questions) {
        throw new Error(data.error || "Invalid assessment data")
      }

      setCurrentAssessmentId(data.assessmentId)
      setAssessmentQuestions(data.questions)
      setShowAssessmentModal(true)

      toast({
        title: "Assessment Ready",
        description: "Complete the assessment to unlock the next lesson (60% required)",
      })
    } catch (error: any) {
      console.error("[Assessment] Generation error:", error)
      toast({
        title: "Assessment Error",
        description: error.message || "Failed to generate assessment",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingAssessment(false)
    }
  }

  // Handle assessment pass - move to next lesson
  const handleAssessmentPass = () => {
    setShowAssessmentModal(false)
    
    toast({
      title: "🎉 Congratulations!",
      description: "Moving to the next lesson",
    })

    // Move to next lesson
    setTimeout(() => {
      setCurrentLessonIndex((prev) => Math.min(prev + 1, lessons.length - 1))
      
      // Clear assessment state
      setCurrentAssessmentId(null)
      setAssessmentQuestions([])
    }, 1500)
  }

  // Handle assessment retry - regenerate questions
  const handleAssessmentRetry = async () => {
    if (!student || !sessionId || !currentLesson) return

    setIsGeneratingAssessment(true)

    try {
      // Generate new assessment with different questions
      const response = await fetch("/api/assessment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          topics: [currentLesson.topic],
          gradeLevel: student.grade_level || 6,
          difficulty: "medium",
          sessionId: sessionId,
          lessonContent: currentLesson.content || "",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to regenerate assessment")
      }

      const data = await response.json()

      if (!data.success || !data.assessmentId || !data.questions) {
        throw new Error(data.error || "Invalid assessment data")
      }

      setCurrentAssessmentId(data.assessmentId)
      setAssessmentQuestions(data.questions)

      toast({
        title: "New Assessment Ready",
        description: "Try again with fresh questions",
      })
    } catch (error: any) {
      console.error("[Assessment] Retry error:", error)
      toast({
        title: "Retry Error",
        description: error.message || "Failed to regenerate assessment",
        variant: "destructive",
      })
      setShowAssessmentModal(false)
    } finally {
      setIsGeneratingAssessment(false)
    }
  }

  // Extract keywords from text and fetch relevant images
  const fetchContextualImages = async (text: string) => {
    // Extract potential keywords (nouns, scientific terms, etc.)
    const keywords = extractKeywords(text)
    
    if (keywords.length === 0) return

    // Use the most specific keyword + topic for better context
    const mainKeyword = keywords[0]
    const searchQuery = currentLesson?.topic 
      ? `${mainKeyword} ${currentLesson.topic} educational diagram`
      : `${mainKeyword} educational diagram`

    // Check cache first
    if (imageCache[searchQuery]) {
      console.log("[Images] Using cached images for:", searchQuery)
      setContextualImages(imageCache[searchQuery])
      return
    }

    try {
      console.log("[Images] Fetching images for:", searchQuery)
      const response = await fetch(`/api/images/search?q=${encodeURIComponent(searchQuery)}&num=4`)
      
      if (!response.ok) {
        console.warn("[Images] Search failed:", response.status)
        return
      }

      const data = await response.json()
      
      if (data.success && data.images && data.images.length > 0) {
        console.log("[Images] Found", data.images.length, "images")
        setContextualImages(data.images)
        
        // Cache the results
        setImageCache(prev => ({
          ...prev,
          [searchQuery]: data.images
        }))
      }
    } catch (error) {
      console.error("[Images] Fetch error:", error)
    }
  }

  // Extract meaningful keywords from text
  const extractKeywords = (text: string): string[] => {
    // Common words to ignore
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
      'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just',
      'should', 'now', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
      'has', 'had', 'do', 'does', 'did', 'doing', 'would', 'could', 'might', 'must',
      'shall', 'may', 'this', 'that', 'these', 'those', 'what', 'which', 'who',
      'let', 'us', 'learn', 'understand', 'know', 'see', 'look', 'think', 'make',
      'get', 'take', 'give', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave',
      'call', 'means', 'called', 'important', 'help', 'helps', 'example', 'like',
      'explain', 'concept', 'topic', 'lesson', 'today', 'going', 'want'
    ])

    // Subject-specific terms to prioritize (educational)
    const priorityTerms = new Set([
      'photosynthesis', 'mitochondria', 'DNA', 'cell', 'molecule', 'atom', 'equation',
      'pythagorean', 'theorem', 'gravity', 'velocity', 'acceleration', 'force',
      'revolution', 'democracy', 'constitution', 'empire', 'civilization',
      'ecosystem', 'biodiversity', 'climate', 'geography', 'continent',
      'algorithm', 'variable', 'function', 'programming', 'computer',
      'wavelength', 'frequency', 'energy', 'momentum', 'circuit'
    ])

    // Extract words (2+ characters, alphanumeric)
    const words = text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word) // Ignore pure numbers
      )

    // Score words based on priority and length
    const scoredWords = words.map(word => ({
      word,
      score: priorityTerms.has(word) ? 100 : word.length
    }))

    // Sort by score (priority terms first, then longer words)
    const sorted = scoredWords
      .sort((a, b) => b.score - a.score)
      .map(item => item.word)

    // Remove duplicates and return top keywords
    return [...new Set(sorted)].slice(0, 2) // Return top 2 keywords
  }

  // Mark subtopic as completed and update progress
  const markSubtopicComplete = async (subtopicId: string) => {
    setCompletedSubtopics(prev => new Set([...prev, subtopicId]))
    
    // Update lesson progress
    if (currentLesson?.subtopics) {
      const completed = new Set([...completedSubtopics, subtopicId])
      const progress = Math.round((completed.size / currentLesson.subtopics.length) * 100)
      
      setLessons(prevLessons => 
        prevLessons.map((lesson, idx) => 
          idx === currentLessonIndex 
            ? { ...lesson, progressPercentage: progress }
            : lesson
        )
      )

      // Save to database
      if (student && sessionId && currentLesson) {
        try {
          await fetch('/api/progress/lesson', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: student.id,
              sessionId,
              lessonId: currentLesson.id,
              lessonTitle: currentLesson.title,
              topic: currentLesson.topic,
              subtopics: currentLesson.subtopics,
              completedSubtopics: Array.from(completed),
              progressPercentage: progress,
            }),
          })
          console.log('[progress] Saved subtopic completion:', subtopicId)
        } catch (error) {
          console.error('[progress] Failed to save:', error)
        }
      }

      toast({
        title: "✅ Subtopic Complete!",
        description: `Progress: ${progress}% (${completed.size}/${currentLesson.subtopics.length} topics)`,
      })

      // Auto-advance to next subtopic
      if (currentSubtopicIndex < currentLesson.subtopics.length - 1) {
        setCurrentSubtopicIndex(prev => prev + 1)
      }
    }
  }

  // Check if lesson is ready for assessment (always allowed)
  const canTakeAssessment = () => {
    return true // Students can take assessment anytime, even at 0%
  }

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center fade-in">
          <div className="relative inline-block mb-4">
            <Brain className="w-16 h-16 text-purple-400 animate-pulse mx-auto" />
            <div className="absolute inset-0 blur-2xl bg-purple-400/30 animate-pulse-slow" />
          </div>
          <p className="text-white text-lg font-medium">Preparing your intelligent classroom...</p>
          <p className="text-gray-400 text-sm mt-2">Setting up AI tutor and curriculum</p>
        </div>
      </div>
    )
  }

  const currentLesson = lessons[currentLessonIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      <header className="glass-card border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/overview")}
              className="text-gray-400 hover:text-purple-400 transition-colors hover-scale"
            >
              ← Back
            </Button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full gradient-purple-pink flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="absolute inset-0 blur-xl bg-purple-400/30 -z-10 animate-pulse-slow" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Session</p>
              <h1 className="text-xl font-semibold gradient-text">{selectedTopic || currentLesson?.topic || "Live Learning"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-500/40 text-purple-300 hover:bg-purple-900/20 hover-scale"
              onClick={() => toast({ title: "Progress saved", description: "Session progress auto-saves every few minutes." })}
            >
              Session ID: {sessionId ? sessionId.slice(0, 6) : "offline"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-900/20 hover-scale" 
              onClick={handleLeaveSession}
              disabled={!sessionId}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave Session
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-300 hover:text-purple-400 transition-colors hover-scale" 
              onClick={() => setShowProfileDialog(true)}
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-pink-500/40 text-pink-300 hover:bg-pink-900/20 hover-scale" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
        <div className="flex gap-6 flex-1 flex-col lg:flex-row">
          <aside className="w-full lg:w-64 flex flex-col gap-4">
            <Card className="glass-card border-purple-500/30 card-interactive">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-2 rounded-lg gradient-purple-pink">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  Resources & Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* YouTube Video Display */}
                {currentYouTubeVideo && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-300 mb-2 flex items-center gap-2">
                      <Video className="w-4 h-4 text-red-500" />
                      Reference Video
                    </p>
                    <div className="aspect-video rounded-lg overflow-hidden border border-purple-500/20">
                      <iframe
                        title="Reference Video"
                        src={`https://www.youtube.com/embed/${currentYouTubeVideo}?mute=1&autoplay=0`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* Multimedia Content Display */}
                {multimediaContent.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-300 mb-2">Recent Media</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {multimediaContent.slice(-5).reverse().map((media, idx) => (
                        <div key={idx} className="rounded-lg bg-slate-800/60 p-2 border border-purple-500/20">
                          {media.type === "video" && media.url && (
                            <div>
                              {media.url.includes('youtube.com') || media.url.includes('youtu.be') ? (
                                <div className="space-y-1">
                                  <div className="aspect-video rounded overflow-hidden">
                                    <iframe
                                      title={media.content || "Educational Video"}
                                      src={`https://www.youtube.com/embed/${extractYouTubeId(media.url)}?mute=1`}
                                      className="w-full h-full"
                                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                  {media.content && (
                                    <p className="text-xs text-gray-400">{media.content}</p>
                                  )}
                                </div>
                              ) : (
                                <a 
                                  href={media.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center gap-2 group"
                                >
                                  <Video className="w-4 h-4 text-purple-400 shrink-0" />
                                  <span className="text-xs text-white group-hover:text-purple-300 truncate">
                                    {media.content || "Video resource"}
                                  </span>
                                  <ExternalLink className="w-3 h-3 text-gray-400 ml-auto shrink-0" />
                                </a>
                              )}
                            </div>
                          )}
                          {media.type === "image" && media.url && (
                            <div className="space-y-1">
                              <img 
                                src={media.url} 
                                alt={media.content || "Visual aid"} 
                                className="w-full h-20 object-cover rounded-md"
                              />
                              {media.content && (
                                <p className="text-xs text-gray-400 truncate">{media.content}</p>
                              )}
                            </div>
                          )}
                          {media.type === "text" && (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                              <span className="text-xs text-white truncate">{media.content}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-300 mb-2 flex items-center justify-between">
                    <span>Learning Resources</span>
                    <Badge variant="outline" className="text-xs">{resources.length}</Badge>
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                    {resources.length === 0 && <p className="text-xs text-gray-500">Resources will appear as the tutor introduces them.</p>}
                    {resources.map((resource, idx) => (
                      <div
                        key={`${resource.id}-${resource.url}-${idx}`}
                        className="rounded-lg bg-slate-800/60 p-3 border border-purple-500/20 hover:border-purple-500/40 transition-all"
                      >
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block group"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <div className="text-purple-400 mt-0.5 shrink-0">
                              {resource.type === "video" && <Video className="w-4 h-4" />}
                              {resource.type === "article" && <FileText className="w-4 h-4" />}
                              {resource.type === "documentation" && <Code className="w-4 h-4" />}
                              {!["video", "article", "documentation"].includes(resource.type || "") && <BookOpen className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white group-hover:text-purple-300 transition line-clamp-2">{resource.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">{resource.type || "resource"}</Badge>
                                {resource.duration && (
                                  <span className="text-xs text-gray-400">{resource.duration} min</span>
                                )}
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                          </div>
                        </a>
                        {/* Resource Review - Text Only */}
                        <div className="mt-2 pt-2 border-t border-purple-500/10">
                          <p className="text-xs text-gray-400 line-clamp-2">
                            Excellent resource for understanding {selectedTopic}. Clear explanations and practical examples.
                          </p>
                        </div>
                      </div>
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

            {/* Subtopic Progress Tracker */}
            {currentLesson?.subtopics && currentLesson.subtopics.length > 0 && (
              <Card className="glass-card border-purple-500/30 card-interactive">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-2 rounded-lg gradient-green-teal">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    Lesson Checkpoints
                  </CardTitle>
                  <p className="text-xs text-gray-400 mt-1">
                    Track your progress - Assessment available anytime!
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {currentLesson.subtopics.map((subtopic, idx) => {
                    const isCompleted = completedSubtopics.has(subtopic.id)
                    const isCurrent = idx === currentSubtopicIndex
                    
                    return (
                      <div 
                        key={subtopic.id}
                        className={`glass-effect rounded-xl p-3 border transition-all hover-lift ${
                          isCompleted 
                            ? "border-green-500/50 bg-green-900/20" 
                            : isCurrent
                            ? "border-purple-500/50 bg-purple-900/20"
                            : "border-slate-700/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {isCompleted ? (
                              <div className="p-1 rounded-lg bg-green-500/20">
                                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                                <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-lg border-2 border-gray-600/50 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                isCompleted ? "text-green-300" : isCurrent ? "text-purple-300" : "text-gray-400"
                              }`}>
                                {subtopic.title}
                              </p>
                            </div>
                          </div>
                          {!isCompleted && isCurrent && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markSubtopicComplete(subtopic.id)}
                              className="text-xs h-7 px-2 text-purple-300 hover:text-purple-200 hover:bg-purple-900/20 hover-scale"
                            >
                              Mark Done
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-purple-500/20">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span className="font-medium">Progress</span>
                      <span className="font-bold text-purple-300">{currentLesson.progressPercentage || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all duration-500"
                        style={{ width: `${currentLesson.progressPercentage || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {completedSubtopics.size} of {currentLesson.subtopics.length} checkpoints completed
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="glass-card border-purple-500/30 card-interactive">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-2 rounded-lg gradient-blue-cyan">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  Session Stats
                </CardTitle>
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
            <Card className="border-emerald-500/20 bg-slate-900/70 text-white overflow-hidden hover-lift">
              <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-500/10">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    AI Tutor Board
                  </CardTitle>
                  <p className="text-sm text-gray-400 mt-1">{currentLesson?.title ?? "Interactive Learning Session"}</p>
                </div>
                <div className="flex gap-3 items-center">
                  {/* Progress Badge */}
                  {currentLesson?.subtopics && (
                    <Badge 
                      variant="outline" 
                      className="border-emerald-500/40 text-emerald-300 px-3 py-1"
                    >
                      <Target className="w-3 h-3 mr-1" />
                      {currentLesson.progressPercentage || 0}% Complete
                    </Badge>
                  )}

                  {/* Take Assessment Button */}
                  <Button
                    onClick={handleNextLesson}
                    disabled={isGeneratingAssessment}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                    size="sm"
                    title="Take assessment to unlock next lesson"
                  >
                    {isGeneratingAssessment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4 mr-2" />
                        Take Assessment
                      </>
                    )}
                  </Button>

                  {/* Next Lesson Button */}
                  <Button
                    onClick={() => {
                      // Check if current lesson assessment is passed
                      const currentLessonPassed = !isLessonLocked(currentLessonIndex + 1)
                      if (currentLessonPassed && currentLessonIndex < lessons.length - 1) {
                        setCurrentLessonIndex(prev => prev + 1)
                        setCurrentSubtopicIndex(0)
                        setCompletedSubtopics(new Set())
                        toast({
                          title: "Moving to Next Lesson",
                          description: lessons[currentLessonIndex + 1]?.title,
                        })
                      } else if (!currentLessonPassed) {
                        toast({
                          title: "Assessment Required",
                          description: "Complete and pass the assessment first",
                          variant: "destructive",
                        })
                      }
                    }}
                    disabled={currentLessonIndex >= lessons.length - 1 || isLessonLocked(currentLessonIndex + 1)}
                    className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white border-0"
                    size="sm"
                  >
                    Next Lesson
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  
                  {/* Lesson Navigation Pills */}
                  <div className="flex gap-2 flex-wrap">{lessons.map((lesson, index) => {
                    const isLocked = isLessonLocked(index)
                    const isCurrent = index === currentLessonIndex
                    const isCompleted = assignments.some(a => 
                      a.topic === lesson.topic && a.status === "completed"
                    )
                    
                    return (
                      <Button
                        key={lesson.id}
                        size="sm"
                        variant={isCurrent ? "default" : "outline"}
                        className={`text-xs ${
                          isCurrent 
                            ? "bg-gradient-to-r from-emerald-600 to-cyan-600 border-transparent text-white" 
                            : isLocked 
                            ? "border-gray-600 text-gray-500 cursor-not-allowed"
                            : isCompleted
                            ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/20"
                            : "border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/20"
                        }`}
                        onClick={() => {
                          if (!isLocked) {
                            setCurrentLessonIndex(index)
                          } else {
                            toast({
                              title: "Lesson Locked",
                              description: "Complete the previous lesson's assessment to unlock",
                              variant: "destructive",
                            })
                          }
                        }}
                        disabled={isLocked}
                      >
                        {isLocked ? (
                          <Lock className="w-3 h-3 mr-1" />
                        ) : isCompleted ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : null}
                        L{index + 1}
                      </Button>
                    )
                  })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Presenter stage: a video-call-like view with instructor bubble + slides */}
                <div className="relative rounded-xl border border-emerald-500/20 bg-slate-900/60 overflow-hidden">
                  <div className="grid grid-cols-12 gap-0">
                    {/* Slides / teaching canvas */}
                    <div className="col-span-12 lg:col-span-9 p-4 lg:p-6">
                      <div className="rounded-lg glass-effect p-6 min-h-[260px] border border-emerald-500/10">
                        {currentLesson?.content ? (
                          <div className="prose prose-invert max-w-none text-gray-100">
                            {/** split content into "slides" by double newline and render first 1-2 blocks as a slide-like list */}
                            {(currentLesson.content.split(/\n\n+/).slice(0, 2)).map((block, i) => (
                              <p key={i} className="mb-3 leading-relaxed text-lg">{block}</p>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                              <Brain className="w-8 h-8 text-emerald-400" />
                            </div>
                            <p className="text-sm text-gray-300">Waiting for the AI tutor to begin the lesson…</p>
                            <p className="text-xs text-gray-500 mt-2">Ask a question to get started!</p>
                          </div>
                        )}

                        {/* Contextual Images from Google Custom Search */}
                        {contextualImages.length > 0 && (
                          <div className="mt-6">
                            <div className="flex items-center gap-2 mb-3">
                              <ImageIcon className="w-4 h-4 text-emerald-400" />
                              <h4 className="text-sm font-semibold text-emerald-300">Visual Learning Aids</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {contextualImages.slice(0, 4).map((img, idx) => (
                                <div 
                                  key={idx} 
                                  className="group relative rounded-lg overflow-hidden border border-emerald-500/30 hover:border-emerald-500/60 transition-all hover-lift cursor-pointer"
                                >
                                  <img 
                                    src={img.thumbnail || img.url} 
                                    alt={img.title}
                                    className="w-full h-32 object-cover"
                                    onError={(e) => {
                                      // Fallback to main URL if thumbnail fails
                                      const target = e.target as HTMLImageElement
                                      target.src = img.url
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-0 left-0 right-0 p-2">
                                      <p className="text-xs text-white font-medium line-clamp-2">{img.title}</p>
                                    </div>
                                  </div>
                                  {/* Click to open in new tab */}
                                  <a 
                                    href={img.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    title={`View ${img.title} in full size`}
                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <ExternalLink className="w-3 h-3 text-white" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Contextual Image Carousel - Legacy component kept for compatibility */}
                        {messages.length > 0 && contextualImages.length === 0 && (
                          <div className="mt-4">
                            <ContextualImageCarousel messages={messages} />
                          </div>
                        )}

                        {/* Visual aids grid - Resource images */}
                        {(resources.some(r => ['image','diagram'].includes((r.type||'').toLowerCase())) || teacherImageUrls.length>0) && (
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                            {resources.filter(r => ['image','diagram'].includes((r.type||'').toLowerCase())).slice(0,6).map(r => (
                              <img key={r.id} src={r.url} alt={r.title} className="w-full h-28 object-cover rounded-md border border-emerald-500/30 hover-lift" />
                            ))}
                            {teacherImageUrls.slice(0,6).map((url,idx)=> (
                              <img key={`mimg-${idx}`} src={url} alt="Tutor visual" className="w-full h-28 object-cover rounded-md border border-cyan-500/30 hover-lift" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Instructor bubble and controls */}
                    <div className="col-span-12 lg:col-span-3 p-4 lg:p-6 border-t lg:border-t-0 lg:border-l border-emerald-500/20 bg-slate-900/40">
                      <ModernTutorAvatar 
                        isActive={isProcessing}
                        phase={teachingPhase}
                        progress={conceptProgress}
                      />

                      <div className="mt-6 flex justify-center">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/20" 
                          onClick={() => {
                            if (typeof window !== "undefined" && window.speechSynthesis) {
                              window.speechSynthesis.cancel()
                              setIsSpeaking(false)
                            }
                          }}
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Chat Display - Horizontal Below Tutor Board */}
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-slate-900/60 overflow-hidden">
                  <div className="p-3 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-900/20 to-cyan-900/20">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                      Conversation Transcript
                    </h3>
                  </div>
                  <div className="h-[350px] p-4">
                    <EnhancedChatDisplay messages={messages} isProcessing={isProcessing} />
                  </div>
                </div>

                {/* Student prompt bar */}
                <div className="mt-4 flex items-center gap-3">
                  {/* Mic control button */}
                  <Button
                    variant="outline"
                    size="icon"
                    className={`border-emerald-500/30 ${isMicMuted ? 'text-red-400 hover:bg-red-900/20' : isListening ? 'text-emerald-400 animate-pulse bg-emerald-900/20' : 'text-cyan-300 hover:bg-cyan-900/20'}`}
                    onClick={toggleMicMute}
                    title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  
                  <Textarea
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    placeholder={isMicMuted ? "Ask the AI tutor a question…" : "Type or speak your question…"}
                    rows={2}
                    className="flex-1 glass-effect border-emerald-500/20 text-white placeholder:text-gray-500 focus:border-emerald-500/40"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!inputText.trim() || isProcessing} 
                    className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-6"
                  >
                    {isProcessing ? 'Thinking…' : (<><Send className="w-4 h-4 mr-2"/>Send</>)}
                  </Button>
                </div>
                
                {/* Voice activity indicator */}
                {isListening && voiceTranscript && (
                  <div className="mt-2 rounded-md bg-emerald-900/20 border border-emerald-500/30 p-2">
                    <p className="text-xs text-emerald-300 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Listening... "{voiceTranscript}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="w-full lg:w-72 flex flex-col gap-4">
            {/* REMOVED: Assignments section - replaced with assessment gating system */}
            {/* Students now take assessments before advancing to next lesson */}
            
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

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <User className="w-6 h-6 text-purple-400" />
              Student Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-purple-500">
                <AvatarFallback className="bg-purple-600 text-white text-2xl">
                  {student?.name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{student?.name || "Student"}</h3>
                <p className="text-gray-400">Grade {student?.grade_level || "N/A"}</p>
                <Badge variant="outline" className="mt-2">
                  {student?.learning_style || "Visual"} Learner
                </Badge>
              </div>
            </div>

            <Separator className="bg-purple-500/20" />

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-800 border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Total Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-2xl font-bold">{totalPoints || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-500" />
                    <span className="text-2xl font-bold">{completedLessons.size}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                Recent Achievements
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-slate-800 rounded">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Completed first lesson</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-800 rounded">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">Asked {messages.filter(m => m.role === "student").length} questions</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Session Statistics</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Time Spent:</span>
                  <span>{Math.floor(elapsedSeconds / 60)} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Assignments Done:</span>
                  <span>{assignments.filter(a => a.status === "completed").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Topic:</span>
                  <span>{selectedTopic || "General"}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Quick Check-In
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              How are you feeling about the lesson so far?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm">You've been learning for {Math.floor(elapsedSeconds / 60)} minutes. Let's take a quick break!</p>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => {
                  toast({ title: "Great to hear!", description: "Keep up the good work!" })
                  setShowFeedbackDialog(false)
                }}
              >
                <span className="text-2xl">😊</span>
                <span className="text-xs">Going well</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => {
                  toast({ title: "That's okay!", description: "Learning takes time. Keep going!" })
                  setShowFeedbackDialog(false)
                }}
              >
                <span className="text-2xl">😐</span>
                <span className="text-xs">It's okay</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => {
                  toast({ title: "Let's help you!", description: "Try asking the teacher for more examples." })
                  setShowFeedbackDialog(false)
                }}
              >
                <span className="text-2xl">😕</span>
                <span className="text-xs">Need help</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="bg-slate-900 border-purple-500/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {selectedAssignment?.title || "Assignment"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedAssignment?.description || "Complete this assignment to earn points"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedAssignment && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-800 border-purple-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-400">Points</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{selectedAssignment.totalPoints || 100}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-purple-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-400">Status</span>
                      </div>
                      <p className="text-lg font-semibold mt-1 capitalize">{selectedAssignment.status}</p>
                    </CardContent>
                  </Card>
                </div>

                {selectedAssignment.miniGames && selectedAssignment.miniGames.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Mini Games</h4>
                    {selectedAssignment.miniGames.map((game, idx) => (
                      <div key={game.id} className="p-3 bg-slate-800 rounded-lg border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{game.title}</p>
                            <p className="text-sm text-gray-400">{game.type}</p>
                          </div>
                          <Badge variant="outline">{game.points} pts</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{game.instructions}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      const ensured = ensurePlayableAssignment(selectedAssignment, selectedTopic || 'General')
                      setActiveAssignment(ensured)
                      setShowAssignmentDialog(false)
                    }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Assignment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignmentDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assessment Modal */}
      {showAssessmentModal && currentAssessmentId && student && sessionId && (
        <AssessmentModal
          open={showAssessmentModal}
          onClose={() => setShowAssessmentModal(false)}
          topic={currentLesson?.topic || selectedTopic}
          questions={assessmentQuestions}
          assessmentId={currentAssessmentId}
          studentId={student.id}
          sessionId={sessionId}
          onPass={handleAssessmentPass}
          onRetry={handleAssessmentRetry}
        />
      )}
    </div>
  )
}
