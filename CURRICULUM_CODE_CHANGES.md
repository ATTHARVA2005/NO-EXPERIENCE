# Curriculum Generation Backend Integration - Code Changes

## Overview
Connected curriculum generation from hardcoded data to your backend Curriculum Agent API.

---

## File 1: `app/dashboard/new-session/page.tsx`

### Import Changes
```tsx
import { getSupabaseClient } from '@/lib/supabase-client'
```

### Component Setup
```tsx
export default function NewSessionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()  // ← NEW

  const [topic, setTopic] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  // ... rest of state
}
```

### handleSubmit Function (UPDATED)
**Before:**
```tsx
const handleSubmit = async () => {
  // ... validation ...
  let syllabusContent = ''
  let filename = ''

  if (uploadMode === 'file' && syllabusFile) {
    syllabusContent = await syllabusFile.text()
    filename = syllabusFile.name
  }

  const queryParams = {
    topic: String(topic || 'Uploaded Content'),
    gradeLevel: String(gradeLevel || 'General'),
    learningGoals: String(learningGoals || ''),
  }

  if (syllabusContent) {
    sessionStorage.setItem('syllabusContent', syllabusContent)
    sessionStorage.setItem('syllabusFilename', filename)
  }

  sessionStorage.setItem('formData', JSON.stringify(queryParams))

  // Navigate to curriculum builder
  const url = new URL('/dashboard/curriculum-builder', window.location.origin)
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  window.location.href = url.toString()
}
```

**After:**
```tsx
const handleSubmit = async () => {
  let submissionData = { topic, gradeLevel, learningGoals }

  // Validation
  if (uploadMode === 'file' && !syllabusFile) {
    toast({ title: 'File required', description: 'Please upload a syllabus file', variant: 'destructive' })
    return
  }

  if (uploadMode === 'manual' && !topic.trim()) {
    toast({ title: 'Topic required', description: 'Please enter a topic', variant: 'destructive' })
    return
  }

  setIsProcessing(true)

  try {
    // ========== NEW: Get authenticated user ==========
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast({ title: 'Authentication required', description: 'Please log in to continue', variant: 'destructive' })
      router.push('/login')
      setIsProcessing(false)
      return
    }
    // ==========================================

    let syllabusContent = ''
    let filename = ''

    if (uploadMode === 'file' && syllabusFile) {
      syllabusContent = await syllabusFile.text()
      filename = syllabusFile.name
    }

    // Store in sessionStorage for curriculum generation
    if (syllabusContent) {
      sessionStorage.setItem('syllabusContent', syllabusContent)
      sessionStorage.setItem('syllabusFilename', filename)
    }

    // ========== NEW: Create learning session in backend ==========
    const { data: session, error: sessionError } = await supabase
      .from('learning_sessions')
      .insert({
        student_id: user.id,
        topic: topic || 'Uploaded Content',
        grade_level: gradeLevel || 'General',
        learning_goals: learningGoals || '',
        status: 'active',
        progress: 0,
      })
      .select()
      .single()

    if (sessionError) {
      console.error('[new-session] Session creation error:', sessionError)
      // Continue anyway to curriculum generation
    }
    // ==========================================

    const queryParams = {
      topic: String(topic || 'Uploaded Content'),
      gradeLevel: String(gradeLevel || 'General'),
      learningGoals: String(learningGoals || ''),
    }

    // ========== NEW: Store session ID for later reference ==========
    if (session?.id) {
      sessionStorage.setItem('currentSessionId', session.id)
    }
    // ==========================================

    sessionStorage.setItem('formData', JSON.stringify(queryParams))

    // Navigate to curriculum builder with query params
    const url = new URL('/dashboard/curriculum-builder', window.location.origin)
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    window.location.href = url.toString()
  } catch (error) {
    console.error('[new-session] Error:', error)
    toast({ title: 'Error', description: 'Failed to process your request. Please try again.', variant: 'destructive' })
    setIsProcessing(false)
  }
}
```

---

## File 2: `app/dashboard/curriculum-builder/page.tsx`

### Import Changes
```tsx
import { getSupabaseClient } from "@/lib/supabase-client"

// Added to lucide-react imports:
import { Loader } from "lucide-react"
```

### Component Setup (UPDATED)
**Before:**
```tsx
export default function CurriculumBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [isGenerating, setIsGenerating] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const topic = searchParams.get("topic") || "Your Course"
  const gradeLevel = searchParams.get("gradeLevel") || ""
  const learningGoals = searchParams.get("learningGoals") || ""

  const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([
    // ... hardcoded data ...
  ])
}
```

**After:**
```tsx
export default function CurriculumBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = getSupabaseClient()  // ← NEW

  const [isGenerating, setIsGenerating] = useState(true)  // ← CHANGED: starts as true
  const [isStarting, setIsStarting] = useState(false)
  const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([])  // ← CHANGED: empty array
  const [sessionId, setSessionId] = useState<string | null>(null)  // ← NEW

  const topic = searchParams.get("topic") || "Your Course"
  const gradeLevel = searchParams.get("gradeLevel") || ""
  const learningGoals = searchParams.get("learningGoals") || ""

  // ========== NEW: Load curriculum from backend API ==========
  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        setIsGenerating(true)

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast({
            title: "Authentication required",
            description: "Please log in to continue",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        // Get syllabus content if available (from sessionStorage)
        const syllabusContent = sessionStorage.getItem("syllabusContent") || undefined

        // Call the backend curriculum generation API
        const response = await fetch("/api/agents/generate-curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: user.id,
            topic: topic || "General Knowledge",
            gradeLevel: gradeLevel || "General",
            learningGoals: learningGoals || undefined,
            syllabus: syllabusContent,
            learningStyle: "visual",
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to generate curriculum")
        }

        const data = await response.json()

        if (data.success && data.lessons) {
          // Transform lessons into week structure
          const weeks: CurriculumWeek[] = []
          const lessonsPerWeek = Math.ceil(data.lessons.length / 4) // Distribute over 4 weeks
          
          data.lessons.forEach((lesson: any, index: number) => {
            const weekNum = Math.floor(index / lessonsPerWeek) + 1
            
            if (!weeks[weekNum - 1]) {
              weeks[weekNum - 1] = {
                week: weekNum,
                title: `${topic} - Week ${weekNum}`,
                duration: 0,
                lessons: [],
              }
            }
            
            const lessonDuration = lesson.duration || 50
            weeks[weekNum - 1].duration += Math.ceil(lessonDuration / 60)
            weeks[weekNum - 1].lessons.push({
              id: lesson.id || `lesson-${index}`,
              title: lesson.title,
              duration: lessonDuration,
              topics: lesson.subtopics?.map((s: any) => s.title) || [],
            })
          })

          setCurriculum(weeks)
          setSessionId(data.sessionId || null)

          toast({
            title: "Curriculum generated! 🎓",
            description: "Your personalized learning path is ready",
          })
        } else {
          throw new Error("Invalid response from curriculum API")
        }
      } catch (error: any) {
        console.error("[curriculum-builder] Error:", error)
        toast({
          title: "Failed to generate curriculum",
          description: error.message || "Please try again",
          variant: "destructive",
        })
        // Fallback: go back to new-session
        setTimeout(() => router.back(), 2000)
      } finally {
        setIsGenerating(false)
      }
    }

    loadCurriculum()
  }, [])
  // ==========================================
```

### Loading Screen (NEW)
```tsx
// Show loading screen while generating curriculum
if (isGenerating) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <Sparkles className="w-24 h-24 text-orange-500 animate-pulse" />
        </div>
        <h1 className="text-4xl font-black text-black mb-4">GENERATING YOUR</h1>
        <h1 className="text-4xl font-black text-orange-500 mb-6">PERSONALIZED CURRICULUM</h1>
        <div className="flex items-center justify-center gap-3">
          <Loader className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-lg font-bold text-black">This may take a moment...</p>
        </div>
        <p className="mt-6 text-sm text-black/60 max-w-md mx-auto">
          Our AI is analyzing your learning style and creating the perfect learning path for you.
        </p>
      </div>
    </div>
  )
}

// Show empty state if no curriculum generated
if (curriculum.length === 0) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center pt-20 pb-12">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-black text-black mb-4">NO CURRICULUM</h1>
        <p className="text-lg text-black/70 mb-8">Unable to generate curriculum. Please try again.</p>
        <button
          onClick={() => router.back()}
          className="bg-orange-500 text-white font-black border-4 border-black px-8 py-4 hover:bg-orange-600 transition"
        >
          ← GO BACK
        </button>
      </div>
    </div>
  )
}
```

### Return Statement (CHANGED)
```tsx
return (
  <div className="min-h-screen bg-white pt-20 pb-12">
    {/* Rest of component unchanged */}
  </div>
)
```

---

## Summary of Changes

### New-Session Page
✅ Added `getSupabaseClient` import  
✅ Added `supabase` client initialization  
✅ Added authentication check  
✅ Added learning_session creation in Supabase  
✅ Added session ID storage in sessionStorage  
✅ Added error handling with toast  

### Curriculum-Builder Page
✅ Added `getSupabaseClient` import  
✅ Added `Loader` icon import  
✅ Added `supabase` client initialization  
✅ Removed hardcoded curriculum data  
✅ Added `useEffect` hook for async loading  
✅ Added API call to `/api/agents/generate-curriculum`  
✅ Added lesson-to-week transformation logic  
✅ Added loading screen UI  
✅ Added empty state UI  
✅ Added error handling and fallback  
✅ Added session ID tracking  

### Data Flow
1. User submits form → creates learning_session record
2. Navigate to curriculum-builder with query params
3. Fetch authenticated user
4. Call backend curriculum API with student context
5. Transform returned lessons into weeks
6. Display curriculum with stats
7. User can start learning

**Result**: ✅ Full backend integration complete!
