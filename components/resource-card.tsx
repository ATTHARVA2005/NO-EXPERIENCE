"use client"

import { Button } from "@/components/ui/button"
import { ExternalLink, BookOpen, Video, FileText, Book } from "lucide-react"

const typeIcons = {
  video: Video,
  article: FileText,
  exercise: BookOpen,
  book: Book,
  tutorial: Video,
  guide: BookOpen,
}

interface Resource {
  id: string
  title: string
  type: string
  url: string
  duration?: string | null
  difficulty?: string | null
  description?: string | null
}

export function ResourceCard({ resource }: { resource: Resource }) {
  const IconComponent = typeIcons[resource.type as keyof typeof typeIcons] || BookOpen

  return (
    <div className="p-4 rounded-lg border border-border hover:border-primary transition-colors group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <IconComponent className="w-5 h-5 text-primary shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate group-hover:text-primary transition-colors">
            {resource.title}
          </h3>
          {resource.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {resource.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
            <span className="px-2 py-1 bg-muted rounded text-muted-foreground capitalize">
              {resource.type}
            </span>
            {resource.duration && (
              <span className="text-muted-foreground">{resource.duration}</span>
            )}
            {resource.difficulty && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded capitalize">
                {resource.difficulty}
              </span>
            )}
          </div>
        </div>
        <Button size="sm" variant="ghost" asChild className="shrink-0">
          <a href={resource.url} target="_blank" rel="noopener noreferrer" title={`Open ${resource.title}`}>
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}
