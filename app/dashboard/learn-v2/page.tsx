"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Mic, MicOff, Send, Loader2, BookOpen, Target, Clock, 
  TrendingUp, Brain, Sparkles, Image as ImageIcon, FileText, 
  Video, Trophy, Star, Zap, Home, Award
} from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface MultimediaContent {
  type: "image" | "diagram" | "text" | "video"
  url?: string
  content?: string
  title: string
}

interface Assignment {
  id: string
  title: string
  description: string
  points: number
  completed: boolean
}

export default function LearnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const sessionId = searchParams.get("sessionId")
  const topic = searchParams.get("topic") || "Learning"
  
  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMicActive, setIsMicActive] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")
  
  // Teaching state
  const [teachingPhase, setTeachingPhase] = useState<"explain" | "example" | "practice" | "assess">("explain")
  const [currentConcept, setCurrentConcept] = useState("")
  const [conceptProgress, setConceptProgress] = useState(0)
  const [multimediaContent, setMultimediaContent] = useState<MultimediaContent[]>([])
  
  // Progress tracking
  const [sessionTime, setSessionTime] = useState(0)
  const [conceptsMastered, setConceptsMastered] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  
  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([
    { id: "1", title: "Quiz: AI Basics", description: "Test your knowledge", points: 100, completed: false },
    { id: "2", title: "Practice: Build a Chatbot", description: "Hands-on exercise", points: 150, completed: false },
  ])

  // Resources
  const [resources, setResources] = useState([
    { title: "Introduction to AI", type: "video", url: "#", duration: "10 min" },
    { title: "Machine Learning Fundamentals", type: "article", url: "#", duration: "15 min" },
  ])

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Initialize session
  useEffect(() => {
    if (!sessionId) {
      toast({
        title: "No session found",
        description: "Please start from the curriculum builder",
        variant: "destructive",
      })
      router.push("/dashboard/new-session")
      return
    }

    // Add welcome message
    setMessages([{
      role: "assistant",
      content: `Welcome! I'm your AI tutor. Let's explore ${topic} together. I'll guide you through concepts with examples, practice exercises, and assessments. Ready to begin?`,
      timestamp: new Date(),
    }])
  }, [sessionId, topic])

  // Voice recognition setup
  useEffect(() => {
    if (!isMicActive) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      })
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("")
      setVoiceTranscript(transcript)
    }

    recognition.start()

    return () => {
      recognition.stop()
    }
  }, [isMicActive])

  const handleSendMessage = async () => {
    const message = userInput.trim() || voiceTranscript.trim()
    if (!message || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: message,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setUserInput("")
    setVoiceTranscript("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/tutor/chat-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message,
          topic,
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply || "I'm here to help! Could you rephrase that?",
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // Update teaching state from API response
      if (data.teachingState) {
        setTeachingPhase(data.teachingState.phase)
        setCurrentConcept(data.teachingState.currentConcept)
        setConceptProgress(data.teachingState.progress || 0)
      }

      // Update multimedia content
      if (data.multimedia) {
        setMultimediaContent(data.multimedia)
      }

    } catch (error) {
      console.error("[learn] Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to get tutor response. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMic = () => {
    setIsMicActive(!isMicActive)
    if (isMicActive) {
      setVoiceTranscript("")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Top Navigation */}
      <div className="border-b border-purple-500/20 bg-slate-900/50 backdrop-blur">
        <Tabs defaultValue="learn" className="w-full">
          <div className="max-w-[1800px] mx-auto px-6">
            <TabsList className="bg-transparent border-b-0 h-14">
              <TabsTrigger value="learn" className="data-[state=active]:bg-purple-600/20">
                <Brain className="w-4 h-4 mr-2" />
                Learning
              </TabsTrigger>
              <TabsTrigger value="assignments" className="data-[state=active]:bg-purple-600/20">
                <Trophy className="w-4 h-4 mr-2" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-purple-600/20">
                <Target className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="ml-auto"
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
          
          {/* LEFT SIDEBAR - Resources & Progress */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            {/* Resources/Progress Panel */}
            <Card className="border-purple-500/20 bg-slate-900/70 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  Resources & Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Concept Progress</span>
                    <span className="text-purple-400 font-semibold">{conceptProgress}%</span>
                  </div>
                  <Progress value={conceptProgress} className="h-2" />
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="text-sm font-semibold text-white">Available Resources</h4>
                  {resources.map((resource, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-800/50 border border-purple-500/20">
                      <div className="flex items-start gap-2">
                        {resource.type === "video" ? (
                          <Video className="w-4 h-4 text-blue-400 mt-0.5" />
                        ) : (
                          <FileText className="w-4 h-4 text-green-400 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{resource.title}</p>
                          <p className="text-xs text-gray-400">{resource.duration}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time & Stats Panel */}
            <Card className="border-purple-500/20 bg-slate-900/70 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Session Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Session Time</span>
                  <span className="text-xl font-bold text-blue-400">{formatTime(sessionTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Concepts Mastered</span>
                  <span className="text-lg font-semibold text-green-400">{conceptsMastered}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total Points</span>
                  <span className="text-lg font-semibold text-yellow-400">{totalPoints}</span>
                </div>
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">Learning Streak: 3 days 🔥</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CENTER PANEL - Tutor Teaching Area */}
          <div className="col-span-6 flex flex-col">
            <Card className="border-purple-500/20 bg-slate-900/70 backdrop-blur flex-1 flex flex-col">
              <CardHeader className="border-b border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-xl">{topic}</CardTitle>
                    <p className="text-sm text-gray-400 mt-1">
                      Current Phase: <Badge variant="outline" className="ml-2">{teachingPhase}</Badge>
                    </p>
                  </div>
                  {currentConcept && (
                    <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {currentConcept}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              {/* Teaching Content Area with Multimedia */}
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Multimedia Content Display */}
                {multimediaContent.length > 0 && (
                  <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-4 mb-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      Teaching Materials
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {multimediaContent.map((content, idx) => (
                        <div key={idx} className="bg-slate-900/50 rounded p-3 border border-purple-500/10">
                          <div className="flex items-start gap-2 mb-2">
                            {content.type === "image" && <ImageIcon className="w-4 h-4 text-blue-400" />}
                            {content.type === "diagram" && <Target className="w-4 h-4 text-green-400" />}
                            {content.type === "text" && <FileText className="w-4 h-4 text-yellow-400" />}
                            {content.type === "video" && <Video className="w-4 h-4 text-red-400" />}
                            <span className="text-sm font-medium text-white">{content.title}</span>
                          </div>
                          {content.url && (
                            <img src={content.url} alt={content.title} className="w-full rounded" />
                          )}
                          {content.content && (
                            <p className="text-sm text-gray-300 mt-2">{content.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversation Messages */}
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          msg.role === "user"
                            ? "bg-purple-600/20 border border-purple-500/30 text-white"
                            : "bg-slate-800/50 border border-slate-700 text-gray-200"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Tutor is thinking...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL - Gamified Assignments */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            <Card className="border-purple-500/20 bg-slate-900/70 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Assignments
                </CardTitle>
                <p className="text-xs text-gray-400 mt-1">
                  Complete after each tutoring session
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-3 rounded-lg border bg-slate-800/50 border-purple-500/20 hover:border-purple-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold text-sm">{assignment.title}</h4>
                        <p className="text-xs text-gray-400 mt-1">{assignment.description}</p>
                      </div>
                      {assignment.completed && (
                        <Award className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-semibold text-yellow-400">
                          {assignment.points} pts
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={assignment.completed ? "outline" : "default"}
                        className={assignment.completed ? "" : "bg-purple-600 hover:bg-purple-700"}
                        disabled={assignment.completed}
                      >
                        {assignment.completed ? "Completed" : "Start"}
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-semibold">Level Up!</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    Complete 2 more assignments to reach Level 5
                  </p>
                  <Progress value={65} className="mt-2 h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* BOTTOM INPUT BAR */}
        <div className="mt-4">
          <Card className="border-purple-500/20 bg-slate-900/90 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={voiceTranscript || userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={isMicActive ? "Listening..." : "Type your question or click the mic..."}
                    disabled={isLoading || isMicActive}
                    className="bg-slate-800/60 border-purple-500/30 text-white h-12 pr-12"
                  />
                  {isMicActive && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>

                <Button
                  onClick={toggleMic}
                  variant={isMicActive ? "destructive" : "outline"}
                  size="icon"
                  className={`h-12 w-12 ${
                    isMicActive 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "border-purple-500/30 hover:bg-purple-600/20"
                  }`}
                >
                  {isMicActive ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>

                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || (!userInput.trim() && !voiceTranscript.trim())}
                  className="h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>

              {voiceTranscript && (
                <p className="text-sm text-purple-300 mt-2">
                  Voice: {voiceTranscript}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
