"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // If there are query parameters (like sessionId or topic), go to learn page
    const sessionId = searchParams.get("sessionId")
    const topic = searchParams.get("topic")

    if (sessionId || topic) {
      const params = new URLSearchParams()
      if (sessionId) params.append("sessionId", sessionId)
      if (topic) params.append("topic", topic)
      router.replace(`/dashboard/learn?${params.toString()}`)
    } else {
      // Otherwise, go to overview
      router.replace("/dashboard/overview")
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
      <div className="text-white">Redirecting...</div>
    </div>
  )
}
