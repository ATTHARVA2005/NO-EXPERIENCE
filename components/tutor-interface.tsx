// components/tutor-interface.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Sparkles, BookOpen, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "student" | "tutor"
  content: string
  timestamp: Date
}

interface TutorInterfaceProps {
  topic?: string
  onSessionEnd?: (sessionData: SessionData) => void
}

interface SessionData {
  topicsCovered: string[]
  strugglingAreas: string[]
  masteredAreas: string[]
  engagementScore: number
  duration: number
  questionsAsked: number
  conceptsExplained: string[]
}

export function TutorInterface({ topic, onSessionEnd }: TutorInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionStartTime] = useState(Date.now())
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [conceptsExplained, setConceptsExplained] = useState<string[]>([])
  const [strugglingAreas, setStrugglingAreas] = useState<string[]>([])
  const [masteredAreas, setMasteredAreas] = useState<string[]>([])
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Initial greeting
    if (messages.length === 0) {
      setMessages([
        {
          role: "tutor",
          content: topic
            ? `Hi! I'm your AI tutor. I'm here to help you learn about ${topic}. What would you like to know?`
            : "Hi! I'm your AI tutor. I'm here to help you learn. What topic would you like to explore today?",
          timestamp: new Date(),
        },
      ])
    }
  }, [])

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: "student",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setQuestionsAsked((prev) => prev + 1)

    try {
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map((m) => ({
            role: m.role === "student" ? "user" : "assistant",
            content: m.content,
          })),
          topic,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const tutorMessage: Message = {
        role: "tutor",
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, tutorMessage])

      // Track concepts (simple heuristic)
      if (data.response.toLowerCase().includes("let me explain")) {
        setConceptsExplained((prev) => [
          ...prev,
          topic || "general concept",
        ])
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "tutor",
          content:
            "I apologize, but I'm having trouble responding right now. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const endSession = async () => {
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000)
    const engagementScore = Math.min(
      100,
      Math.max(
        20,
        (questionsAsked * 15) + (messages.length * 2)
      )
    )

    const sessionData: SessionData = {
      topicsCovered: topic ? [topic] : ["General discussion"],
      strugglingAreas,
      masteredAreas,
      engagementScore,
      duration,
      questionsAsked,
      conceptsExplained,
    }

    try {
      const response = await fetch("/api/tutor/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      })

      if (response.ok) {
        onSessionEnd?.(sessionData)
      }
    } catch (error) {
      console.error("Error saving session:", error)
    }
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">AI Tutor</h3>
            {topic && (
              <p className="text-sm text-muted-foreground">
                Topic: {topic}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {questionsAsked} questions
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={endSession}
          >
            End Session
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3",
                message.role === "student" && "flex-row-reverse"
              )}
            >
              <Avatar className="h-8 w-8">
                <div
                  className={cn(
                    "h-full w-full flex items-center justify-center text-xs font-medium",
                    message.role === "tutor"
                      ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white"
                      : "bg-gradient-to-br from-green-500 to-teal-500 text-white"
                  )}
                >
                  {message.role === "tutor" ? (
                    <Brain className="h-4 w-4" />
                  ) : (
                    "You"
                  )}
                </div>
              </Avatar>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  message.role === "tutor"
                    ? "bg-muted"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {message.content}
                </p>
                <p
                  className={cn(
                    "text-xs mt-1",
                    message.role === "tutor"
                      ? "text-muted-foreground"
                      : "text-primary-foreground/70"
                  )}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500">
                  <Brain className="h-4 w-4 text-white" />
                </div>
              </Avatar>
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question or share your thoughts..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
