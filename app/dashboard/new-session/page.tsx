"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Brain, Upload, Sparkles, FileText, Loader2 } from "lucide-react"

export default function NewSessionPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [topic, setTopic] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [learningGoals, setLearningGoals] = useState("")
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        })
        return
      }
      setSyllabusFile(file)
    }
  }

  const handleSubmit = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic to continue",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Store syllabus content if uploaded
      let syllabusContent = ""
      if (syllabusFile) {
        syllabusContent = await syllabusFile.text()
      }

      // Navigate to curriculum generation page with data
      const params = new URLSearchParams({
        topic,
        gradeLevel: gradeLevel || "General",
        learningGoals: learningGoals || "",
      })

      // Store syllabus in sessionStorage temporarily
      if (syllabusContent) {
        sessionStorage.setItem("syllabusContent", syllabusContent)
        sessionStorage.setItem("syllabusFilename", syllabusFile!.name)
      }

      router.push(`/dashboard/curriculum-builder?${params.toString()}`)
    } catch (error) {
      console.error("[new-session] Error:", error)
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-linear-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Start a New Learning Session</h1>
          <p className="text-gray-400 text-lg">
            Tell me what you'd like to learn, and I'll create a personalized curriculum for you
          </p>
        </div>

        {/* Form Card */}
        <Card className="border-purple-500/20 bg-slate-900/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Topic Input */}
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-white text-base">
                What topic would you like to learn? *
              </Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, Calculus, World War II"
                className="bg-slate-800/60 border-purple-500/30 text-white text-lg h-12"
                disabled={isProcessing}
              />
              <p className="text-sm text-gray-400">
                Be specific to get the best personalized curriculum
              </p>
            </div>

            {/* Grade Level */}
            <div className="space-y-2">
              <Label htmlFor="gradeLevel" className="text-white text-base">
                Grade Level (Optional)
              </Label>
              <Input
                id="gradeLevel"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                placeholder="e.g., Grade 9, High School, College"
                className="bg-slate-800/60 border-purple-500/30 text-white"
                disabled={isProcessing}
              />
            </div>

            {/* Learning Goals */}
            <div className="space-y-2">
              <Label htmlFor="learningGoals" className="text-white text-base">
                Learning Goals (Optional)
              </Label>
              <Textarea
                id="learningGoals"
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                placeholder="What specific outcomes do you want to achieve? Any particular areas of focus?"
                rows={4}
                className="bg-slate-800/60 border-purple-500/30 text-white resize-none"
                disabled={isProcessing}
              />
            </div>

            {/* Syllabus Upload */}
            <div className="space-y-2">
              <Label htmlFor="syllabus" className="text-white text-base">
                Upload Syllabus (Optional)
              </Label>
              <div className="border-2 border-dashed border-purple-500/30 rounded-lg p-6 text-center hover:border-purple-500/50 transition">
                <input
                  id="syllabus"
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="syllabus"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {syllabusFile ? (
                    <>
                      <FileText className="w-12 h-12 text-purple-400 mb-3" />
                      <p className="text-white font-medium">{syllabusFile.name}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {(syllabusFile.size / 1024).toFixed(1)} KB
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-red-400 hover:text-red-300"
                        onClick={(e) => {
                          e.preventDefault()
                          setSyllabusFile(null)
                        }}
                      >
                        Remove
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-white mb-1">Click to upload syllabus</p>
                      <p className="text-sm text-gray-400">
                        PDF, DOC, DOCX, or TXT (Max 5MB)
                      </p>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-gray-400">
                Upload your course syllabus to get a more tailored learning experience
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1 border-purple-500/30 text-white hover:bg-purple-500/10"
                disabled={isProcessing}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!topic.trim() || isProcessing}
                className="flex-1 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg h-12"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Curriculum
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-purple-500/20 bg-slate-900/70 backdrop-blur mt-6">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              What happens next?
            </h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>✨ Our AI will create a personalized curriculum based on your topic</p>
              <p>📚 We'll fetch relevant educational resources from across the web</p>
              <p>🎯 You'll review and customize the curriculum before starting</p>
              <p>🚀 Then jump into an interactive learning session with your AI tutor</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
