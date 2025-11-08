"use client"

import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface ConversationMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface TutorConversationProps {
  messages: ConversationMessage[]
  isStreaming: boolean
}

export function TutorConversation({ messages, isStreaming }: TutorConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {messages.map((message, idx) => (
        <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          <Card
            className={`max-w-xs p-3 ${
              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
            }`}
          >
            <p className="text-sm">{message.content}</p>
            <span className="text-xs opacity-60 mt-1 block">{message.timestamp.toLocaleTimeString()}</span>
          </Card>
        </div>
      ))}
      {isStreaming && (
        <div className="flex gap-2 items-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Tutor is thinking...</span>
        </div>
      )}
      <div ref={scrollRef} />
    </div>
  )
}
