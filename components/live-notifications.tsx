"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useLiveNotifications } from "@/lib/realtime-hooks"
import { AlertCircle, CheckCircle } from "lucide-react"

export function LiveNotifications() {
  const supabase = getSupabaseClient()
  const [userId, setUserId] = useState<string | null>(null)
  const { notifications, dismissNotification } = useLiveNotifications(userId)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()
  }, [supabase])

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.slice(0, 3).map((notification) => (
        <div
          key={notification.id}
          className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg shadow-lg animate-in fade-in slide-in-from-top"
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{notification.title}</p>
            {notification.message && <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>}
          </div>
          <button
            onClick={() => dismissNotification(notification.id)}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
