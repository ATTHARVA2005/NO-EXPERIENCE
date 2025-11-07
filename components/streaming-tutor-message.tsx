"use client"

import { useEffect, useState } from "react"
import { streamTutorResponse } from "@/lib/streaming-utils"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface StreamingMessageProps {
  message: string
  context?: string
  onComplete?: () => void
}

export function StreamingTutorMessage({ message, context, onComplete }: StreamingMessageProps) {
  const [streamedText, setStreamedText] = useState("")
  const [isStreaming, setIsStreaming] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stream = async () => {
      try {
        await streamTutorResponse(message, context || "", (chunk) => {
          setStreamedText((prev) => prev + chunk)
        })
        setIsStreaming(false)
        onComplete?.()
      } catch (err) {
        setError("Failed to stream response")
        setIsStreaming(false)
      }
    }

    stream()
  }, [message, context, onComplete])

  if (error) {
    return <div className="text-destructive text-sm">{error}</div>
  }

  return (
    <Card className="p-4 bg-card">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm">{streamedText}</p>
          {isStreaming && (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs text-muted-foreground">Streaming...</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
