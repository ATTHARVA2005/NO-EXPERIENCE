# ✅ CURRICULUM GENERATION: HARDCODED → BACKEND

## What Changed

### BEFORE (Hardcoded)
```tsx
// curriculum-builder/page.tsx
const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([
  {
    week: 1,
    title: "Fundamentals of Motion",
    duration: 5,
    lessons: [
      { id: "1", title: "Introduction to Motion", duration: 60, topics: [...] },
      { id: "2", title: "Distance vs Displacement", duration: 45, topics: [...] },
    ],
  },
  // ... 3 more hardcoded weeks ...
])
```
❌ **Problem**: Same curriculum for every student, no AI personalization

---

### AFTER (Backend Integration)
```tsx
// Step 1: NEW-SESSION creates learning_session record
const { data: session } = await supabase
  .from('learning_sessions')
  .insert({
    student_id: user.id,
    topic: "Physics",
    grade_level: "Grade 10",
    learning_goals: "Newton's Laws",
    status: "active",
  })

// Step 2: CURRICULUM-BUILDER calls AI agent
const response = await fetch("/api/agents/generate-curriculum", {
  method: "POST",
  body: JSON.stringify({
    studentId: user.id,
    topic: "Physics",
    gradeLevel: "Grade 10",
    learningGoals: "Newton's Laws",
    syllabus: uploadedSyllabusContent,
  }),
})

// Step 3: Transform and display generated curriculum
const data = await response.json()
setCurriculum(transformLessonsToWeeks(data.lessons))
```
✅ **Result**: AI-generated, personalized curriculum per student with backend persistence

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  NEW-SESSION PAGE              CURRICULUM-BUILDER      │
│  ┌──────────────┐              ┌─────────────┐         │
│  │ 1. Form      │──────────→   │ 2. Loading  │         │
│  │ 2. Validate  │              │ 3. Call API │         │
│  │ 3. Upload    │              │ 4. Display  │         │
│  │ 4. Create    │              └─────────────┘         │
│  │    Session   │                                      │
│  └──────────────┘                                      │
│         │                                              │
│         │ Supabase.auth.getUser()                      │
│         │ Supabase.from("learning_sessions").insert()  │
│         │ sessionStorage.setItem()                     │
│         ↓                                              │
│    ┌─────────────────────────────────────┐            │
│    │ Supabase Client                     │            │
│    │ - Auth (get current user)           │            │
│    │ - Database (CRUD sessions)          │            │
│    │ - Store (syllabus files)            │            │
│    └─────────────────────────────────────┘            │
│                    │                                   │
└────────────────────┼───────────────────────────────────┘
                     │
            ┌────────▼────────┐
            │  SUPABASE DB    │
            ├─────────────────┤
            │ Auth Users      │
            │ Student Profiles│
            │ Learning        │
            │ Sessions ⭐     │
            │ Curriculum Data │
            └─────────────────┘
                     ▲
                     │
            ┌────────┴────────┐
            │  BACKEND (API)  │
            ├─────────────────┤
            │ /api/agents/    │
            │ generate-       │
            │ curriculum ⭐   │
            │                 │
            │ Input: topic,   │
            │ gradeLevel,     │
            │ learningGoals,  │
            │ syllabus        │
            │                 │
            │ Output:         │
            │ weeks/lessons   │
            │ resources       │
            │ assignments     │
            └─────────────────┘
                     ▲
                     │
            ┌────────┴────────┐
            │  AI (Gemini)    │
            ├─────────────────┤
            │ Curriculum      │
            │ Agent           │
            │ (generateObject)│
            │ - Analyzes      │
            │   topic         │
            │ - Considers     │
            │   grade level   │
            │ - Structures    │
            │   curriculum    │
            │ - Returns JSON  │
            └─────────────────┘
```

---

## Code Changes Quick Reference

### File 1: `app/dashboard/new-session/page.tsx`
```diff
+ import { getSupabaseClient } from '@/lib/supabase-client'

+ const supabase = getSupabaseClient()

  const handleSubmit = async () => {
+   const { data: { user } } = await supabase.auth.getUser()
+   
+   const { data: session } = await supabase
+     .from('learning_sessions')
+     .insert({
+       student_id: user.id,
+       topic: topic || 'Uploaded Content',
+       grade_level: gradeLevel || 'General',
+       learning_goals: learningGoals || '',
+       status: 'active',
+       progress: 0,
+     })
+     .select()
+     .single()
+   
+   if (session?.id) {
+     sessionStorage.setItem('currentSessionId', session.id)
+   }
  }
```

### File 2: `app/dashboard/curriculum-builder/page.tsx`
```diff
+ import { getSupabaseClient } from "@/lib/supabase-client"
+ import { Loader } from "lucide-react"

+ const supabase = getSupabaseClient()
+ 
+ const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([])
+ const [isGenerating, setIsGenerating] = useState(true)
+ const [sessionId, setSessionId] = useState<string | null>(null)

+ useEffect(() => {
+   const loadCurriculum = async () => {
+     const { data: { user } } = await supabase.auth.getUser()
+     const syllabusContent = sessionStorage.getItem("syllabusContent")
+     
+     const response = await fetch("/api/agents/generate-curriculum", {
+       method: "POST",
+       headers: { "Content-Type": "application/json" },
+       body: JSON.stringify({
+         studentId: user.id,
+         topic: topic || "General Knowledge",
+         gradeLevel: gradeLevel || "General",
+         learningGoals: learningGoals || undefined,
+         syllabus: syllabusContent,
+         learningStyle: "visual",
+       }),
+     })
+     
+     const data = await response.json()
+     const weeks = transformLessonsToWeeks(data.lessons)
+     setCurriculum(weeks)
+     setSessionId(data.sessionId)
+   }
+   
+   loadCurriculum()
+ }, [])

+ if (isGenerating) {
+   return <LoadingScreen />
+ }
```

---

## Database: What Gets Stored

### `learning_sessions` Table
```sql
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  topic TEXT NOT NULL,
  grade_level VARCHAR(50),
  learning_goals TEXT,
  status VARCHAR(50) DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Example Record After Submission:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "student_id": "user-abc123",
  "topic": "Physics",
  "grade_level": "Grade 10",
  "learning_goals": "Newton's Laws",
  "status": "active",
  "progress": 0,
  "created_at": "2025-11-08T10:30:00Z",
  "updated_at": "2025-11-08T10:30:00Z"
}
```

---

## API Request/Response Example

### Request to `/api/agents/generate-curriculum`
```json
{
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "topic": "Physics",
  "gradeLevel": "Grade 10",
  "learningGoals": "Newton's Laws",
  "syllabus": "Chapter 1: Motion...",
  "learningStyle": "visual"
}
```

### Response from Curriculum Agent
```json
{
  "success": true,
  "lessons": [
    {
      "id": "lesson-1",
      "title": "Introduction to Motion",
      "duration": 50,
      "completed": false,
      "content": "Introduce motion concept with examples...",
      "subtopics": [
        {
          "id": "subtopic-1-1",
          "title": "Introduction & Overview",
          "completed": false,
          "order": 1
        },
        {
          "id": "subtopic-1-2",
          "title": "Core Concepts",
          "completed": false,
          "order": 2
        }
      ],
      "progressPercentage": 0
    },
    {
      "id": "lesson-2",
      "title": "Distance vs Displacement",
      "duration": 45,
      ...
    }
  ],
  "resources": [
    {
      "id": "resource-1",
      "title": "Physics overview video",
      "type": "video",
      "url": "https://youtube.com/...",
      "duration": 15
    }
  ],
  "assignments": [
    {
      "id": "assignment-1",
      "title": "Gamified practice: Physics",
      "description": "Complete interactive challenge...",
      "topic": "Physics",
      "status": "pending",
      "dueDate": "2025-11-11T10:30:00Z"
    }
  ],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "usedFallback": false
}
```

---

## Flow: Step-by-Step

### 1️⃣ User Submits Form (NEW-SESSION)
```
Input: Physics | Grade 10 | Newton's Laws | syllabus.pdf
              ↓
         Validation ✓
              ↓
     Get Auth User ✓
              ↓
   Create learning_session in DB ✓
              ↓
  Store session ID in sessionStorage ✓
              ↓
   Navigate to curriculum-builder
```

### 2️⃣ Curriculum Generates (CURRICULUM-BUILDER)
```
Page loads with query params: ?topic=Physics&gradeLevel=Grade 10
              ↓
   Show loading animation
              ↓
   Get authenticated user
              ↓
   Fetch syllabus from sessionStorage
              ↓
   POST to /api/agents/generate-curriculum
              ↓
   AI Agent (Gemini) generates curriculum
              ↓
   Receive lessons, resources, assignments
              ↓
   Transform into week structure
              ↓
   Display curriculum with stats
              ↓
 User can now click "START LEARNING"
```

---

## Error Handling

### If User Not Authenticated
```
new-session page:
- Check: supabase.auth.getUser()
- Result: null
- Action: toast error + redirect to /login
```

### If Session Creation Fails
```
- Try to create record in learning_sessions
- If error: log it, continue anyway
- Reason: curriculum generation doesn't require existing session
- Note: session ID will be null, but curriculum still generates
```

### If Curriculum API Fails
```
curriculum-builder page:
- response.ok = false
- Show empty state: "Unable to generate curriculum"
- Toast error with details
- Redirect back to new-session after 2 seconds
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Data Source** | Hardcoded array | Backend API |
| **Personalization** | None (static) | Full (per student) |
| **AI Generation** | None | Gemini 2.0 Flash |
| **Database** | No | Supabase (learning_sessions) |
| **Persistence** | sessionStorage only | Permanent DB records |
| **Syllabus Support** | Limited | Full PDF/DOC analysis |
| **Loading UX** | Instant | Animated spinner |
| **Error Handling** | None | Comprehensive |
| **Session Tracking** | No | Yes (session_id) |

**Result**: ✅ **Fully functional AI-powered curriculum generation connected to backend!**
