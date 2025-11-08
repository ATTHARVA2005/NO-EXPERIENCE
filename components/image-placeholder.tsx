"use client"

import React from "react"

interface ImagePlaceholderProps {
  src: string
  alt?: string
  caption?: string
}

export function ImagePlaceholder({ src, alt, caption }: ImagePlaceholderProps) {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget
    // Fallback: replace with transparent 1x1 gif so layout remains
    img.src = "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs="
    img.alt = alt || "image"
  }

  return (
    <div className="mt-2 rounded overflow-hidden border bg-white shadow-sm">
      <a href={src} target="_blank" rel="noopener noreferrer" className="block w-full">
        <img
          src={src}
          alt={alt || "image"}
          onError={handleError}
          loading="lazy"
          className="w-full object-contain max-h-60 bg-gray-50"
        />
      </a>
      {caption && <div className="text-xs text-muted-foreground p-2">{caption}</div>}
    </div>
  )
}

export default ImagePlaceholder
