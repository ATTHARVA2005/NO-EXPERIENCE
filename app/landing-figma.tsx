"use client"

import { useRouter } from "next/navigation"
import { Brain, BookOpen, TrendingUp, Sparkles, Award, Zap, MessageSquare, Gamepad2, ArrowRight } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white border-b-4 border-black">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 border-2 border-black flex items-center justify-center">
              <Brain className="w-6 h-6 text-white font-black" />
            </div>
            <span className="text-2xl font-black text-black">EDUAGENT AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/login")}
              className="text-black font-black border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition"
            >
              SIGN IN
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-orange-500 text-white font-black border-2 border-black px-4 py-2 hover:bg-orange-600 transition"
            >
              GET STARTED
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500" />
                <span className="text-sm font-black text-black uppercase tracking-wider">INTELLIGENT TUTORING</span>
              </div>
              <h1 className="text-6xl font-black text-black mb-4 leading-tight">LEARN SMARTER WITH AI</h1>
              <p className="text-lg text-black/70 mb-8 font-semibold">
                Personalized learning paths powered by advanced AI. Upload your syllabus and get started immediately.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push("/dashboard/new-session")}
                  className="bg-orange-500 text-white font-black border-4 border-black px-8 py-4 text-lg hover:bg-orange-600 transition"
                >
                  START LEARNING
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="bg-white text-black font-black border-4 border-black px-8 py-4 text-lg hover:bg-black hover:text-white transition"
                >
                  LEARN MORE
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -right-6 -bottom-6 w-full h-full border-4 border-black" />
              <div className="relative bg-orange-400 border-4 border-black p-8 text-center">
                <Sparkles className="w-24 h-24 text-white mx-auto mb-4" />
                <p className="text-2xl font-black text-white">AI-POWERED</p>
                <p className="text-xl font-black text-white">PERSONALIZATION</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-white border-t-4 border-black">
        <div className="container mx-auto">
          <h2 className="text-4xl font-black text-black mb-12 text-center">KEY FEATURES</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: "SMART CURRICULUM", desc: "AI-generated personalized learning paths" },
              { icon: Gamepad2, title: "INTERACTIVE GAMES", desc: "Engage with mini-games and assessments" },
              { icon: MessageSquare, title: "AI TUTOR CHAT", desc: "24/7 intelligent tutoring assistance" },
              { icon: TrendingUp, title: "PROGRESS TRACKING", desc: "Real-time analytics and insights" },
              { icon: Award, title: "ACHIEVEMENTS", desc: "Earn badges and certificates" },
              { icon: Zap, title: "INSTANT FEEDBACK", desc: "Immediate corrections and suggestions" },
            ].map((feature, i) => (
              <div key={i} className="relative group">
                <div className="absolute -right-2 -bottom-2 w-full h-full border-4 border-black" />
                <div className="relative bg-white border-4 border-black p-6">
                  <feature.icon className="w-12 h-12 text-blue-500 mb-4" />
                  <h3 className="text-lg font-black text-black mb-2">{feature.title}</h3>
                  <p className="text-sm font-semibold text-black/70">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-4 gap-6">
            {[
              { stat: "50K+", label: "ACTIVE LEARNERS" },
              { stat: "1000+", label: "AI TUTORS" },
              { stat: "98%", label: "SUCCESS RATE" },
              { stat: "24/7", label: "AVAILABLE" },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -right-3 -bottom-3 w-full h-full border-4 border-black" />
                <div className="relative bg-blue-500 border-4 border-black p-6 text-center">
                  <p className="text-4xl font-black text-white mb-2">{item.stat}</p>
                  <p className="text-sm font-black text-white uppercase">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-white border-t-4 border-b-4 border-black">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-black text-black mb-8">READY TO TRANSFORM YOUR LEARNING?</h2>
          <button
            onClick={() => router.push("/dashboard/new-session")}
            className="bg-orange-500 text-white font-black border-4 border-black px-12 py-6 text-xl hover:bg-orange-600 transition inline-flex items-center gap-3"
          >
            START FREE TODAY
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white border-t-4 border-black py-8 px-6">
        <div className="container mx-auto text-center">
          <p className="font-black text-sm mb-2">© 2025 EduAgent AI. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-sm font-semibold">
            <a href="#" className="hover:text-orange-400">Privacy</a>
            <a href="#" className="hover:text-orange-400">Terms</a>
            <a href="#" className="hover:text-orange-400">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
