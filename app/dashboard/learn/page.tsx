"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"
import { VoiceProvider, useVoice, VoiceReadyState } from "@humeai/voice-react"
import {
  BookOpen,
  Clock,
  Send,
  ArrowLeft,
  Star,
  CheckCircle,
  Loader2,
  Target,
  Sparkles,
  Mic,
  MicOff,
  PlayCircle,
  Volume2,
  VolumeX,
} from "lucide-react"

interface Message {
  role: "tutor" | "student"
  content: string
  timestamp: Date
  imageUrl?: string
}

interface Checkpoint {
  id: string
  title: string
  completed: boolean
}

interface LearningResource {
  id: string
  title: string
  type: string
  duration?: string
  url?: string
}

interface SessionData {
  sessionId: string
  topic: string
  gradeLevel: string
  learningGoals: string
  studentName: string
  currentLesson?: any
  curriculum?: any
}

interface CurriculumLesson {
  id: string
  title: string
  content: string
  duration: number
  subtopics: Array<{
    id: string
    title: string
    completed: boolean
    order: number
  }>
}

function TutorInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = getSupabaseClient()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Hume AI Voice
  const { connect, disconnect, sendUserInput, sendAssistantInput, messages: humeMessages, readyState, mute, unmute, isMuted } = useVoice()
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false)

  // Session data
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [lessons, setLessons] = useState<CurriculumLesson[]>([])

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)

  // Progress tracking
  const [sessionTime, setSessionTime] = useState(0)
  const [lessonCompletion, setLessonCompletion] = useState(0)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    { id: "intro", title: "Introduction & Overview", completed: true },
    { id: "core", title: "Core Concepts", completed: false },
    { id: "examples", title: "Practical Examples", completed: false },
    { id: "practice", title: "Practice & Application", completed: false },
  ])

  // Learning resources
  const [resources, setResources] = useState<LearningResource[]>([])

  // Feedback & Assessment
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showAssessmentPanel, setShowAssessmentPanel] = useState(true)
  const [rating, setRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState("")

  // Next focus topics
  const [nextFocusTopics, setNextFocusTopics] = useState<string[]>([])

  // Key takeaways
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>([])

  // Initialize session
  useEffect(() => {
    initializeSession()
  }, [])

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Listen to Hume voice messages
  useEffect(() => {
    if (!humeMessages || humeMessages.length === 0) return

    const lastMessage = humeMessages[humeMessages.length - 1]
    
    console.log("[Voice] New message:", lastMessage.type, lastMessage)
    
    if (lastMessage.type === "user_message" && lastMessage.message?.content) {
      // Student spoke via voice
      const userText = lastMessage.message.content
      console.log("[Voice] User spoke:", userText)
      
      // Add user message to chat
      const userMessage: Message = {
        role: "student",
        content: userText,
        timestamp: new Date(),
      }
      setMessages((prev) => {
        // Check if already added
        const lastMsg = prev[prev.length - 1]
        if (lastMsg?.content === userMessage.content && lastMsg?.role === "student") return prev
        return [...prev, userMessage]
      })
      
    } else if (lastMessage.type === "assistant_message" && lastMessage.message?.content) {
      // AI tutor responded via voice (Hume's response with curriculum context)
      console.log("[Voice] AI responded:", lastMessage.message.content)
      const tutorMessage: Message = {
        role: "tutor",
        content: lastMessage.message.content,
        timestamp: new Date(),
      }
      setMessages((prev) => {
        // Check if already added
        const lastMsg = prev[prev.length - 1]
        if (lastMsg?.content === tutorMessage.content && lastMsg?.role === "tutor") return prev
        return [...prev, tutorMessage]
      })
      
      // Save voice conversation to database
      const userMsg = messages[messages.length - 1]
      if (userMsg && userMsg.role === "student") {
        saveConversation(userMsg, tutorMessage).catch(console.error)
      }
    }
  }, [humeMessages, messages])

  // Monitor voice ready state
  useEffect(() => {
    console.log("[Voice] Ready state changed:", readyState)
    
    if (readyState === VoiceReadyState.OPEN && isVoiceEnabled) {
      console.log("[Voice] Connection is OPEN and ready")
      setIsListening(true)
    } else if (readyState === VoiceReadyState.CLOSED || readyState === VoiceReadyState.IDLE) {
      setIsListening(false)
    }
  }, [readyState, isVoiceEnabled])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const initializeSession = async () => {
    try {
      setLoading(true)

      // Get session parameters from URL
      const sessionId = searchParams.get("sessionId") || ""
      const topic = searchParams.get("topic") || "General Subject"
      const gradeLevel = searchParams.get("gradeLevel") || "General"
      const learningGoals = searchParams.get("learningGoals") || ""

      // Get student profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Fetch student profile
      const { data: profileData } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      const studentName = profileData?.full_name || user.email?.split("@")[0] || "Student"

      setSessionData({
        sessionId,
        topic,
        gradeLevel,
        learningGoals,
        studentName,
      })

      // Load session data if exists
      if (sessionId) {
        await loadSessionData(sessionId)
      } else {
        // Start fresh session
        await startNewSession(user.id, topic, gradeLevel, learningGoals, studentName)
      }

    } catch (error) {
      console.error("Error initializing session:", error)
      toast({
        title: "Error",
        description: "Failed to initialize learning session",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSessionData = async (sessionId: string) => {
    try {
      // Load session details including topic
      const { data: sessionDetails } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("id", sessionId)
        .single()

      if (sessionDetails) {
        // Update session data with actual topic from database
        console.log("[Session] Loading session data:", {
          topic: sessionDetails.topic,
          gradeLevel: sessionDetails.grade_level,
          lessonsCount: sessionDetails.curriculum_plan?.lessons?.length || 0
        })
        
        setSessionData((prev) => ({
          ...prev!,
          topic: sessionDetails.topic || prev?.topic || "General Subject",
          gradeLevel: sessionDetails.grade_level || prev?.gradeLevel || "General",
          learningGoals: sessionDetails.learning_goals || prev?.learningGoals || "",
        }))

        // Load curriculum lessons
        if (sessionDetails.curriculum_plan?.lessons) {
          setLessons(sessionDetails.curriculum_plan.lessons)
          setCurrentLessonIndex(sessionDetails.current_lesson_index || 0)
        }
        
        // Extract resources if available
        if (sessionDetails.curriculum_plan?.resources) {
          setResources(sessionDetails.curriculum_plan.resources.slice(0, 2))
        }

        // Set progress
        setLessonCompletion(sessionDetails.progress || 0)
      }

      // Load conversation history
      const { data: conversationData } = await supabase
        .from("conversation_history")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })

      if (conversationData && conversationData.length > 0) {
        const historyMessages: Message[] = conversationData.map((msg: any) => ({
          role: msg.role as "tutor" | "student",
          content: msg.content,
          timestamp: new Date(msg.created_at),
          imageUrl: msg.image_url,
        }))
        setMessages(historyMessages)
      } else {
        // No history, start with welcome message
        await sendWelcomeMessage()
      }
    } catch (error) {
      console.error("Error loading session data:", error)
      await sendWelcomeMessage()
    }
  }

  const startNewSession = async (
    studentId: string,
    topic: string,
    gradeLevel: string,
    learningGoals: string,
    studentName: string
  ) => {
    // Send welcome message
    await sendWelcomeMessage()

    // Load curriculum resources if available
    try {
      const { data: sessionData } = await supabase
        .from("learning_sessions")
        .select("curriculum_plan")
        .eq("student_id", studentId)
        .eq("topic", topic)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (sessionData?.curriculum_plan?.resources) {
        setResources(sessionData.curriculum_plan.resources.slice(0, 2))
      }
    } catch (error) {
      console.log("No curriculum data found, using defaults")
    }
  }

  const sendWelcomeMessage = async () => {
    // Get curriculum-based welcome message
    const currentLesson = lessons.length > 0 ? lessons[0] : null
    
    let welcomeContent = `Hello! I'm your AI tutor, and I'm excited to help you learn about ${sessionData?.topic || "this topic"}!`
    
    if (currentLesson) {
      welcomeContent = `Welcome! Let's start with **${currentLesson.title}**.

${currentLesson.content || "We'll explore the fundamentals and build your understanding step by step."}

${currentLesson.subtopics && currentLesson.subtopics.length > 0 
  ? `Today we'll cover:\n${currentLesson.subtopics.map((st: any, i: number) => `${i + 1}. ${st.title || st}`).join("\n")}`
  : "Let's dive in!"
}

What would you like to start with, or do you have any questions?`
    } else {
      welcomeContent += `\n\nI'll guide you through the concepts at your own pace. Feel free to ask questions anytime!`
    }

    const welcomeMessage: Message = {
      role: "tutor",
      content: welcomeContent,
      timestamp: new Date(),
    }

    setMessages([welcomeMessage])

    // Set initial key takeaways from curriculum
    if (currentLesson?.subtopics && currentLesson.subtopics.length > 0) {
      setKeyTakeaways(
        currentLesson.subtopics.slice(0, 3).map((st: any) => 
          typeof st === 'string' ? st : st.title || "Understanding core concepts"
        )
      )
    }

    // Set initial next focus from curriculum
    if (lessons.length > 1) {
      setNextFocusTopics(
        lessons.slice(1, 3).map((lesson: any) => lesson.title)
      )
    } else if (currentLesson?.subtopics && currentLesson.subtopics.length > 3) {
      setNextFocusTopics(
        currentLesson.subtopics.slice(3, 5).map((st: any) => 
          typeof st === 'string' ? st : st.title
        )
      )
    }
  }

  // Voice toggle functions
  const handleVoiceToggle = async () => {
    console.log("[Voice] Toggle clicked. Current enabled state:", isVoiceEnabled)
    console.log("[Voice] Current ready state:", readyState)
    
    if (!isVoiceEnabled) {
      // Start voice session
      try {
        const apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY || ""
        
        if (!apiKey) {
          console.error("[Voice] Error: HUME_API_KEY not configured")
          throw new Error("Hume API key not configured")
        }
        
        console.log("[Voice] API Key present:", apiKey.substring(0, 10) + "...")
        
        // Build context with current lesson and curriculum
        const currentLesson = lessons.length > 0 && currentLessonIndex < lessons.length 
          ? lessons[currentLessonIndex] 
          : null

        let systemPrompt = `You are an expert AI tutor teaching ${sessionData?.topic || "General topics"} to a ${sessionData?.gradeLevel || "student"} named ${sessionData?.studentName || "Student"}.`

        if (currentLesson) {
          systemPrompt += `\n\nCURRENT LESSON: ${currentLesson.title}`
          if (currentLesson.content) {
            systemPrompt += `\nLesson Content: ${currentLesson.content}`
          }
          if (currentLesson.subtopics && currentLesson.subtopics.length > 0) {
            systemPrompt += `\nTeach these subtopics: ${currentLesson.subtopics.map((st: any) => st.title || st).join(", ")}`
          }
          systemPrompt += `\n\nFocus ONLY on this lesson's topics. Teach step-by-step, check understanding, and provide examples.`
        }

        systemPrompt += `\n\nKeep responses conversational and encouraging. Use analogies and real-world examples. Keep responses under 3 sentences for natural conversation flow.`

        console.log("[Voice] Connecting to Hume...")
        console.log("[Voice] System prompt:", systemPrompt)

        await connect({
          auth: { type: "apiKey", value: apiKey },
          sessionSettings: {
            type: "session_settings",
            systemPrompt: systemPrompt,
          },
        })
        
        console.log("[Voice] Connection successful! Ready state:", readyState)
        setIsVoiceEnabled(true)
        setIsListening(true)
        
        toast({
          title: "Voice enabled",
          description: "You can now speak to your tutor!",
        })
        
        // Send initial voice greeting after connection is fully established
        setTimeout(() => {
          if (currentLesson && readyState === VoiceReadyState.OPEN) {
            const greeting = `Hi! I'm excited to teach you about ${currentLesson.title}. ${currentLesson.subtopics && currentLesson.subtopics.length > 0 ? `We'll cover ${currentLesson.subtopics.slice(0, 2).map((st: any) => st.title || st).join(' and ')}.` : ''} Let me explain the basics. ${currentLesson.content ? currentLesson.content.split('.').slice(0, 2).join('.') + '.' : ''} Feel free to ask questions anytime!`
            
            console.log("[Voice] Sending initial greeting from assistant:", greeting)
            sendAssistantInput(greeting)
          }
        }, 2000) // Wait for connection to fully establish
      } catch (error) {
        console.error("[Voice] Connection error:", error)
        toast({
          title: "Voice error",
          description: error instanceof Error ? error.message : "Could not connect to voice service",
          variant: "destructive",
        })
      }
    } else {
      // Stop voice session
      console.log("[Voice] Disconnecting...")
      disconnect()
      setIsVoiceEnabled(false)
      setIsListening(false)
      toast({
        title: "Voice disabled",
        description: "Switched to text mode",
      })
    }
  }

  const handleMuteToggle = () => {
    console.log("[Voice] Mute toggle clicked. Current muted state:", isMuted)
    if (isMuted) {
      console.log("[Voice] Unmuting...")
      unmute()
    } else {
      console.log("[Voice] Muting...")
      mute()
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending || !sessionData) return

    const userMessage: Message = {
      role: "student",
      content: inputText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputText
    setInputText("")
    setIsSending(true)

    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Get current lesson info for context
      const currentLesson = lessons.length > 0 && currentLessonIndex < lessons.length 
        ? lessons[currentLessonIndex] 
        : null

      // Ensure we have the correct topic from database if sessionId exists
      let actualTopic = sessionData.topic
      let actualGradeLevel = sessionData.gradeLevel
      
      if (sessionData.sessionId && sessionData.topic === "General Subject") {
        console.log("[Tutor] Topic is 'General Subject', fetching from database...")
        const { data: sessionDetails } = await supabase
          .from("learning_sessions")
          .select("topic, grade_level")
          .eq("id", sessionData.sessionId)
          .single()
        
        if (sessionDetails) {
          actualTopic = sessionDetails.topic || actualTopic
          actualGradeLevel = sessionDetails.grade_level || actualGradeLevel
          
          // Update sessionData for future calls
          setSessionData((prev) => ({
            ...prev!,
            topic: actualTopic,
            gradeLevel: actualGradeLevel,
          }))
          
          console.log("[Tutor] Updated topic from database:", actualTopic)
        }
      }

      console.log("[Tutor] Sending request with:", {
        topic: actualTopic,
        currentLesson: currentLesson?.title,
        gradeLevel: actualGradeLevel
      })

      // Call tutor API
      const response = await fetch("/api/agents/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          studentId: user.id,
          studentName: sessionData.studentName,
          message: currentInput,
          topic: actualTopic,
          gradeLevel: actualGradeLevel,
          learningGoals: sessionData.learningGoals,
          currentLesson: currentLesson ? {
            title: currentLesson.title,
            content: currentLesson.content,
            subtopics: currentLesson.subtopics,
            duration: currentLesson.duration,
          } : null,
          curriculum: sessionData.curriculum,
          conversationHistory: messages.map((m) => ({
            role: m.role === "tutor" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get tutor response")
      }

      const data = await response.json()

      const tutorMessage: Message = {
        role: "tutor",
        content: data.message || data.response || "I'm here to help! Could you rephrase that?",
        timestamp: new Date(),
        imageUrl: data.imageUrl,
      }

      setMessages((prev) => [...prev, tutorMessage])

      // Save conversation to database
      await saveConversation(userMessage, tutorMessage)

      // Update live resources if provided by Tavily
      if (data.liveResources && data.liveResources.length > 0) {
        setResources(data.liveResources)
      }

      // Update progress if mentioned
      if (data.progressUpdate) {
        setLessonCompletion(data.progressUpdate.completion || lessonCompletion)
        
        if (data.progressUpdate.checkpointCompleted) {
          updateCheckpoint(data.progressUpdate.checkpointCompleted)
        }
      }

      // Update key takeaways if provided
      if (data.keyTakeaways && data.keyTakeaways.length > 0) {
        setKeyTakeaways(data.keyTakeaways)
      }

      // Update next focus if provided
      if (data.nextFocus && data.nextFocus.length > 0) {
        setNextFocusTopics(data.nextFocus)
      }

      // Check if lesson is complete
      if (data.lessonComplete || (data.progressUpdate?.completion || 0) >= 100) {
        setShowFeedbackModal(true)
      }

    } catch (error: any) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      })

      // Add error message to chat
      const errorMessage: Message = {
        role: "tutor",
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const saveConversation = async (userMsg: Message, tutorMsg: Message) => {
    if (!sessionData?.sessionId) return

    try {
      await supabase.from("conversation_history").insert([
        {
          session_id: sessionData.sessionId,
          role: "student",
          content: userMsg.content,
          created_at: userMsg.timestamp.toISOString(),
        },
        {
          session_id: sessionData.sessionId,
          role: "tutor",
          content: tutorMsg.content,
          image_url: tutorMsg.imageUrl,
          created_at: tutorMsg.timestamp.toISOString(),
        },
      ])

      // Update session progress
      await supabase
        .from("learning_sessions")
        .update({
          progress: lessonCompletion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionData.sessionId)
    } catch (error) {
      console.error("Error saving conversation:", error)
    }
  }

  const updateCheckpoint = (checkpointId: string) => {
    setCheckpoints((prev) =>
      prev.map((cp) =>
        cp.id === checkpointId ? { ...cp, completed: true } : cp
      )
    )
  }

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before continuing",
        variant: "destructive",
      })
      return
    }

    setShowFeedbackModal(false)

    // Navigate to assessment with curriculum context
    const assessmentParams = new URLSearchParams({
      sessionId: sessionData?.sessionId || "",
      topic: sessionData?.topic || "",
      gradeLevel: sessionData?.gradeLevel || "",
      conversationHistory: JSON.stringify(messages.map(m => ({
        role: m.role,
        content: m.content
      }))),
      currentLesson: currentLessonIndex < lessons.length 
        ? JSON.stringify(lessons[currentLessonIndex])
        : "",
      allLessons: JSON.stringify(lessons),
    })
    
    router.push(`/dashboard/assessment?${assessmentParams.toString()}`)

    // Submit feedback in background (non-blocking)
    try {
      const response = await fetch("/api/tutor/submit-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionData?.sessionId,
          subTopic: sessionData?.topic,
          rating,
          feedback: feedbackText,
          studentId: (await supabase.auth.getUser()).data.user?.id,
        }),
      })

      if (response.ok) {
        console.log("[feedback] Rating submitted successfully")
      } else {
        console.warn("[feedback] Failed to submit rating, but continuing to assessment")
      }
    } catch (error) {
      console.error("[feedback] Error submitting rating:", error)
      // Don't show error to user - they're already navigating to assessment
    }
  }

  const handleTakeAssessment = () => {
    // Show feedback modal before starting assessment
    setShowFeedbackModal(true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-black text-black">Loading Session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/overview")}
            className="flex items-center gap-2 font-black text-black hover:text-orange-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 text-white font-black border-3 border-black px-4 py-2">
              SESSION ID: {sessionData?.sessionId?.substring(0, 8)?.toUpperCase() || "N/A"}
            </div>
            <div className="text-lg font-black text-black">
              Welcome, {sessionData?.studentName || "Student"}!
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Resources & Progress */}
          <div className="col-span-3 space-y-6">
            {/* Resources */}
            <div className="relative">
              <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black" />
              <div className="relative bg-white border-4 border-black">
                <div className="bg-white border-b-4 border-black p-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-black" />
                  <h3 className="font-black text-black">Resources & Progress</h3>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Current Lesson */}
                  {lessons.length > 0 && currentLessonIndex < lessons.length && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-black text-black">Current Lesson</h4>
                        <div className="bg-blue-500 text-white font-black text-xs px-2 py-1 border-2 border-black">
                          {currentLessonIndex + 1}/{lessons.length}
                        </div>
                      </div>
                      <div className="bg-blue-50 border-3 border-black p-3">
                        <p className="font-black text-black text-sm mb-2">
                          {lessons[currentLessonIndex].title}
                        </p>
                        {lessons[currentLessonIndex].subtopics && lessons[currentLessonIndex].subtopics.length > 0 && (
                          <div className="space-y-1 mt-2">
                            <p className="text-xs font-bold text-black/70">Topics:</p>
                            {lessons[currentLessonIndex].subtopics.map((subtopic: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <CheckCircle 
                                  className={`w-3 h-3 ${subtopic.completed ? 'text-green-500' : 'text-black/30'}`} 
                                />
                                <span className="text-xs text-black">{subtopic.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Learning Resources */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-black text-black">Learning Resources</h4>
                      <div className="bg-orange-500 text-white font-black text-xs px-2 py-1 border-2 border-black">
                        {resources.length}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {resources.length > 0 ? (
                        resources.map((resource) => (
                          <a
                            key={resource.id}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white border-3 border-black p-3 hover:bg-orange-50 transition cursor-pointer"
                          >
                            <div className="flex items-start gap-2">
                              <PlayCircle className="w-4 h-4 text-orange-500 mt-1 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-black line-clamp-2">
                                  {resource.title}
                                </p>
                                <p className="text-xs text-black/60 mt-1">
                                  {resource.type} • {resource.duration}
                                </p>
                              </div>
                            </div>
                          </a>
                        ))
                      ) : (
                        <p className="text-xs text-black/60">Resources will appear as you learn</p>
                      )}
                    </div>
                  </div>

                  {/* Lesson Completion */}
                  <div>
                    <h4 className="text-sm font-black text-black mb-3">Lesson Completion</h4>
                    <div className="mb-2">
                      <div className="text-3xl font-black text-black">{lessonCompletion}%</div>
                    </div>
                    <div className="bg-white border-3 border-black h-4">
                      <div
                        className="bg-orange-500 h-full transition-all"
                        style={{ width: `${lessonCompletion}%` }}
                      />
                    </div>
                    <p className="text-xs text-black/60 mt-2">
                      {checkpoints.filter(cp => cp.completed).length} of {checkpoints.length} checkpoints complete
                    </p>
                  </div>

                  {/* Lesson Checkpoints */}
                  <div>
                    <h4 className="text-sm font-black text-black mb-3">Lesson Checkpoints</h4>
                    <div className="space-y-2">
                      {checkpoints.map((checkpoint) => (
                        <div
                          key={checkpoint.id}
                          className="flex items-start gap-2"
                        >
                          <div
                            className={`w-5 h-5 border-3 border-black flex items-center justify-center shrink-0 mt-0.5 ${
                              checkpoint.completed ? "bg-blue-500" : "bg-white"
                            }`}
                          >
                            {checkpoint.completed && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <p className={`text-xs font-semibold ${
                            checkpoint.completed ? "text-black" : "text-black/60"
                          }`}>
                            {checkpoint.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Stats */}
            <div className="relative">
              <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black" />
              <div className="relative bg-white border-4 border-black">
                <div className="bg-white border-b-4 border-black p-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-black" />
                  <h3 className="font-black text-black">Session Stats</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-black/60" />
                    <p className="text-xs font-black text-black/60">Live Session Time</p>
                  </div>
                  <div className="text-3xl font-black text-black">{formatTime(sessionTime)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Conversation */}
          <div className="col-span-6">
            <div className="relative">
              <div className="absolute -right-3 -bottom-3 w-full h-full border-4 border-black" />
              <div className="relative bg-orange-500 border-4 border-black">
                {/* Header */}
                <div className="bg-orange-500 border-b-4 border-black p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-400 border-3 border-black flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-white">AI Tutor</h2>
                        <p className="text-xs font-semibold text-white/80">
                          {sessionData?.topic} • {sessionData?.gradeLevel}
                        </p>
                      </div>
                    </div>
                    
                    {/* Complete Session Button */}
                    <button
                      onClick={() => setShowFeedbackModal(true)}
                      className="bg-white text-orange-500 font-black border-3 border-black px-4 py-2 hover:bg-orange-50 transition flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      COMPLETE SESSION
                    </button>
                  </div>
                </div>

                {/* Conversation Transcript */}
                <div className="bg-white p-6 h-[500px] overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div key={index}>
                        <div className="bg-white border-4 border-black p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-8 h-8 bg-orange-500 border-2 border-black flex items-center justify-center shrink-0">
                              <span className="text-xs font-black text-white">
                                {message.role === "tutor" ? "AI" : "ST"}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-black text-black">
                                  {message.role === "tutor" ? "AI Tutor" : sessionData?.studentName || "Student"}
                                </p>
                                <p className="text-xs font-semibold text-black/60">
                                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </p>
                              
                              {/* Display image if available */}
                              {message.imageUrl && (
                                <div className="mt-4 border-3 border-black">
                                  <img
                                    src={message.imageUrl}
                                    alt="Educational illustration"
                                    className="w-full"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isSending && (
                      <div className="bg-white border-4 border-black p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-500 border-2 border-black flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          </div>
                          <p className="text-sm text-black/60 font-semibold">AI Tutor is thinking...</p>
                        </div>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>
                </div>

                {/* Input Area */}
                <div className="bg-orange-500 border-t-4 border-black p-4">
                  <div className="flex gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask a question or share your thoughts..."
                      disabled={isSending}
                      className="flex-1 bg-white border-3 border-black px-4 py-3 font-semibold text-black placeholder-black/50 focus:outline-none focus:bg-yellow-50"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !inputText.trim()}
                      className="bg-orange-500 text-white font-black border-3 border-black px-6 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                    
                    {/* Voice Control Buttons */}
                    <button
                      onClick={handleVoiceToggle}
                      className={`font-black border-3 border-black p-3 transition relative ${
                        isVoiceEnabled 
                          ? 'bg-orange-500 text-white hover:bg-orange-600' 
                          : 'bg-white text-black hover:bg-gray-100'
                      }`}
                      title={isVoiceEnabled ? "Disable voice" : "Enable voice"}
                    >
                      {isVoiceEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      {isListening && isVoiceEnabled && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </button>
                    
                    {isVoiceEnabled && (
                      <button
                        onClick={handleMuteToggle}
                        className="bg-white text-black font-black border-3 border-black p-3 hover:bg-gray-100 transition"
                        title={isMuted ? "Unmute audio" : "Mute audio"}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Assessment & Next Focus */}
          <div className="col-span-3 space-y-6">
            {/* Assessment */}
            {showAssessmentPanel && (
              <div className="relative">
                <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black" />
                <div className="relative bg-white border-4 border-black">
                  <div className="bg-white border-b-4 border-black p-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-black" />
                    <h3 className="font-black text-black">Assessment</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-black mb-4">
                      Ready to test your knowledge? Take the assessment anytime!
                    </p>
                    <button
                      onClick={handleTakeAssessment}
                      className="w-full bg-orange-500 text-white font-black border-3 border-black px-4 py-3 hover:bg-orange-600 transition flex items-center justify-center gap-2"
                    >
                      <Target className="w-5 h-5" />
                      TAKE ASSESSMENT
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Next Focus */}
            <div className="relative">
              <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black" />
              <div className="relative bg-white border-4 border-black">
                <div className="bg-white border-b-4 border-black p-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-black" />
                  <h3 className="font-black text-black">Next Focus</h3>
                </div>
                <div className="p-4 space-y-2">
                  {nextFocusTopics.map((topic, index) => (
                    <div key={index} className="bg-white border-3 border-black p-3">
                      <p className="text-sm font-semibold text-black">{topic}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Takeaways */}
            <div className="relative">
              <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black" />
              <div className="relative bg-white border-4 border-black">
                <div className="bg-white border-b-4 border-black p-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-black" />
                  <h3 className="font-black text-black">Key Takeaways</h3>
                </div>
                <div className="p-4 space-y-3">
                  {keyTakeaways.map((takeaway, index) => (
                    <div key={index} className="bg-white border-3 border-black p-3">
                      <p className="text-sm text-black">{takeaway}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-8 max-w-md w-full">
            <h2 className="text-2xl font-black text-black mb-4">Rate Your Experience</h2>
            <p className="text-sm text-black mb-6">How was your session with the AI tutor?</p>
            
            {/* Star Rating */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-12 h-12 ${
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Feedback Text */}
            <div className="mb-6">
              <label className="block text-sm font-black text-black mb-2">
                Additional Feedback (Optional)
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your thoughts about the session..."
                className="w-full bg-white border-3 border-black px-4 py-3 font-semibold text-black placeholder-black/50 focus:outline-none resize-none h-24"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitFeedback}
              className="w-full bg-orange-500 text-white font-black border-3 border-black px-6 py-4 hover:bg-orange-600 transition"
            >
              CONTINUE TO ASSESSMENT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TutorInterfacePage() {
  return (
    <VoiceProvider>
      <TutorInterface />
    </VoiceProvider>
  )
}

export default TutorInterfacePage
