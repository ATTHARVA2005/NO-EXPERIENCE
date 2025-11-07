"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setIsAuthenticated(true)
      } else if (typeof window !== "undefined") {
        const redirectParam = encodeURIComponent(window.location.pathname || "/dashboard")
        router.replace(`/login?redirect=${redirectParam}`)
      } else {
        router.replace("/login")
      }
    } catch (error) {
      console.error("[v0] Auth check error:", error)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-linear-to-br from-slate-950 via-purple-950 to-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
