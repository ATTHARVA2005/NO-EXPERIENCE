"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProgressChart } from "./progress-chart"
import Link from "next/link"
import { ArrowRight, BookOpen, Brain, Zap } from "lucide-react"

interface DashboardOverviewProps {
  studentName: string
  recentActivity: any[]
  upcomingTopics: string[]
  totalPoints: number
  streakDays: number
}

export function DashboardOverview({
  studentName,
  recentActivity,
  upcomingTopics,
  totalPoints,
  streakDays,
}: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back, {studentName}!</CardTitle>
          <CardDescription>You're on a {streakDays} day streak! Keep up the great work.</CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Brain className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Topics studied</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Zap className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints}</div>
            <p className="text-xs text-muted-foreground">Earned this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
            <BookOpen className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streakDays}</div>
            <p className="text-xs text-muted-foreground">Days in a row</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart assessments={recentActivity} />
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Continue Learning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Pick up where you left off</p>
            <Link href="/dashboard/learn">
              <Button className="w-full" size="sm">
                Resume Tutor Session <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Upcoming Topics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingTopics.length > 0 ? (
              <>
                {upcomingTopics.slice(0, 2).map((topic, idx) => (
                  <Badge key={idx} variant="secondary" className="block w-full text-left py-1">
                    {topic}
                  </Badge>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming topics</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
