"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useSessionUpdates, useAssessmentUpdates } from "@/lib/realtime-hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function LiveDashboardStats() {
  const supabase = getSupabaseClient()
  const [userId, setUserId] = useState<string | null>(null)
  const { sessions } = useSessionUpdates(userId)
  const { assessments } = useAssessmentUpdates(userId)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()
  }, [supabase])

  const totalTime = sessions.reduce((sum, s) => sum + (s.duration_mins || 0), 0)
  const avgAccuracy =
    assessments.length > 0
      ? Math.round((assessments.reduce((sum, a) => sum + (a.accuracy || 0), 0) / assessments.length) * 100)
      : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{sessions.length}</div>
          <p className="text-sm text-muted-foreground mt-1">Total sessions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Learning Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalTime}</div>
          <p className="text-sm text-muted-foreground mt-1">Total minutes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Average Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{avgAccuracy}%</div>
          <p className="text-sm text-muted-foreground mt-1">On assessments</p>
        </CardContent>
      </Card>
    </div>
  )
}
