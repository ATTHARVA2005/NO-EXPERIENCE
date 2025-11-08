"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Brain, User, ChevronDown, ChevronUp, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface Message {
  role: "student" | "teacher"
  content: string
  timestamp: Date
  hasAudio?: boolean
}

interface EnhancedChatDisplayProps {
  messages: Message[]
  isProcessing?: boolean
  images?: Array<{
    url: string
    thumbnail: string
    title: string
    context?: string
  }>
}

/**
 * Extract keywords from AI message to find relevant images
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = []
  
  // Common educational topics with image potential
  const patterns = [
    // Math
    { regex: /\b(\d+)\s*[\+\-\*\/÷×]\s*(\d+)\s*=?\s*(\d+)?\b/gi, type: "math" },
    { regex: /\b(equation|formula|calculation|algebra|geometry)\b/gi, type: "math" },
    
    // Science
    { regex: /\b(DNA|cell|atom|molecule|photosynthesis|ecosystem)\b/gi, type: "science" },
    { regex: /\b(planet|solar system|galaxy|universe|space)\b/gi, type: "astronomy" },
    
    // Technology
    { regex: /\b(AI|artificial intelligence|machine learning|neural network|robot)\b/gi, type: "technology" },
    { regex: /\b(computer|programming|code|algorithm|database)\b/gi, type: "technology" },
    
    // History
    { regex: /\b(ancient|medieval|renaissance|revolution|war|empire)\b/gi, type: "history" },
    
    // Geography
    { regex: /\b(mountain|ocean|river|continent|country|city)\b/gi, type: "geography" },
    
    // Biology
    { regex: /\b(heart|brain|skeleton|organ|muscle|blood)\b/gi, type: "biology" },
  ]

  patterns.forEach(({ regex, type }) => {
    const matches = text.match(regex)
    if (matches) {
      matches.forEach(match => keywords.push(`${type}:${match.toLowerCase()}`))
    }
  })

  return keywords.slice(0, 3) // Limit to 3 keywords
}

/**
 * Generate HIGH QUALITY image URL using Unsplash (1200x800 for better quality)
 */
function getContextualImage(keyword: string): string {
  const [type, term] = keyword.split(":")
  const query = encodeURIComponent(term || keyword)
  
  // Use Unsplash Source API with HIGHER RESOLUTION (1200x800 instead of 400x300)
  return `https://source.unsplash.com/1200x800/?${query},education,highquality`
}

export function EnhancedChatDisplay({ messages, isProcessing = false, images: externalImages }: EnhancedChatDisplayProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set())
  const [contextualImages, setContextualImages] = useState<Map<number, string[]>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages])

  // Extract images for teacher messages
  useEffect(() => {
    const newImages = new Map<number, string[]>()
    
    messages.forEach((msg, index) => {
      if (msg.role === "teacher" && msg.content.length > 50) {
        const keywords = extractKeywords(msg.content)
        if (keywords.length > 0) {
          newImages.set(index, keywords.map(getContextualImage))
        }
      }
    })

    setContextualImages(newImages)
  }, [messages])

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedMessages(newExpanded)
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col gap-4 pb-4 px-2">
        {messages.map((message, index) => {
          const isTeacher = message.role === "teacher"
          const isExpanded = expandedMessages.has(index)
          const images = contextualImages.get(index) || []
          const showExpandButton = message.content.length > 250

          return (
            <div
              key={index}
              className="flex gap-3 items-start w-full"
            >
              {/* Avatar - Always on left */}
              <Avatar className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                isTeacher ? "bg-purple-600" : "bg-blue-600"
              }`}>
                {isTeacher ? (
                  <Brain className="w-6 h-6 text-white" />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </Avatar>

              {/* Message content - Takes full width */}
              <div className="flex-1 flex flex-col gap-2">
                {/* Message bubble */}
                <Card
                  className={`p-4 ${
                    isTeacher
                      ? "bg-slate-800/90 border-purple-500/40 text-white"
                      : "bg-blue-900/60 border-blue-400/40 text-white"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <Badge variant={isTeacher ? "secondary" : "default"} className="text-xs">
                      {isTeacher ? "AI Tutor" : "You"}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Message content with subtitle-like formatting */}
                  <div className="space-y-2">
                    <p
                      className={`text-base leading-relaxed whitespace-pre-line ${
                        !isExpanded && showExpandButton ? "line-clamp-3" : ""
                      }`}
                    >
                      {message.content}
                    </p>

                    {showExpandButton && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(index)}
                        className="text-xs text-purple-400 hover:text-purple-300 p-0 h-auto"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Read full message
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>

                {/* HIGH QUALITY Contextual images */}
                {isTeacher && isExpanded && (
                  <>
                    {/* Display Google Custom Search high-quality images if available from props */}
                    {externalImages && externalImages.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <ImageIcon className="w-3 h-3" />
                          <span>High Quality Educational Visuals</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {externalImages.slice(0, 4).map((img, imgIndex) => (
                            <div
                              key={imgIndex}
                              className="relative rounded-lg overflow-hidden border border-purple-500/30 aspect-video bg-slate-800/50 hover:border-purple-500/60 transition-all duration-300 group"
                            >
                              <img
                                src={img.url}
                                alt={img.title || `Educational visual ${imgIndex + 1}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
                                onError={(e) => {
                                  // Fallback to high-quality placeholder
                                  e.currentTarget.src = `https://placehold.co/1200x800/1e293b/a855f7?text=HD+Visual+Aid`
                                }}
                              />
                              {img.title && (
                                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2">
                                  <p className="text-xs text-white truncate">{img.title}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Fallback to Unsplash images if no Google images */
                      images.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <ImageIcon className="w-3 h-3" />
                            <span>Relevant visuals</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {images.slice(0, 3).map((imgUrl, imgIndex) => (
                              <div
                                key={imgIndex}
                                className="relative rounded-lg overflow-hidden border border-purple-500/30 aspect-video bg-slate-800/50 hover:border-purple-500/60 transition-colors"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Contextual visual ${imgIndex + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                  onError={(e) => {
                                    // Fallback to placeholder
                                    e.currentTarget.src = `https://placehold.co/1200x800/1e293b/a855f7?text=Visual+Aid`
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {isProcessing && (
          <div className="flex gap-3 items-start w-full">
            <Avatar className="w-10 h-10 bg-purple-600 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-white animate-pulse" />
            </Avatar>
            <Card className="p-4 bg-slate-800/90 border-purple-500/40">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </Card>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  )
}
