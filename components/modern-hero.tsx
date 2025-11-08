"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Brain, Target } from "lucide-react";
import Link from "next/link";

export function ModernHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 animated-gradient opacity-20"></div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Floating orbs for visual interest */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center fade-in">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect mb-8">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-300">
            AI-Powered Learning Platform
          </span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="text-gradient">Transform Your Learning</span>
          <br />
          <span className="text-white">with AI Guidance</span>
        </h1>

        {/* Description */}
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12">
          Experience personalized education with our intelligent tutoring system.
          Real-time feedback, adaptive curriculum, and emotional intelligence.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/login">
            <Button
              size="lg"
              className="gradient-purple-pink text-white hover:opacity-90 transition-opacity px-8 py-6 text-lg font-semibold rounded-xl hover-lift group"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              size="lg"
              variant="outline"
              className="glass-effect border-gray-700 text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl hover-lift"
            >
              View Demo
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
          <div className="glass-effect rounded-2xl p-6 hover-lift">
            <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <div className="text-3xl font-bold text-white mb-2">AI-Powered</div>
            <p className="text-gray-400">Advanced learning algorithms</p>
          </div>
          <div className="glass-effect rounded-2xl p-6 hover-lift">
            <Target className="w-12 h-12 text-pink-400 mx-auto mb-4" />
            <div className="text-3xl font-bold text-white mb-2">Personalized</div>
            <p className="text-gray-400">Adaptive curriculum for you</p>
          </div>
          <div className="glass-effect rounded-2xl p-6 hover-lift">
            <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <div className="text-3xl font-bold text-white mb-2">Interactive</div>
            <p className="text-gray-400">Real-time tutor feedback</p>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"></div>
    </section>
  );
}
