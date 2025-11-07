// Modern Landing Page - Figma UI Implementation
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation"
import {
  Brain,
  BookOpen,
  Target,
  TrendingUp,
  Play,
  CheckCircle,
  Sparkles,
  Users,
  Award,
  Clock,
  Zap,
  MessageSquare,
  Gamepad2,
  Star,
  ArrowRight,
  Shield,
} from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-nav glass-effect border-b border-purple-500/20">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="w-10 h-10 text-purple-400" />
              <div className="absolute inset-0 blur-xl bg-purple-400/30 -z-10 animate-pulse-slow" />
            </div>
            <span className="text-2xl font-bold text-gradient">EduAgent AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-white hover:text-purple-400 transition-colors"
              onClick={() => router.push("/login")}
            >
              Sign In
            </Button>
            <Button
              className="gradient-purple-pink text-white hover:opacity-90 transition-all hover-scale shadow-lg shadow-purple-500/50"
              onClick={() => router.push("/login?tab=signup")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Get Started Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8 fade-in">
            <Badge className="gradient-purple-pink text-white px-6 py-2 text-sm font-medium badge-glow">
              🚀 AI-Powered Learning Platform
            </Badge>
            <h1 className="heading-xl text-white">
              Learn Smarter with
              <br />
              <span className="text-gradient">AI-Powered Education</span>
            </h1>
            <p className="text-body max-w-2xl mx-auto">
              Your personal AI tutor adapts to your learning style, making complex topics simple and engaging.
              Experience the future of education today.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="btn-primary px-8 py-6 text-lg"
                onClick={() => router.push("/login?tab=signup")}
              >
                <Play className="mr-2 h-5 w-5" />
                Start Learning Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                className="btn-secondary px-8 py-6 text-lg"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Explore Features
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {[
              { icon: Users, value: "10K+", label: "Students" },
              { icon: CheckCircle, value: "95%", label: "Success Rate" },
              { icon: Clock, value: "24/7", label: "AI Support" },
              { icon: BookOpen, value: "50+", label: "Topics" },
            ].map((stat, idx) => (
              <Card key={idx} className="glass-card hover-lift text-center">
                <CardContent className="pt-6">
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-purple-400" />
                  <div className="heading-md text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16 slide-up">
            <Badge className="gradient-purple-blue text-white px-6 py-2 text-sm mb-4">
              ✨ Features
            </Badge>
            <h2 className="heading-lg text-white mb-4">Everything You Need to Excel</h2>
            <p className="text-body max-w-2xl mx-auto">
              Powerful AI tools designed to accelerate your learning journey
            </p>
          </div>

          <div className="grid-auto-fit">
            {[
              {
                icon: Brain,
                title: "AI-Powered Lessons",
                desc: "Adaptive learning that evolves with your progress",
                color: "purple",
                gradient: "gradient-purple-pink",
              },
              {
                icon: MessageSquare,
                title: "24/7 AI Tutor",
                desc: "Get instant help whenever you need it",
                color: "green",
                gradient: "gradient-green-teal",
              },
              {
                icon: Target,
                title: "Personalized Path",
                desc: "Custom learning journey for your goals",
                color: "blue",
                gradient: "gradient-blue-cyan",
              },
              {
                icon: Gamepad2,
                title: "Interactive Games",
                desc: "Learn through fun challenges and quizzes",
                color: "orange",
                gradient: "gradient-orange-red",
              },
              {
                icon: TrendingUp,
                title: "Progress Analytics",
                desc: "Track your growth with detailed insights",
                color: "indigo",
                gradient: "gradient-purple-blue",
              },
              {
                icon: Award,
                title: "Earn Rewards",
                desc: "Stay motivated with achievements and badges",
                color: "yellow",
                gradient: "gradient-yellow-orange",
              },
            ].map((feature, idx) => (
              <Card key={idx} className="glass-card card-interactive group">
                <CardContent className="pt-6">
                  <div
                    className={`h-14 w-14 rounded-xl ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <Badge className="gradient-green-teal text-white px-6 py-2 text-sm mb-4">
              📚 Simple Process
            </Badge>
            <h2 className="heading-lg text-white">Start in 3 Easy Steps</h2>
          </div>

          <div className="space-y-12">
            {[
              { icon: Users, title: "Create Profile", desc: "Sign up and set your learning goals" },
              { icon: Target, title: "Choose Path", desc: "Select topics or get AI recommendations" },
              { icon: Sparkles, title: "Start Learning", desc: "Engage with adaptive lessons" },
            ].map((step, idx) => (
              <div key={idx} className="flex items-start gap-6 hover-lift">
                <div className="h-16 w-16 rounded-full gradient-purple-pink flex items-center justify-center text-2xl font-bold text-white shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <step.icon className="h-6 w-6 text-purple-400" />
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="text-gray-400 text-lg">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="gradient-orange-red text-white px-6 py-2 text-sm mb-4">
              ⭐ Success Stories
            </Badge>
            <h2 className="heading-lg text-white">Loved by Students Worldwide</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "High School Student",
                text: "The AI tutor explains concepts in ways that finally click!",
                avatar: "SC",
              },
              {
                name: "Michael Rodriguez",
                role: "College Freshman",
                text: "Interactive games make studying fun. Grades improved significantly!",
                avatar: "MR",
              },
              {
                name: "Emma Thompson",
                role: "Lifelong Learner",
                text: "Never too old to learn! The personalized approach keeps me engaged.",
                avatar: "ET",
              },
            ].map((testimonial, idx) => (
              <Card key={idx} className="glass-card hover-lift">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full gradient-purple-pink flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="text-white font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-gray-400">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-card relative overflow-hidden">
            <div className="absolute inset-0 animated-gradient opacity-30" />
            <CardContent className="pt-12 pb-12 text-center relative z-10">
              <Sparkles className="h-16 w-16 mx-auto mb-6 text-purple-400 animate-pulse-slow" />
              <h2 className="heading-lg text-white mb-4">Ready to Transform Your Learning?</h2>
              <p className="text-body mb-8">
                Join thousands learning smarter with AI
              </p>
              <Button
                size="lg"
                className="btn-primary px-12 py-6 text-lg"
                onClick={() => router.push("/login?tab=signup")}
              >
                <Zap className="mr-2 h-5 w-5" />
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-gray-400 mt-4">No credit card • Start in minutes</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              <span className="text-xl font-bold text-gradient">EduAgent AI</span>
            </div>
            <div className="text-gray-400 text-sm">© 2025 EduAgent AI. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
