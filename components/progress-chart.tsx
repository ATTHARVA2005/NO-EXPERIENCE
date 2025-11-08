"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Assessment {
  accuracy?: number
  created_at?: string
  total_score?: number
}

export function ProgressChart({ assessments }: { assessments: Assessment[] }) {
  const data = (assessments || [])
    .slice()
    .reverse()
    .map((assessment, idx) => ({
      name: `Day ${idx + 1}`,
      score: Math.round((assessment.accuracy || 0) * 100),
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Complete assessments to see your progress chart</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ fill: "var(--primary)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
