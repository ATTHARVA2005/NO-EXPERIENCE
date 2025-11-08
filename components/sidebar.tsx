"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Brain, BookOpen, User, LogOut, GraduationCap, LayoutDashboard } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useState } from "react"

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/dashboard/overview",
    icon: LayoutDashboard,
  },
  {
    title: "Learn",
    href: "/dashboard/learn",
    icon: Brain,
  },
  {
    title: "Assignments",
    href: "/dashboard/assignments",
    icon: GraduationCap,
  },
  {
    title: "Teacher View",
    href: "/dashboard/teacher",
    icon: BookOpen,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseClient()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      console.log("[Logout] Starting sign out process...")
      
      // Clear Supabase auth session
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error("[Logout] Supabase sign out error:", error)
        throw error
      }
      
      console.log("[Logout] Supabase session cleared")
      
      // Clear all local storage and session storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        console.log("[Logout] Local storage cleared")
      }
      
      // Force a hard redirect to clear any cached state
      window.location.href = "/login"
    } catch (error) {
      console.error("[Logout] Logout error:", error)
      // Force redirect even on error
      window.location.href = "/login"
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <aside className="w-64 bg-slate-950 border-r border-purple-500/20 flex flex-col">
      <div className="p-6 border-b border-purple-500/20">
        <Link href="/dashboard/overview" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl text-white">AI Tutor</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <Button 
                variant={isActive ? "default" : "ghost"} 
                className={`w-full justify-start ${
                  isActive 
                    ? "bg-linear-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700" 
                    : "text-gray-300 hover:bg-purple-500/10 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.title}
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-purple-500/20">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="w-4 h-4 mr-3" />
          {loggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </aside>
  )
}
