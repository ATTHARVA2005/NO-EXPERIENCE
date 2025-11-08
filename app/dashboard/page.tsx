"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if there's a specific session or topic to resume
    const sessionId = searchParams.get("sessionId")
    const topic = searchParams.get("topic")

    if (sessionId || topic) {
      const params = new URLSearchParams()
      if (sessionId) params.append("sessionId", sessionId)
      if (topic) params.append("topic", topic)
      router.replace(`/dashboard/learn?${params.toString()}`)
    } else {
      // Default to overview/dashboard
      router.replace("/dashboard/overview")
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
      <div className="text-white">Loading your dashboard...</div>
    </div>
  )
}
