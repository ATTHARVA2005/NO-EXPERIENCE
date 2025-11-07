"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/sidebar"
import { ProgressChart } from "@/components/progress-chart"
import { getSupabaseClient } from "@/lib/supabase-client"
import { User, Mail, Trophy, Target, TrendingUp, Award } from "lucide-react"

interface StudentProfile {
  id: string
  name: string
  email: string
  grade_level: number
  learning_style?: string
  created_at: string
  total_points?: number
  total_assessments?: number
  average_score?: number
}

interface StreakData {
  currentStreak: number
  longestStreak: number
  totalDaysActive: number
}

interface TopicMastery {
  topic: string
  masteryLevel: number // 0-100
  attempts: number
  lastAttempt: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<StudentProfile>>({})
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalDaysActive: 0,
  })
  const [topicMastery, setTopicMastery] = useState<TopicMastery[]>([])
  const [assessmentHistory, setAssessmentHistory] = useState<any[]>([])
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: student } = await supabase.from("student_profiles").select("*").eq("id", user.id).single()

      if (student) {
        setProfile(student)
        setFormData(student)

        // Fetch streak data
        const { data: sessions } = await supabase
          .from("learning_sessions")
          .select("created_at")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })

        if (sessions && sessions.length > 0) {
          const uniqueDays = new Set(sessions.map((s) => new Date(s.created_at).toDateString()))
          setStreakData({
            currentStreak: Math.min(uniqueDays.size, 30),
            longestStreak: uniqueDays.size,
            totalDaysActive: uniqueDays.size,
          })
        }

        // Fetch assessment history
        const { data: assessments } = await supabase
          .from("assessments")
          .select("*")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (assessments) {
          setAssessmentHistory(assessments)
        }

        // Fetch topic mastery
        const { data: topics } = await supabase
          .from("topic_mastery")
          .select("*")
          .eq("student_id", user.id)
          .order("mastery_level", { ascending: false })
          .limit(10)

        if (topics) {
          setTopicMastery(topics)
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from("student_profiles")
        .update({
          name: formData.name,
          learning_style: formData.learning_style,
        })
        .eq("id", user.id)

      if (error) throw error

      setProfile((prev) => (prev ? { ...prev, ...formData } : null))
      setEditing(false)
    } catch (error) {
      console.error("Error saving profile:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading profile...</p>
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
          <h1 className="text-2xl font-bold">Student Profile</h1>
          <p className="text-sm text-muted-foreground">Track your learning progress and achievements</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          {/* Profile Card */}
          {profile && (
            <Card>
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {profile.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-2">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => (editing ? handleSaveProfile() : setEditing(true))}>
                  {editing ? "Save Changes" : "Edit Profile"}
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {editing ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Grade Level</label>
                      <select
                        value={formData.grade_level || 9}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            grade_level: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-border rounded-md"
                      >
                        {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
                          <option key={g} value={g}>
                            Grade {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Learning Style</label>
                      <select
                        value={formData.learning_style || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            learning_style: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-border rounded-md"
                      >
                        <option value="">Select a learning style</option>
                        <option value="visual">Visual</option>
                        <option value="auditory">Auditory</option>
                        <option value="kinesthetic">Kinesthetic</option>
                        <option value="reading">Reading/Writing</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Grade Level</p>
                      <p className="text-lg font-semibold">Grade {profile.grade_level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Learning Style</p>
                      <p className="text-lg font-semibold capitalize">{profile.learning_style || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="text-lg font-semibold">{new Date(profile.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                <Trophy className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile?.total_points || 0}</div>
                <p className="text-xs text-muted-foreground">Points earned</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                <Target className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile?.total_assessments || 0}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(profile?.average_score || 0)}%</div>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <Award className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{streakData.currentStreak}</div>
                <p className="text-xs text-muted-foreground">Days active</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="progress" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="mastery">Topic Mastery</TabsTrigger>
              <TabsTrigger value="history">Assessment History</TabsTrigger>
            </TabsList>

            {/* Progress Tab */}
            <TabsContent value="progress">
              <Card>
                <CardHeader>
                  <CardTitle>Learning Progress</CardTitle>
                  <CardDescription>Your performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProgressChart assessments={assessmentHistory} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mastery Tab */}
            <TabsContent value="mastery">
              <Card>
                <CardHeader>
                  <CardTitle>Topic Mastery Levels</CardTitle>
                  <CardDescription>Your progress in different topics</CardDescription>
                </CardHeader>
                <CardContent>
                  {topicMastery.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No mastery data yet. Complete assessments to track your progress.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {topicMastery.map((topic, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{topic.topic}</span>
                            <Badge
                              variant={
                                topic.masteryLevel >= 80
                                  ? "default"
                                  : topic.masteryLevel >= 60
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {Math.round(topic.masteryLevel)}%
                            </Badge>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${topic.masteryLevel}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{topic.attempts} attempts</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Assessments</CardTitle>
                  <CardDescription>Your latest assessment attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  {assessmentHistory.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No assessments yet. Start learning to see your history.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {assessmentHistory.map((assessment, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 border border-border rounded-lg hover:border-primary/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{assessment.topic}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(assessment.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{Math.round(assessment.score || 0)}%</p>
                            <Badge variant="outline" className="text-xs">
                              {assessment.type || "Assessment"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
