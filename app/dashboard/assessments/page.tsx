"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { ProgressChart } from "@/components/progress-chart"
import { getSupabaseClient } from "@/lib/supabase-client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Clock, CheckCircle } from "lucide-react"

interface Assessment {
  id: string
  topic: string
  score: number
  total_questions: number
  time_spent: number
  created_at: string
  type: string
  feedback?: string
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTopic, setFilterTopic] = useState("")
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchAssessments()
  }, [])

  const fetchAssessments = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from("assessments")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })

      if (data) {
        setAssessments(data)
      }
    } catch (error) {
      console.error("Error fetching assessments:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const stats = {
    total: assessments.length,
    averageScore:
      assessments.length > 0 ? Math.round(assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length) : 0,
    perfectScores: assessments.filter((a) => a.score === 100).length,
    totalTimeSpent: assessments.reduce((sum, a) => sum + (a.time_spent || 0), 0),
  }

  // Group by topic for chart
  const topicData = assessments.reduce(
    (acc, assessment) => {
      const existing = acc.find((item) => item.topic === assessment.topic)
      if (existing) {
        existing.avgScore = (existing.avgScore + assessment.score) / 2
        existing.count += 1
      } else {
        acc.push({
          topic: assessment.topic,
          avgScore: assessment.score,
          count: 1,
        })
      }
      return acc
    },
    [] as Array<{ topic: string; avgScore: number; count: number }>,
  )

  // Score distribution
  const scoreDistribution = [
    {
      name: "Excellent (90-100%)",
      value: assessments.filter((a) => a.score >= 90).length,
    },
    {
      name: "Good (80-89%)",
      value: assessments.filter((a) => a.score >= 80 && a.score < 90).length,
    },
    {
      name: "Average (70-79%)",
      value: assessments.filter((a) => a.score >= 70 && a.score < 80).length,
    },
    {
      name: "Below Average (<70%)",
      value: assessments.filter((a) => a.score < 70).length,
    },
  ]

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"]

  const filteredAssessments = filterTopic
    ? assessments.filter((a) => a.topic.toLowerCase().includes(filterTopic.toLowerCase()))
    : assessments

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading assessments...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-2xl font-bold">Assessment Analytics</h1>
          <p className="text-sm text-muted-foreground">View your performance and insights</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
                <CheckCircle className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageScore}%</div>
                <p className="text-xs text-muted-foreground">Overall accuracy</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Perfect Scores</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.perfectScores}</div>
                <p className="text-xs text-muted-foreground">100% completions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
                <Clock className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(stats.totalTimeSpent / 60)}h</div>
                <p className="text-xs text-muted-foreground">Total minutes</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="progress" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="topics">By Topic</TabsTrigger>
              <TabsTrigger value="distribution">Score Distribution</TabsTrigger>
            </TabsList>

            {/* Progress Tab */}
            <TabsContent value="progress">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Scores Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressChart assessments={assessments} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Topics Tab */}
            <TabsContent value="topics">
              <Card>
                <CardHeader>
                  <CardTitle>Average Score by Topic</CardTitle>
                </CardHeader>
                <CardContent>
                  {topicData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No assessment data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topicData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="topic" stroke="var(--muted-foreground)" />
                        <YAxis stroke="var(--muted-foreground)" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                          }}
                        />
                        <Bar dataKey="avgScore" fill="var(--primary)" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Distribution Tab */}
            <TabsContent value="distribution">
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {scoreDistribution.every((d) => d.value === 0) ? (
                    <p className="text-center text-muted-foreground py-8">No assessment data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={scoreDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {scoreDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Assessment List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Recent Assessments</CardTitle>
                  <CardDescription>Filter and view all your assessments</CardDescription>
                </div>
                <Input
                  placeholder="Filter by topic..."
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredAssessments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {filterTopic ? "No assessments match your filter" : "No assessments yet"}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="flex justify-between items-center p-3 border border-border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{assessment.topic}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(assessment.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">
                            {assessment.score}/{assessment.total_questions}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {Math.round((assessment.score / assessment.total_questions) * 100)}%
                          </p>
                        </div>
                        <Badge variant={assessment.score >= 80 ? "default" : "secondary"}>
                          {assessment.score >= 80 ? "Pass" : "Review"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
