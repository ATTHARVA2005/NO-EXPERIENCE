# 🎯 Quick Integration Guide - Agentic AI System

## 1. Replace Feedback Pulse Panel in Dashboard

In `app/dashboard/page.tsx`, replace the static feedback card with:

```tsx
import { FeedbackPanel } from "@/components/feedback-panel"

// Inside the right sidebar (where "Feedback pulse" card is):
<FeedbackPanel 
  studentId={student?.id || ""} 
  sessionId={sessionId || undefined}
  autoRefresh={true}
  refreshInterval={120000} // 2 minutes
/>
```

---

## 2. Add Auto-Save Timer

In `app/dashboard/page.tsx`, add this effect after other useEffects:

```tsx
// Auto-save conversation every 3 minutes
useEffect(() => {
  if (!sessionId || !student?.id || setupPhase !== "learning") return
  
  const autoSave = async () => {
    try {
      const response = await fetch("/api/session/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          sessionId,
          conversationHistory,
          topic: selectedTopic,
          metadata: { phase: setupPhase }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.summary) {
          console.log("[auto-save] Session summary:", data.summary)
          // Optionally show toast
          toast({ 
            title: "Progress saved", 
            description: "Your session has been auto-saved" 
          })
        }
      }
    } catch (error) {
      console.error("[auto-save] Failed:", error)
    }
  }

  const interval = setInterval(autoSave, 3 * 60 * 1000) // Every 3 minutes
  return () => clearInterval(interval)
}, [sessionId, student?.id, conversationHistory, selectedTopic, setupPhase])
```

---

## 3. Load Last Session on Mount

In `app/dashboard/page.tsx`, add this effect:

```tsx
// Load last session when component mounts
useEffect(() => {
  if (!student?.id || setupPhase !== "topic") return
  
  const loadLastSession = async () => {
    try {
      const response = await fetch(`/api/session/summary?studentId=${student.id}`)
      if (!response.ok) return
      
      const data = await response.json()
      if (data.hasSession && data.session) {
        const session = data.session
        
        // Ask user if they want to continue
        const shouldContinue = window.confirm(
          `Continue your last session on "${session.topic}"?`
        )
        
        if (shouldContinue) {
          setSelectedTopic(session.topic)
          setSessionId(session.id)
          
          if (session.curriculumPlan) {
            const plan = session.curriculumPlan
            setLessons(plan.lessons || [])
            setResources(plan.resources || [])
            setAssignments(plan.assignments || [])
          }
          
          if (session.conversationHistory && session.conversationHistory.length > 0) {
            const msgs = session.conversationHistory.map((msg: any) => ({
              role: msg.role === "assistant" ? "teacher" : "student",
              content: msg.content,
              timestamp: new Date()
            }))
            setMessages(msgs)
            setConversationHistory(session.conversationHistory)
            setSetupPhase("learning")
            
            toast({ 
              title: "Session restored", 
              description: `Continuing your ${session.topic} session` 
            })
          }
        }
      }
    } catch (error) {
      console.error("[load-session] Failed:", error)
    }
  }
  
  loadLastSession()
}, [student?.id, setupPhase])
```

---

## 4. Use Adaptive Assignment Generation

Replace the existing `createAssignment` function with:

```tsx
const createAssignment = async (topics: string[]) => {
  if (!student) return

  try {
    const response = await fetch("/api/assignment/generate-adaptive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student.id,
        topic: topics[0] ?? selectedTopic,
        gradeLevel: student.grade_level,
      }),
    })

    if (!response.ok) {
      throw new Error(`Assignment generator returned ${response.status}`)
    }

    const payload = await response.json()

    if (!payload.success || !payload.assignment) {
      throw new Error(payload.error || "Assignment agent could not generate a task")
    }

    const assignmentData = payload.assignment
    const assignment: AssignmentItem = {
      id: assignmentData.id ?? `assignment-${Date.now()}`,
      title: assignmentData.title ?? `Practice for ${topics[0] ?? selectedTopic}`,
      description: assignmentData.description,
      topic: assignmentData.topic ?? topics[0] ?? selectedTopic,
      status: "pending",
      dueDate: null,
      score: undefined,
    }

    setAssignments((prev) => [...prev, assignment])
    
    toast({ 
      title: "New adaptive assignment ready", 
      description: `${assignmentData.miniGames?.length || 0} mini-games created based on your progress`,
      duration: 5000
    })
  } catch (error) {
    console.error("[assignment] generation error", error)
    toast({
      title: "Assignment failed",
      description: error instanceof Error ? error.message : "Could not generate assignment.",
      variant: "destructive",
    })
  }
}
```

---

## 5. Display Media Resources in Tutor Board

In the tutor board section, add below the lesson content:

```tsx
<CardContent>
  {currentLesson?.content ? (
    <>
      <div className="rounded-lg bg-slate-800/60 p-4 text-sm text-gray-200 whitespace-pre-line">
        {currentLesson.content}
      </div>
      
      {/* NEW: Media Resources Section */}
      {resources.some(r => r.type === 'image' || r.type === 'diagram' || r.type === 'video') && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase font-semibold">Visual Aids</p>
          <div className="grid grid-cols-2 gap-3">
            {resources
              .filter(r => r.type === 'image' || r.type === 'diagram')
              .slice(0, 4)
              .map(resource => (
                <div key={resource.id} className="relative group">
                  <img 
                    src={resource.url} 
                    alt={resource.title}
                    className="w-full h-32 object-cover rounded-lg border border-purple-500/30"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                    <p className="text-white text-xs text-center px-2">{resource.title}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </>
  ) : (
    <p className="text-sm text-gray-300">The tutor will introduce the lesson plan as the conversation begins.</p>
  )}
</CardContent>
```

---

## 6. Create Mini-Game Modal Component

Create `components/mini-game-modal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, Trophy } from "lucide-react"

interface MiniGameModalProps {
  isOpen: boolean
  onClose: () => void
  assignment: any // Your AssignmentItem type
}

export function MiniGameModal({ isOpen, onClose, assignment }: MiniGameModalProps) {
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  
  const miniGames = assignment?.miniGames || []
  if (miniGames.length === 0) return null
  
  const currentGame = miniGames[currentGameIndex]
  const questions = currentGame?.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  
  const handleSubmit = () => {
    if (!selectedAnswer || !currentQuestion) return
    
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    if (isCorrect) {
      setScore(score + currentGame.points / questions.length)
    }
    setShowResult(true)
  }
  
  const handleNext = () => {
    setShowResult(false)
    setSelectedAnswer(null)
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else if (currentGameIndex < miniGames.length - 1) {
      setCurrentGameIndex(currentGameIndex + 1)
      setCurrentQuestionIndex(0)
    } else {
      // Assignment complete
      alert(`Assignment complete! Score: ${score}/${assignment.totalPoints}`)
      onClose()
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{currentGame?.title || "Mini Game"}</span>
            <Badge variant="outline" className="text-purple-300">
              <Trophy className="w-3 h-3 mr-1" />
              {score} pts
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Instructions */}
          <div className="rounded-lg bg-slate-800/60 p-4">
            <p className="text-sm text-gray-300">{currentGame?.instructions}</p>
          </div>
          
          {/* Question */}
          {currentQuestion && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">{currentQuestion.question}</p>
                <Badge variant="secondary" className="text-xs">
                  Q {currentQuestionIndex + 1}/{questions.length}
                </Badge>
              </div>
              
              {/* Options */}
              <RadioGroup value={selectedAnswer || ""} onValueChange={setSelectedAnswer} disabled={showResult}>
                <div className="space-y-3">
                  {currentQuestion.options?.map((option: string) => (
                    <div 
                      key={option} 
                      className={`flex items-center space-x-2 p-3 rounded-lg border transition ${
                        showResult && option === currentQuestion.correctAnswer
                          ? "border-green-500 bg-green-500/10"
                          : showResult && option === selectedAnswer
                          ? "border-red-500 bg-red-500/10"
                          : "border-purple-500/30 hover:border-purple-500/60"
                      }`}
                    >
                      <RadioGroupItem value={option} id={option} />
                      <Label htmlFor={option} className="flex-1 cursor-pointer text-sm">
                        {option}
                      </Label>
                      {showResult && option === currentQuestion.correctAnswer && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {showResult && option === selectedAnswer && option !== currentQuestion.correctAnswer && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </RadioGroup>
              
              {/* Explanation (after answer) */}
              {showResult && currentQuestion.explanation && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
                  <p className="text-sm text-blue-200">
                    <strong>Explanation:</strong> {currentQuestion.explanation}
                  </p>
                </div>
              )}
              
              {/* Hint */}
              {!showResult && currentQuestion.hint && (
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-300">Need a hint?</summary>
                  <p className="mt-2 pl-4 border-l-2 border-purple-500/30">{currentQuestion.hint}</p>
                </details>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose} className="border-purple-500/30">
              Exit
            </Button>
            {!showResult ? (
              <Button 
                onClick={handleSubmit} 
                disabled={!selectedAnswer}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Submit Answer
              </Button>
            ) : (
              <Button 
                onClick={handleNext}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {currentQuestionIndex < questions.length - 1 
                  ? "Next Question" 
                  : currentGameIndex < miniGames.length - 1
                  ? "Next Game"
                  : "Complete"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

Then use it in the assignments section:

```tsx
import { MiniGameModal } from "@/components/mini-game-modal"

const [activeAssignment, setActiveAssignment] = useState<AssignmentItem | null>(null)

// In the assignment card "Launch" button:
<Button
  size="sm"
  variant="outline"
  className="flex-1 border-purple-500/30 text-white"
  onClick={() => setActiveAssignment(assignment)}
>
  Launch
</Button>

// At the end of the component:
<MiniGameModal 
  isOpen={!!activeAssignment}
  onClose={() => setActiveAssignment(null)}
  assignment={activeAssignment}
/>
```

---

## 7. Test the Complete System

### Step 1: Start a Session
1. Select a topic (e.g., "Fractions")
2. Optionally upload a syllabus
3. Generate curriculum
4. Start teaching session

### Step 2: Have a Conversation
1. Ask the tutor questions
2. The tutor will use RAG to pull from your syllabus/curriculum
3. After 3+ minutes, check console - auto-save should trigger

### Step 3: Generate Feedback
After 4-5 messages, manually trigger feedback analysis:
```bash
curl -X POST http://localhost:3000/api/feedback/analyze \
  -H "Content-Type: application/json" \
  -d '{"studentId":"YOUR_USER_ID","sessionId":"YOUR_SESSION_ID"}'
```

### Step 4: Generate Adaptive Assignment
```bash
curl -X POST http://localhost:3000/api/assignment/generate-adaptive \
  -H "Content-Type: application/json" \
  -d '{"studentId":"YOUR_USER_ID","topic":"Fractions","gradeLevel":6}'
```

The assignment will use weak concepts from feedback!

### Step 5: Continue Chat
Send another message to the tutor - it will now adapt based on feedback insights.

### Step 6: Reload Page
The conversation should be restored from the last session.

---

## 8. Monitor Agent Coordination

All agents communicate via Supabase. Check these tables:

- `learning_sessions.tutor_messages` - Conversation history
- `feedback_records` - Feedback analysis results
- `assignments` - Generated assignments with mini-games
- `tutor_sessions` - Session metadata

The system is now fully autonomous with feedback loops! 🎉

---

## Troubleshooting

**Q: Feedback panel shows "No insights"**
- Make sure you've had 4+ messages in the conversation
- Trigger feedback manually first: `POST /api/feedback/analyze`

**Q: Assignment isn't adaptive**
- Check if feedback exists in `feedback_records` table
- The endpoint fetches the latest feedback automatically

**Q: Session doesn't restore**
- Ensure `learning_sessions.tutor_messages` contains the conversation array
- Check `sessionId` is being saved correctly

**Q: RAG not working**
- Verify `learning_sessions.syllabus_content` and `curriculum_plan` are populated
- Check console for retrieval diagnostics: `payload.retrieval.sourcesUsed`

---

**You're all set! Your agents now collaborate autonomously to create the perfect adaptive learning experience!** 🚀
