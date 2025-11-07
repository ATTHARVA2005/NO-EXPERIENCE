"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Zap, Award } from "lucide-react"
import { generateGamifiedAssignment, type Assignment } from "@/lib/agents/assignment-agent"

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)
  const [topic, setTopic] = useState("")
  const [gradeLevel, setGradeLevel] = useState(9)

  const handleGenerateAssignment = async () => {
    if (!topic.trim()) {
      alert("Please enter a topic")
      return
    }

    setLoading(true)
    try {
      const assignment = await generateGamifiedAssignment({
        studentGradeLevel: gradeLevel,
        topic,
        difficulty: "medium",
      })
      setAssignments((prev) => [assignment, ...prev])
    } catch (error) {
      console.error("Error generating assignment:", error)
      alert("Failed to generate assignment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-auto">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-2xl font-bold">Gamified Assignments</h1>
          <p className="text-sm text-muted-foreground">Learn through engaging interactive games</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="create">Create Assignment</TabsTrigger>
              <TabsTrigger value="available">Available Games</TabsTrigger>
            </TabsList>

            {/* Create Tab */}
            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Gamified Assignment</CardTitle>
                  <CardDescription>Generate an AI-powered game tailored to your learning needs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Topic</label>
                      <input
                        type="text"
                        placeholder="e.g., Photosynthesis"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Grade Level</label>
                      <select
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-border rounded-md"
                      >
                        {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
                          <option key={g} value={g}>
                            Grade {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleGenerateAssignment} disabled={loading || !topic.trim()} className="w-full">
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          "Generate Game"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Available Games Tab */}
            <TabsContent value="available" className="space-y-4">
              {assignments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No assignments yet. Create one to get started!
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {assignments.map((assignment) => (
                    <Card key={assignment.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardHeader>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{assignment.title}</CardTitle>
                            <CardDescription>{assignment.topic}</CardDescription>
                          </div>
                          <Badge className="shrink-0">{assignment.gameType}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{assignment.description}</p>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Zap className="w-4 h-4" />
                            <span>{assignment.pointsAvailable} pts</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            <span>{assignment.estimatedTime} min</span>
                          </div>
                        </div>

                        <Button className="w-full" size="sm">
                          Start Game
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
