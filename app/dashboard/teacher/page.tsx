"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Award, 
  Brain,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface LessonProgress {
  id: string
  lesson_title: string
  topic: string
  progress_percentage: number
  status: string
  assessment_score: number | null
  started_at: string
  completed_at: string | null
  last_accessed_at: string
  completed_subtopics: number
  total_subtopics: number
  subtopics: SubtopicProgress[]
  context: LessonContext | null
}

interface SubtopicProgress {
  subtopic_title: string
  completed: boolean
  completed_at: string | null
  concepts_covered: string[]
}

interface LessonContext {
  concepts_taught: string[]
  examples_used: string[]
  questions_asked: string[]
  total_messages: number
  student_engagement_level: string
  tutor_notes: string
}

interface StudentProfile {
  id: string
  name: string
  grade_level: number
  average_score: number
  total_sessions: number
  engagement_score: number
  current_streak: number
}

export default function TeacherDashboard() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [lessonsProgress, setLessonsProgress] = useState<LessonProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<LessonProgress | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const supabase = getSupabaseClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("No user found")
        return
      }

      // Get student profile
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profile) {
        setStudentProfile(profile)
      }

      // Get all lesson progress with context
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select(`
          *,
          subtopics:subtopic_progress(*),
          context:lesson_context(*)
        `)
        .eq("student_id", user.id)
        .order("last_accessed_at", { ascending: false })

      if (progress) {
        // Format the data
        const formattedProgress = progress.map((lesson: any) => ({
          ...lesson,
          context: lesson.context?.[0] || null, // lesson_context has UNIQUE constraint, so take first
        }))
        setLessonsProgress(formattedProgress)
        
        // Set first lesson as selected
        if (formattedProgress.length > 0) {
          setSelectedLesson(formattedProgress[0])
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate analytics
  const totalLessons = lessonsProgress.length
  const completedLessons = lessonsProgress.filter(l => l.status === "completed" || l.status === "assessment_passed").length
  const averageProgress = lessonsProgress.length > 0
    ? Math.round(lessonsProgress.reduce((sum, l) => sum + l.progress_percentage, 0) / lessonsProgress.length)
    : 0
  const totalTimeSpent = lessonsProgress.reduce((total, lesson) => {
    if (lesson.started_at && lesson.last_accessed_at) {
      const start = new Date(lesson.started_at).getTime()
      const end = new Date(lesson.last_accessed_at).getTime()
      return total + Math.round((end - start) / (1000 * 60)) // minutes
    }
    return total
  }, 0)

  // Prepare chart data
  const progressOverTime = lessonsProgress
    .slice(0, 10)
    .reverse()
    .map(lesson => ({
      name: lesson.lesson_title.slice(0, 15) + "...",
      progress: lesson.progress_percentage,
      score: lesson.assessment_score || 0,
    }))

  const statusDistribution = [
    { name: "Completed", value: lessonsProgress.filter(l => l.status === "completed" || l.status === "assessment_passed").length, color: "#10b981" },
    { name: "In Progress", value: lessonsProgress.filter(l => l.status === "in_progress").length, color: "#06b6d4" },
    { name: "Not Started", value: lessonsProgress.filter(l => l.status === "not_started").length, color: "#6b7280" },
  ]

  const engagementData = lessonsProgress
    .filter(l => l.context)
    .slice(0, 10)
    .reverse()
    .map(lesson => ({
      name: lesson.lesson_title.slice(0, 15) + "...",
      messages: lesson.context?.total_messages || 0,
      engagement: lesson.context?.student_engagement_level === "high" ? 100 : lesson.context?.student_engagement_level === "medium" ? 60 : 30,
    }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Teacher Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              {studentProfile?.name || "Student"} - Grade {studentProfile?.grade_level || "N/A"}
            </p>
          </div>
          <Badge variant="outline" className="text-cyan-400 border-cyan-400">
            {totalLessons} Total Lessons
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Completion Rate</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {completedLessons} of {totalLessons} lessons
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Avg Progress</CardTitle>
                <TrendingUp className="w-4 h-4 text-cyan-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">{averageProgress}%</div>
              <p className="text-xs text-slate-500 mt-1">Across all lessons</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Time Spent</CardTitle>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {Math.round(totalTimeSpent / 60)}h {totalTimeSpent % 60}m
              </div>
              <p className="text-xs text-slate-500 mt-1">Total learning time</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Engagement</CardTitle>
                <Brain className="w-4 h-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {studentProfile?.engagement_score || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Engagement score</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="lessons" className="data-[state=active]:bg-slate-800">
              <BookOpen className="w-4 h-4 mr-2" />
              Lessons
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-800">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Progress Chart */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Progress Over Time</CardTitle>
                  <CardDescription>Lesson completion and assessment scores</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={progressOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                        labelStyle={{ color: "#f1f5f9" }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="progress" stroke="#06b6d4" name="Progress %" strokeWidth={2} />
                      <Line type="monotone" dataKey="score" stroke="#10b981" name="Assessment Score" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Lesson Status</CardTitle>
                  <CardDescription>Distribution of lesson completion</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Recent Learning Activity</CardTitle>
                <CardDescription>Last 5 lessons accessed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lessonsProgress.slice(0, 5).map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
                         onClick={() => setSelectedLesson(lesson)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{lesson.lesson_title}</h4>
                          <Badge variant="outline" className={
                            lesson.status === "completed" ? "border-green-500 text-green-500" :
                            lesson.status === "in_progress" ? "border-cyan-500 text-cyan-500" :
                            "border-slate-500 text-slate-500"
                          }>
                            {lesson.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{lesson.topic}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>{lesson.completed_subtopics}/{lesson.total_subtopics} checkpoints</span>
                          <span>•</span>
                          <span>{new Date(lesson.last_accessed_at).toLocaleDateString()}</span>
                          {lesson.context && (
                            <>
                              <span>•</span>
                              <span>{lesson.context.total_messages} messages</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="w-24">
                        <Progress value={lesson.progress_percentage} className="h-2" />
                        <p className="text-xs text-center text-slate-400 mt-1">{lesson.progress_percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Lessons List */}
              <Card className="bg-slate-900 border-slate-800 lg:col-span-1">
                <CardHeader>
                  <CardTitle>All Lessons</CardTitle>
                  <CardDescription>{totalLessons} lessons</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  {lessonsProgress.map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedLesson?.id === lesson.id
                          ? "bg-cyan-500/20 border border-cyan-500"
                          : "bg-slate-800/50 hover:bg-slate-800 border border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{lesson.lesson_title}</h4>
                          <p className="text-xs text-slate-400 mt-1">{lesson.topic}</p>
                        </div>
                        {lesson.status === "completed" && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <Progress value={lesson.progress_percentage} className="h-1 mt-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Lesson Details */}
              {selectedLesson && (
                <Card className="bg-slate-900 border-slate-800 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>{selectedLesson.lesson_title}</CardTitle>
                    <CardDescription>{selectedLesson.topic}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Overall Progress</span>
                        <span className="text-sm font-medium">{selectedLesson.progress_percentage}%</span>
                      </div>
                      <Progress value={selectedLesson.progress_percentage} className="h-2" />
                    </div>

                    {/* Checkpoints */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-500" />
                        Checkpoints ({selectedLesson.completed_subtopics}/{selectedLesson.total_subtopics})
                      </h4>
                      <div className="space-y-2">
                        {selectedLesson.subtopics.map((subtopic, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 rounded bg-slate-800/50">
                            {subtopic.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-600 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm">{subtopic.subtopic_title}</p>
                              {subtopic.concepts_covered && subtopic.concepts_covered.length > 0 && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Concepts: {subtopic.concepts_covered.join(", ")}
                                </p>
                              )}
                            </div>
                            {subtopic.completed_at && (
                              <span className="text-xs text-slate-500">
                                {new Date(subtopic.completed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Teaching Context */}
                    {selectedLesson.context && (
                      <>
                        <div>
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-purple-500" />
                            Concepts Taught ({selectedLesson.context.concepts_taught.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedLesson.context.concepts_taught.map((concept, idx) => (
                              <Badge key={idx} variant="outline" className="border-purple-500 text-purple-400">
                                {concept}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {selectedLesson.context.examples_used.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Award className="w-4 h-4 text-blue-500" />
                              Examples Used ({selectedLesson.context.examples_used.length})
                            </h4>
                            <div className="space-y-2">
                              {selectedLesson.context.examples_used.map((example, idx) => (
                                <div key={idx} className="p-2 rounded bg-slate-800/50 text-sm text-slate-300">
                                  {example}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedLesson.context.questions_asked.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-cyan-500" />
                              Student Questions ({selectedLesson.context.questions_asked.length})
                            </h4>
                            <div className="space-y-2">
                              {selectedLesson.context.questions_asked.map((question, idx) => (
                                <div key={idx} className="p-2 rounded bg-slate-800/50 text-sm text-slate-300 italic">
                                  "{question}"
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tutor Notes */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            Tutor Notes
                          </h4>
                          <div className="p-3 rounded bg-slate-800/50 text-sm text-slate-300">
                            {selectedLesson.context.tutor_notes}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>Engagement: <Badge variant="outline" className={
                              selectedLesson.context.student_engagement_level === "high" ? "border-green-500 text-green-500" :
                              selectedLesson.context.student_engagement_level === "medium" ? "border-yellow-500 text-yellow-500" :
                              "border-red-500 text-red-500"
                            }>{selectedLesson.context.student_engagement_level}</Badge></span>
                            <span>Messages: {selectedLesson.context.total_messages}</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Assessment Score */}
                    {selectedLesson.assessment_score !== null && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Assessment Score</h4>
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-bold text-green-500">
                            {selectedLesson.assessment_score}%
                          </div>
                          {selectedLesson.assessment_score >= 80 && (
                            <Badge className="bg-green-500">Passed</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Engagement Over Time */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Engagement Metrics</CardTitle>
                  <CardDescription>Message count and engagement level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                      />
                      <Legend />
                      <Bar dataKey="messages" fill="#06b6d4" name="Messages" />
                      <Bar dataKey="engagement" fill="#8b5cf6" name="Engagement Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Concept Mastery */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle>Concept Mastery</CardTitle>
                  <CardDescription>Top 10 concepts learned</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {Array.from(
                      lessonsProgress
                        .filter(l => l.context)
                        .flatMap(l => l.context?.concepts_taught || [])
                        .reduce((acc, concept) => {
                          acc.set(concept, (acc.get(concept) || 0) + 1)
                          return acc
                        }, new Map<string, number>())
                    )
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([concept, count]) => (
                        <div key={concept} className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{concept}</p>
                            <Progress value={Math.min(100, count * 20)} className="h-1 mt-1" />
                          </div>
                          <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                            {count}x
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Time Spent Analysis */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Learning Time Analysis</CardTitle>
                <CardDescription>Time invested per lesson</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={lessonsProgress.slice(0, 10).reverse().map(lesson => {
                    const timeSpent = lesson.started_at && lesson.last_accessed_at
                      ? Math.round((new Date(lesson.last_accessed_at).getTime() - new Date(lesson.started_at).getTime()) / (1000 * 60))
                      : 0
                    return {
                      name: lesson.lesson_title.slice(0, 15) + "...",
                      time: timeSpent,
                      progress: lesson.progress_percentage,
                    }
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                    />
                    <Legend />
                    <Bar dataKey="time" fill="#10b981" name="Time (minutes)" />
                    <Bar dataKey="progress" fill="#06b6d4" name="Progress %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
