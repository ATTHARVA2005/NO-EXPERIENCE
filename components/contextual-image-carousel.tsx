"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ContextualImageCarouselProps {
  messages: Array<{ role: string; content: string }>
}

/**
 * Extract keywords from the latest AI message
 */
function extractImageKeywords(text: string): string[] {
  const keywords: string[] = []
  
  // Educational topic patterns
  const patterns = [
    // General learning concepts
    { regex: /\blearning\b.*\b(skill|method|technique|strategy)\b/gi, keyword: "learning+study+education" },
    { regex: /\bgrowth mindset\b/gi, keyword: "growth+mindset+learning" },
    { regex: /\bmemor(y|ize|ization)\b/gi, keyword: "memory+brain+learning" },
    { regex: /\bpractice\b.*\b(repetition|spaced)\b/gi, keyword: "practice+learning+repetition" },
    
    // Math
    { regex: /\bmath\b/gi, keyword: "mathematics+education" },
    { regex: /\b(\d+)\s*[\+\-\*\/÷×]\s*(\d+)/gi, keyword: "math+equation+calculation" },
    { regex: /\balgebra\b/gi, keyword: "algebra+mathematics" },
    { regex: /\bgeometry\b/gi, keyword: "geometry+shapes" },
    
    // Science
    { regex: /\bDNA\b/gi, keyword: "DNA+biology+genetics" },
    { regex: /\batom|molecule\b/gi, keyword: "atoms+chemistry+science" },
    { regex: /\bphotosynthe/gi, keyword: "photosynthesis+plant+biology" },
    { regex: /\becosystem\b/gi, keyword: "ecosystem+nature+biology" },
    
    // Technology
    { regex: /\b(AI|artificial intelligence)\b/gi, keyword: "artificial+intelligence+technology" },
    { regex: /\brobot\b/gi, keyword: "robot+technology+AI" },
    { regex: /\bprogramming|coding\b/gi, keyword: "programming+code+computer" },
    
    // Musical instruments
    { regex: /\bguitar\b/gi, keyword: "guitar+music+instrument" },
    { regex: /\bpiano\b/gi, keyword: "piano+music+instrument" },
    { regex: /\bmusic\b/gi, keyword: "music+education+learning" },
    
    // Video games (from the conversation)
    { regex: /\bvideo game|gaming\b/gi, keyword: "video+games+gaming" },
    { regex: /\blevel.*up|character\b/gi, keyword: "video+game+leveling" },
    
    // Brain and learning
    { regex: /\bbrain\b/gi, keyword: "brain+learning+education" },
    { regex: /\bsponge\b.*\babsorb\b/gi, keyword: "sponge+learning+absorption" },
    { regex: /\bLego\b/gi, keyword: "lego+building+creativity" },
  ]

  patterns.forEach(({ regex, keyword }) => {
    if (regex.test(text)) {
      keywords.push(keyword)
    }
  })

  // If no specific match, use general learning keywords
  if (keywords.length === 0) {
    keywords.push("education+learning+student")
  }

  return keywords.slice(0, 3) // Limit to 3 different topics
}

/**
 * Get Unsplash image URLs for keywords
 */
function getContextualImages(keywords: string[]): string[] {
  return keywords.map(keyword => 
    `https://source.unsplash.com/featured/800x450/?${keyword}`
  )
}

export function ContextualImageCarousel({ messages }: ContextualImageCarouselProps) {
  const [images, setImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // Get the last teacher message
    const lastTeacherMessage = messages
      .filter(m => m.role === "teacher")
      .slice(-1)[0]

    if (lastTeacherMessage && lastTeacherMessage.content.length > 50) {
      const keywords = extractImageKeywords(lastTeacherMessage.content)
      const imageUrls = getContextualImages(keywords)
      setImages(imageUrls)
      setCurrentIndex(0)
    }
  }, [messages])

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    if (images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [images.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  if (images.length === 0) {
    return null
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-purple-500/30 bg-slate-800/50">
      {/* Image Display */}
      <div className="relative aspect-video w-full">
        <img
          src={images[currentIndex]}
          alt={`Related visual ${currentIndex + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to placeholder
            e.currentTarget.src = `https://placehold.co/800x450/1e293b/a855f7?text=Educational+Visual`
          }}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={goToPrevious}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={goToNext}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}

        {/* Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-purple-400 w-6"
                    : "bg-white/50 hover:bg-white/70"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="p-2 bg-slate-900/80 text-center">
        <p className="text-xs text-gray-400">
          Related to current discussion {images.length > 1 && `(${currentIndex + 1}/${images.length})`}
        </p>
      </div>
    </div>
  )
}
