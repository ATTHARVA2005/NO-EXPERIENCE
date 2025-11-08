# Curriculum Generation: Hardcoded → Backend Integration

## Before vs After Comparison

### BEFORE: Hardcoded Curriculum 🚫

```tsx
// curriculum-builder/page.tsx (OLD)

const [curriculum] = useState<CurriculumWeek[]>([
  {
    week: 1,
    title: "Fundamentals of Motion",
    duration: 5,
    lessons: [
      { id: "1", title: "Introduction to Motion", duration: 60, topics: ["Basic Concepts", "Velocity", "Speed"] },
      { id: "2", title: "Distance vs Displacement", duration: 45, topics: ["Kinematics", "Vector Analysis"] },
    ],
  },
  {
    week: 2,
    title: "Forces and Newton's Laws",
    duration: 6,
    lessons: [
      { id: "3", title: "Newton's First Law", duration: 50, topics: ["Inertia", "Force Balance"] },
      { id: "4", title: "Newton's Second Law", duration: 55, topics: ["F=ma", "Acceleration"] },
      { id: "5", title: "Newton's Third Law", duration: 45, topics: ["Action-Reaction", "Forces"] },
    ],
  },
  {
    week: 3,
    title: "Energy and Work",
    duration: 5,
    lessons: [
      { id: "6", title: "Kinetic Energy", duration: 50, topics: ["Energy Types", "Motion Energy"] },
      { id: "7", title: "Potential Energy", duration: 55, topics: ["Conservation", "Energy Storage"] },
    ],
  },
])
```

**Problems** ❌
- Same curriculum for every student
- Physics only, no personalization
- No AI generation
- No syllabus analysis
- No database persistence
- Can't track progress
- Can't regenerate

---

### AFTER: Backend + AI Generation ✅

```tsx
// curriculum-builder/page.tsx (NEW)

const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([])

useEffect(() => {
  const loadCurriculum = async () => {
    // 1. Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    
    // 2. Get syllabus if uploaded
    const syllabusContent = sessionStorage.getItem("syllabusContent")
    
    // 3. Call backend API
    const response = await fetch("/api/agents/generate-curriculum", {
      method: "POST",
      body: JSON.stringify({
        studentId: user.id,
        topic: topic || "General Knowledge",
        gradeLevel: gradeLevel || "General",
        learningGoals: learningGoals || undefined,
        syllabus: syllabusContent,
        learningStyle: "visual",
      }),
    })
    
    // 4. Transform and display
    const data = await response.json()
    const weeks = transformLessonsToWeeks(data.lessons)
    setCurriculum(weeks)
  }
  
  loadCurriculum()
}, [])
```

**Benefits** ✅
- Unique curriculum per student
- AI-powered personalization (Gemini)
- Analyzes syllabus content
- Respects grade level
- Incorporates learning goals
- Persists to database
- Tracks progress
- Can regenerate anytime

---

## Complete Integration Map

```
┌─────────────────────────────────────────────────────────────────┐
│                       BEFORE                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │ NEW-SESSION PAGE                        │                   │
│  ├─────────────────────────────────────────┤                   │
│  │ User fills form                         │                   │
│  │ (topic, grade, goals, file)             │                   │
│  │                                         │                   │
│  │ Actions:                                │                   │
│  │ ✓ Validate inputs                       │                   │
│  │ ✓ Read file                             │                   │
│  │ ✓ Store in sessionStorage               │                   │
│  │ ✗ NO DB save                            │                   │
│  │ ✗ NO auth check                         │                   │
│  └─────────────────────────────────────────┘                   │
│              │                                                  │
│              ↓ redirect                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ CURRICULUM-BUILDER PAGE                 │                   │
│  ├─────────────────────────────────────────┤                   │
│  │ Immediate display:                      │                   │
│  │ ✗ Hardcoded 3 weeks of physics          │                   │
│  │ ✗ Same data for all users               │                   │
│  │ ✗ No personalization                    │                   │
│  │ ✗ Uploaded file ignored                 │                   │
│  │ ✗ No AI generation                      │                   │
│  │ ✗ No backend connection                 │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  Database: ✗ Not used                                           │
│  API: ✗ Not used                                                │
│  AI: ✗ Not used                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                       AFTER                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │ NEW-SESSION PAGE                        │                   │
│  ├─────────────────────────────────────────┤                   │
│  │ User fills form                         │                   │
│  │ (topic, grade, goals, file)             │                   │
│  │                                         │                   │
│  │ Actions:                                │                   │
│  │ ✓ Validate inputs                       │                   │
│  │ ✓ Check authentication                  │                   │
│  │ ✓ Read file                             │                   │
│  │ ✓ CREATE learning_session in DB         │                   │
│  │ ✓ Store session ID                      │                   │
│  │ ✓ Store file in sessionStorage          │                   │
│  └─────────────────────────────────────────┘                   │
│              │                                                  │
│              ↓ redirect with query params                       │
│              │                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ CURRICULUM-BUILDER PAGE                                     ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                             ││
│  │ 1. useEffect on mount:                                      ││
│  │    ├─ Show loading animation                               ││
│  │    ├─ Get authenticated user                               ││
│  │    ├─ Get syllabus from sessionStorage                      ││
│  │    └─ Fetch from API...                                    ││
│  │                                                             ││
│  │ 2. API POST /api/agents/generate-curriculum                ││
│  │    ├─ Backend receives request                             ││
│  │    ├─ Calls Gemini AI                                      ││
│  │    ├─ Generates personalized curriculum                    ││
│  │    ├─ Analyzes syllabus if provided                        ││
│  │    ├─ Respects grade level                                 ││
│  │    └─ Returns lessons, resources, assignments              ││
│  │                                                             ││
│  │ 3. Transform response:                                      ││
│  │    ├─ Group lessons into weeks                             ││
│  │    ├─ Calculate duration per week                          ││
│  │    ├─ Extract topics from subtopics                        ││
│  │    └─ Update state                                         ││
│  │                                                             ││
│  │ 4. Display:                                                 ││
│  │    ├─ Hide loading animation                               ││
│  │    ├─ Show week cards                                      ││
│  │    ├─ Show lesson details                                  ││
│  │    ├─ Show stats (lessons, duration, topics)               ││
│  │    └─ Enable action buttons                                ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│              │                                                  │
│              ↓ User clicks "START LEARNING"                    │
│              → /dashboard/learn                                │
│                                                                 │
│  Database: ✓ learning_sessions saved                            │
│            ✓ curriculum_graphs saved                            │
│            ✓ curriculum_analytics saved                         │
│                                                                 │
│  API: ✓ Connected to /api/agents/generate-curriculum            │
│                                                                 │
│  AI: ✓ Gemini 2.0 Flash generates personalized curriculum      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Changes Summary

### Import Changes
```diff
+ import { getSupabaseClient } from '@/lib/supabase-client'
+ import { Loader } from 'lucide-react'
```

### State Changes
```diff
- const [curriculum] = useState([...hardcoded data...])
+ const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([])
+ const [isGenerating, setIsGenerating] = useState(true)
+ const [sessionId, setSessionId] = useState<string | null>(null)
```

### Effect Hook
```diff
+ useEffect(() => {
+   const loadCurriculum = async () => {
+     // Get user
+     // Get syllabus
+     // Call API
+     // Transform
+     // Display
+   }
+   loadCurriculum()
+ }, [])
```

### Rendering
```diff
+ if (isGenerating) return <LoadingScreen />
+ if (curriculum.length === 0) return <EmptyState />
  return <CurriculumDisplay curriculum={curriculum} />
```

---

## Request → Response Flow

### Step 1: Form Submission
```
User Input:
├─ Topic: "Physics"
├─ Grade Level: "Grade 10"
├─ Learning Goals: "Newton's Laws"
├─ Syllabus File: physics_syllabus.pdf (uploaded)
└─ User: john@example.com (authenticated)
```

### Step 2: New Session Created in DB
```
INSERT INTO learning_sessions:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "student_id": "user-abc123",
  "topic": "Physics",
  "grade_level": "Grade 10",
  "learning_goals": "Newton's Laws",
  "status": "active",
  "progress": 0
}
```

### Step 3: Redirect with Params
```
Browser navigates to:
/dashboard/curriculum-builder?topic=Physics&gradeLevel=Grade%2010&learningGoals=Newton's%20Laws
```

### Step 4: API Request
```
POST /api/agents/generate-curriculum
{
  "studentId": "user-abc123",
  "topic": "Physics",
  "gradeLevel": "Grade 10",
  "learningGoals": "Newton's Laws",
  "syllabus": "Chapter 1: Motion and Forces...",
  "learningStyle": "visual"
}
```

### Step 5: AI Generation (Gemini)
```
Gemini receives prompt:
"You are an expert curriculum architect. Create a comprehensive, 
structured curriculum for teaching Physics to Grade 10 students.
Focus on Newton's Laws. Base your curriculum on this syllabus: ..."

Returns:
- 3-5 chapters
- Each with 3-6 topics
- Each with 3-8 concepts
- With prerequisites and difficulty levels
```

### Step 6: API Response
```
{
  "success": true,
  "lessons": [
    {
      "id": "lesson-1",
      "title": "Introduction to Motion",
      "duration": 50,
      "subtopics": [
        { "id": "subtopic-1", "title": "Basic Concepts", "order": 1 },
        { "id": "subtopic-2", "title": "Core Concepts", "order": 2 }
      ]
    },
    { "id": "lesson-2", ... },
    { "id": "lesson-3", ... }
  ],
  "resources": [...],
  "assignments": [...],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Step 7: Frontend Transform
```
lessons array →
group by week (4 lessons per week) →
calculate hours per week →
extract topics from subtopics →

Result: weeks array [
  {
    week: 1,
    title: "Physics - Week 1",
    duration: 3,
    lessons: [ ... 4 lessons ... ]
  },
  {
    week: 2,
    title: "Physics - Week 2",
    duration: 3,
    lessons: [ ... 3 lessons ... ]
  }
]
```

### Step 8: Display
```
UI shows:
✓ Loading animation → hidden
✓ Week cards → visible
✓ Lesson cards → visible
✓ Stats (7 lessons, 6 hrs, 15 topics) → visible
✓ Buttons (START LEARNING, MODIFY DETAILS) → enabled
```

---

## Database State After Integration

### learning_sessions table
```
┌─────────────────────────────────────────────────────────────┐
│ id              │ student_id    │ topic    │ grade_level    │
├─────────────────────────────────────────────────────────────┤
│ 550e8400-...1   │ user-abc123   │ Physics  │ Grade 10       │
│ 550e8400-...2   │ user-abc123   │ Math     │ Grade 9        │
│ 550e8400-...3   │ user-def456   │ Physics  │ Grade 11       │
└─────────────────────────────────────────────────────────────┘
```

### curriculum_graphs table (auto-saved by API)
```
┌─────────────────────────────────────────────────────────────┐
│ session_id      │ graph_data (JSON)                          │
├─────────────────────────────────────────────────────────────┤
│ 550e8400-...1   │ { chapters: [ ... ], topics: [ ... ] }    │
│ 550e8400-...2   │ { chapters: [ ... ], topics: [ ... ] }    │
│ 550e8400-...3   │ { chapters: [ ... ], topics: [ ... ] }    │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Implementation Details

### Authentication Check ✅
```tsx
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  toast({ title: 'Authentication required', variant: 'destructive' })
  router.push('/login')
  return
}
```

### API Call with Context ✅
```tsx
const response = await fetch("/api/agents/generate-curriculum", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    studentId: user.id,        // From auth
    topic: topic,              // From form
    gradeLevel: gradeLevel,    // From form
    learningGoals: learningGoals, // From form
    syllabus: syllabusContent, // From uploaded file
    learningStyle: "visual"    // Default
  }),
})
```

### Error Handling ✅
```tsx
if (!response.ok) {
  const error = await response.json()
  throw new Error(error.error || "Failed to generate curriculum")
}

// ... catch block
catch (error: any) {
  toast({ title: "Failed to generate curriculum", description: error.message })
  setTimeout(() => router.back(), 2000)
}
```

### Loading UX ✅
```tsx
if (isGenerating) {
  return (
    <div className="flex items-center justify-center">
      <Sparkles className="animate-pulse" />
      <p>GENERATING YOUR PERSONALIZED CURRICULUM</p>
    </div>
  )
}
```

---

## Success Metrics

- ✅ **Personalization**: Each student gets unique curriculum
- ✅ **Intelligence**: AI respects grade level and learning goals
- ✅ **Persistence**: Data saved in Supabase
- ✅ **Security**: Only authenticated users can create sessions
- ✅ **Reliability**: Error handling with graceful fallback
- ✅ **UX**: Loading animation + success toast
- ✅ **Debugging**: Console logging for troubleshooting
- ✅ **Scalability**: API-driven architecture

---

## Result: ✅ FULL BACKEND INTEGRATION COMPLETE

```
BEFORE: Hardcoded, static, no AI, no DB
AFTER:  AI-generated, personalized, persistent, secure

THE CURRICULUM GENERATION IS NOW LIVE! 🚀
```
