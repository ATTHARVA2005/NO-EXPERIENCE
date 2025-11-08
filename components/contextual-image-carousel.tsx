"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ContextualImageCarouselProps {
  messages?: Array<{ role: string; content: string }>
  images?: Array<{ url: string; thumbnail?: string; title?: string }>
  autoPlay?: boolean
  interval?: number
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
    
    // Video games
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
    `https://source.unsplash.com/featured/1200x675/?${keyword}`
  )
}

export function ContextualImageCarousel({ messages, images: externalImages, autoPlay = true, interval = 5000 }: ContextualImageCarouselProps) {
  const [imageData, setImageData] = useState<Array<{ url: string; title?: string }>>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  // Priority 1: Use externally provided images (from Google Custom Search)
  useEffect(() => {
    if (externalImages && externalImages.length > 0) {
      console.log("[Carousel] Using external images:", externalImages.length)
      setImageData(externalImages.map(img => ({
        url: img.thumbnail || img.url,
        title: img.title
      })))
      setCurrentIndex(0)
      return
    }
  }, [externalImages])

  // Priority 2: Fallback to message-based Unsplash images
  useEffect(() => {
    // Only use message-based images if no external images provided
    if (externalImages && externalImages.length > 0) return
    if (!messages || messages.length === 0) return

    // Get the last teacher message
    const lastTeacherMessage = messages
      .filter(m => m.role === "teacher" || m.role === "assistant")
      .slice(-1)[0]

    if (lastTeacherMessage && lastTeacherMessage.content.length > 50) {
      const keywords = extractImageKeywords(lastTeacherMessage.content)
      const imageUrls = getContextualImages(keywords)
      console.log("[Carousel] Using message-based images:", imageUrls.length)
      setImageData(imageUrls.map(url => ({ url, title: "Related visual" })))
      setCurrentIndex(0)
    }
  }, [messages, externalImages])

  // Auto-rotate images
  useEffect(() => {
    if (imageData.length <= 1 || !autoPlay || isHovered) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imageData.length)
    }, interval)

    return () => clearInterval(timer)
  }, [imageData.length, autoPlay, isHovered, interval])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + imageData.length) % imageData.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % imageData.length)
  }

  if (imageData.length === 0) {
    return null
  }

  const currentImage = imageData[currentIndex]

  return (
    <div 
      className="relative w-full rounded-xl overflow-hidden border-2 border-emerald-500/30 bg-slate-900 shadow-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Display */}
      <div className="relative aspect-video w-full bg-slate-800">
        <img
          src={currentImage.url}
          alt={currentImage.title || `Educational visual ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-500"
          onError={(e) => {
            e.currentTarget.src = `https://placehold.co/1200x675/1e293b/10b981?text=Educational+Visual+${currentIndex + 1}`
          }}
        />

        {/* Gradient Overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Navigation Arrows */}
        {imageData.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              title="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 transition-all opacity-0 group-hover:opacity-100"
              onClick={goToPrevious}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 transition-all opacity-0 group-hover:opacity-100"
              onClick={goToNext}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Indicators */}
        {imageData.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {imageData.map((_, index) => (
              <button
                key={index}
                title={`Go to image ${index + 1}`}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-emerald-400 w-8"
                    : "bg-white/40 hover:bg-white/60 w-2"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}

        {/* Auto-play indicator */}
        {autoPlay && imageData.length > 1 && !isHovered && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 text-white text-xs flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Auto
          </div>
        )}
      </div>

      {/* Caption Bar */}
      <div className="px-4 py-2 bg-slate-900/95 border-t border-emerald-500/20">
        <p className="text-xs text-emerald-300 text-center font-medium">
          {currentImage.title || "Visual Learning Aid"} {imageData.length > 1 && `· ${currentIndex + 1} of ${imageData.length}`}
        </p>
      </div>
    </div>
  )
}
