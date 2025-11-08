"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react"

interface AuthMode {
  mode: "login" | "signup" | "demo" | "guest"
}

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [authMode, setAuthMode] = useState<"login" | "signup" | "demo" | "guest">("login")
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter email and password",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: "Welcome back! 👋",
        description: "Redirecting to dashboard...",
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !fullName) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        const { error: profileError } = await supabase.from("student_profiles").insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
        })

        if (profileError) {
          console.error("Profile creation error:", profileError)
        }
      }

      toast({
        title: "Account created! 🎉",
        description: "Welcome to EduAgent AI",
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoMode = async () => {
    setIsLoading(true)
    try {
      // Demo account login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "demo@example.com",
        password: "demo123456",
      })

      if (error) {
        // Create demo account if it doesn't exist
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: "demo@example.com",
          password: "demo123456",
          options: {
            data: {
              full_name: "Demo User",
            },
          },
        })

        if (signupError) throw signupError

        // Create profile
        if (signupData.user) {
          await supabase.from("student_profiles").insert({
            id: signupData.user.id,
            email: "demo@example.com",
            full_name: "Demo User",
          })
        }

        toast({
          title: "Demo Mode 🎮",
          description: "Exploring as Demo User...",
        })
      } else {
        toast({
          title: "Demo Mode 🎮",
          description: "Welcome back, Demo User!",
        })
      }

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Demo mode failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestMode = () => {
    // Set guest flag in sessionStorage
    sessionStorage.setItem("guestMode", "true")
    sessionStorage.setItem("guestName", "Guest User")
    toast({
      title: "Guest Mode 👤",
      description: "Exploring as Guest...",
    })
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Main container with neo-brutalist styling */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-2 text-black font-mono">EDUAGENT</h1>
          <p className="text-sm font-bold tracking-wider text-black border-b-4 border-black pb-2 inline-block">
            AI-POWERED LEARNING
          </p>
        </div>

        {/* Authentication Card - Neo-brutalist centered */}
        <div className="bg-white border-4 border-black p-8">
          {/* Tab navigation */}
          <div className="flex gap-0 mb-8 border-b-4 border-black">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-3 font-bold border-r-4 border-black transition-all ${
                authMode === "login"
                  ? "bg-orange-400 text-black border-black"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-3 font-bold transition-all ${
                authMode === "signup"
                  ? "bg-orange-400 text-black border-b-4 border-black"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              SIGNUP
            </button>
          </div>

          {/* Login Form */}
          {authMode === "login" && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-black mb-3 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-4 w-5 h-5 text-black" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={isLoading}
                    className="w-full pl-10 py-3 border-3 border-black bg-white font-bold text-black placeholder-gray-600 focus:outline-none focus:bg-yellow-100 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-3 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-4 w-5 h-5 text-black" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-3 border-3 border-black bg-white font-bold text-black placeholder-gray-600 focus:outline-none focus:bg-yellow-100 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-4 text-black hover:text-orange-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-400 border-3 border-black text-black font-bold py-4 px-6 uppercase tracking-wider hover:bg-orange-500 active:bg-orange-600 disabled:opacity-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    SIGNING IN...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    SIGN IN <ArrowRight size={20} />
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {authMode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-black mb-3 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  disabled={isLoading}
                  className="w-full py-3 px-4 border-3 border-black bg-white font-bold text-black placeholder-gray-600 focus:outline-none focus:bg-yellow-100 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-3 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-4 w-5 h-5 text-black" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={isLoading}
                    className="w-full pl-10 py-3 border-3 border-black bg-white font-bold text-black placeholder-gray-600 focus:outline-none focus:bg-yellow-100 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-3 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-4 w-5 h-5 text-black" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-3 border-3 border-black bg-white font-bold text-black placeholder-gray-600 focus:outline-none focus:bg-yellow-100 transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-4 text-black hover:text-orange-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-400 border-3 border-black text-black font-bold py-4 px-6 uppercase tracking-wider hover:bg-orange-500 active:bg-orange-600 disabled:opacity-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    CREATING...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    CREATE ACCOUNT <ArrowRight size={20} />
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-8 relative">
            <div className="border-t-3 border-black"></div>
            <div className="absolute left-1/2 transform -translate-x-1/2 -top-4 bg-white px-4">
              <span className="text-black font-bold uppercase text-xs tracking-wider">DEMO MODE</span>
            </div>
          </div>

          {/* Demo Mode Button */}
          <button
            onClick={handleDemoMode}
            disabled={isLoading}
            className="w-full bg-blue-400 border-3 border-black text-black font-bold py-4 px-6 uppercase tracking-wider hover:bg-blue-500 active:bg-blue-600 disabled:opacity-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                LOADING...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🎮 DEMO MODE <ArrowRight size={20} />
              </span>
            )}
          </button>

          {/* Guest Mode Button */}
          <button
            onClick={handleGuestMode}
            disabled={isLoading}
            className="w-full bg-white border-3 border-black text-black font-bold py-4 px-6 uppercase tracking-wider hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <span className="flex items-center justify-center gap-2">
              👤 GUEST MODE <ArrowRight size={20} />
            </span>
          </button>
        </div>

        {/* Footer with terms */}
        <div className="mt-8 border-b-4 border-black pb-4 text-center">
          <p className="text-xs font-bold text-black uppercase tracking-wider mb-2">
            BY CONTINUING YOU AGREE TO OUR
          </p>
          <div className="flex justify-center gap-4">
            <button className="text-xs font-bold text-black underline hover:no-underline uppercase tracking-wider">
              TERMS OF SERVICE
            </button>
            <span className="text-black font-bold">•</span>
            <button className="text-xs font-bold text-black underline hover:no-underline uppercase tracking-wider">
              PRIVACY POLICY
            </button>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/")}
            className="text-black font-bold uppercase text-sm hover:underline tracking-wider"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
