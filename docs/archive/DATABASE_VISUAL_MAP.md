# 🗺️ Database Schema Visual Map

## 📊 Complete Schema Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPABASE AUTH LAYER                          │
│                          auth.users (id)                            │
│                    (Built-in Authentication)                        │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       │ 1:1 Relationship
                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     STUDENT PROFILES TABLE                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ • id (PK) → auth.users(id)                                   │  │
│  │ • name, grade_level, learning_style                          │  │
│  │ • average_score, total_sessions, engagement_score            │  │
│  │ • topics_studied[], mastered_topics[], weak_areas[]          │  │
│  │ • preferences (JSONB), settings (JSONB)                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┬─────────────┐
        │              │              │              │             │
        ↓              ↓              ↓              ↓             ↓
┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐
│  LEARNING   │ │   CONCEPT   │ │PERFORMANCE│ │FEEDBACK  │ │ ACTIVITY   │
│  SESSIONS   │ │   MASTERY   │ │ ANALYTICS │ │ HISTORY  │ │    LOG     │
│             │ │             │ │           │ │          │ │            │
│ session_id  │ │ concept     │ │  topic    │ │feedback  │ │ activity   │
│ topic       │ │ mastery_%   │ │  scores   │ │ content  │ │ tracking   │
│ curriculum  │ │ attempts    │ │  trends   │ │ insights │ │ audit      │
│ progress    │ │ level       │ │  stats    │ │ recs     │ │ trail      │
└──────┬──────┘ └─────────────┘ └──────────┘ └──────────┘ └────────────┘
       │
       │ 1:N Relationship (One session has many...)
       │
       ├────────────────────┬────────────────┬─────────────────┬──────────┐
       │                    │                │                 │          │
       ↓                    ↓                ↓                 ↓          ↓
┌──────────────┐    ┌──────────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────┐
│   LESSON     │    │ ASSESSMENTS  │  │ASSIGNMENTS│  │   TUTOR     │  │CURRICULUM  │
│   PROGRESS   │    │              │  │          │  │  SESSIONS   │  │ ANALYTICS  │
│              │    │ • Questions  │  │• Title   │  │             │  │            │
│• lesson_id   │    │ • Answers    │  │• Games   │  │• Messages   │  │• Quality   │
│• progress_%  │    │ • Score      │  │• Results │  │• Concepts   │  │  Score     │
│• status      │    │ • Weak areas │  │• Feedback│  │• Engagement │  │• Teacher   │
│• subtopics   │    │ • Timing     │  │• Points  │  │• Notes      │  │  Review    │
└──────┬───────┘    └──────────────┘  └──────────┘  └─────────────┘  └────────────┘
       │
       │ 1:N Relationship (One lesson has many subtopics)
       │
       ├──────────────────────┬──────────────────────┐
       │                      │                      │
       ↓                      ↓                      ↓
┌──────────────┐    ┌──────────────────┐    ┌────────────────┐
│  SUBTOPIC    │    │  LESSON CONTEXT  │    │   RESOURCES    │
│  PROGRESS    │    │                  │    │ RECOMMENDATIONS│
│              │    │ • Concepts       │    │                │
│• subtopic_id │    │   taught[]       │    │• Resource      │
│• completed   │    │ • Examples[]     │    │• Relevance     │
│• concepts[]  │    │ • Questions[]    │    │• Priority      │
│• order       │    │ • Tutor notes    │    │• Viewed        │
└──────────────┘    └──────────────────┘    └───────┬────────┘
                                                     │
                                                     │ N:1
                                                     ↓
                                            ┌────────────────┐
                                            │   RESOURCES    │
                                            │    (Shared)    │
                                            │                │
                                            │• Title, URL    │
                                            │• Type, Topic   │
                                            │• Difficulty    │
                                            │• Rating        │
                                            └────────────────┘
```

---

## 🔄 Data Flow Example: Student Learning Journey

```
1. USER SIGNS UP
   ├─> auth.users (Supabase creates)
   └─> student_profiles (App creates)
       • name: "John Doe"
       • grade_level: 9
       • learning_style: "visual"

2. STARTS LEARNING SESSION
   └─> learning_sessions
       • topic: "Algebra"
       • difficulty: "medium"
       • status: "active"
       ├─> lesson_progress (created)
       │   • lesson_id: "lesson_1"
       │   • progress_percentage: 0
       │   ├─> subtopic_progress (checkpoints)
       │   │   • subtopic_1: incomplete
       │   │   • subtopic_2: incomplete
       │   └─> lesson_context (AI memory)
       │       • concepts_taught: []
       │       • examples_used: []
       └─> tutor_sessions
           • conversation_history: []
           • message_count: 0

3. COMPLETES LESSON
   └─> lesson_progress (updated)
       • progress_percentage: 100
       • status: "completed"
       └─> subtopic_progress (all marked complete)

4. TAKES ASSESSMENT
   └─> assessments
       • topic: "Algebra"
       • questions: [...]
       • score: 85
       • weak_concepts: ["quadratic equations"]
       └─> feedback_history
           • weak_concepts: ["quadratic equations"]
           • recommendations: ["practice more"]

5. GETS ASSIGNMENT
   └─> assignments
       • title: "Practice Problems"
       • mini_games: [...]
       • status: "pending"
       └─> (completes) assignments (updated)
           • status: "completed"
           • score: 90
           • points_earned: 45

6. SYSTEM UPDATES ANALYTICS
   ├─> concept_mastery
   │   • concept: "linear equations"
   │   • mastery_level: "proficient"
   │   • mastery_percentage: 85
   ├─> performance_analytics
   │   • average_score: 87.5
   │   • topics_covered: ["Algebra"]
   │   • learning_velocity: 2.5
   └─> student_profiles (updated)
       • average_score: 87.5
       • total_sessions: 1
       • mastered_topics: ["linear equations"]

7. TEACHER REVIEWS
   └─> curriculum_analytics
       • curriculum_quality_score: 0.92
       • teacher_reviewed: true
       • teacher_notes: "Excellent progress"
```

---

## 🔐 Row Level Security (RLS) Visualization

```
┌────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                          │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              ROW LEVEL SECURITY                      │ │
│  │                                                      │ │
│  │  Query: SELECT * FROM learning_sessions             │ │
│  │         WHERE student_id = ?                        │ │
│  │                                                      │ │
│  │  ┌───────────────────────────────────────┐          │ │
│  │  │   RLS Policy Applied Automatically    │          │ │
│  │  │                                       │          │ │
│  │  │   auth.uid() = student_id             │          │ │
│  │  │                                       │          │ │
│  │  │   ✅ PASS: Returns user's data only   │          │ │
│  │  │   ❌ FAIL: Returns empty set          │          │ │
│  │  └───────────────────────────────────────┘          │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
         │                                    │
         │ User A (id: abc-123)              │ User B (id: def-456)
         ↓                                    ↓
┌─────────────────────┐           ┌─────────────────────┐
│ User A sees:        │           │ User B sees:        │
│                     │           │                     │
│ • Their sessions    │           │ • Their sessions    │
│ • Their assessments │           │ • Their assessments │
│ • Their assignments │           │ • Their assignments │
│ • Their progress    │           │ • Their progress    │
│                     │           │                     │
│ ❌ Cannot see       │           │ ❌ Cannot see       │
│    User B's data    │           │    User A's data    │
└─────────────────────┘           └─────────────────────┘
```

---

## ⚡ Query Performance with Indexes

```
QUERY: Get student's recent assessments
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT * FROM assessments
WHERE student_id = 'abc-123'
ORDER BY created_at DESC
LIMIT 10;

┌────────────────────────────────────────────────┐
│          WITHOUT INDEXES                       │
│                                                │
│  ⚠️  Seq Scan on assessments                  │
│      Filter: (student_id = 'abc-123')         │
│      Rows: Scan all rows (~1,000,000)         │
│      Time: ~2000ms                             │
│                                                │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│          WITH INDEXES ✅                       │
│                                                │
│  ⚡ Index Scan using                           │
│     idx_assessments_student                    │
│     + idx_assessments_created                  │
│      Rows: Only user's rows (~10)             │
│      Time: ~5ms (400x faster!)                 │
│                                                │
└────────────────────────────────────────────────┘

Index Used:
CREATE INDEX idx_assessments_student 
  ON assessments(student_id);
CREATE INDEX idx_assessments_created 
  ON assessments(created_at DESC);
```

---

## 📈 Common Query Patterns

### 1. **Student Dashboard**
```sql
-- Get student overview
SELECT 
  sp.*,
  COUNT(DISTINCT ls.id) as active_sessions,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'pending') as pending_assignments,
  COALESCE(AVG(ass.score), 0) as recent_avg_score
FROM student_profiles sp
LEFT JOIN learning_sessions ls ON sp.id = ls.student_id AND ls.status = 'active'
LEFT JOIN assignments a ON sp.id = a.student_id
LEFT JOIN assessments ass ON sp.id = ass.student_id 
  AND ass.completed_at > NOW() - INTERVAL '7 days'
WHERE sp.id = auth.uid()
GROUP BY sp.id;

Indexes Used: ✅
• idx_learning_sessions_student
• idx_learning_sessions_status
• idx_assignments_student
• idx_assignments_status
• idx_assessments_student
```

### 2. **Lesson Progress**
```sql
-- Get lesson with all subtopics
SELECT 
  lp.*,
  array_agg(sp.*) as subtopics,
  lc.* as context
FROM lesson_progress lp
LEFT JOIN subtopic_progress sp ON lp.id = sp.lesson_progress_id
LEFT JOIN lesson_context lc ON lp.id = lc.lesson_progress_id
WHERE lp.student_id = auth.uid()
  AND lp.session_id = $1
GROUP BY lp.id, lc.id;

Indexes Used: ✅
• idx_lesson_progress_student
• idx_lesson_progress_session
• idx_subtopic_progress_lesson
• idx_lesson_context_lesson
```

### 3. **Performance Analytics**
```sql
-- Get student performance trends
SELECT 
  topic,
  average_score,
  score_trend,
  learning_velocity,
  streak_days
FROM performance_analytics
WHERE student_id = auth.uid()
ORDER BY last_session_date DESC;

Indexes Used: ✅
• idx_performance_student
• idx_performance_topic
```

---

## 🎯 Table Relationships Quick Reference

| Parent Table | Child Tables | Relationship | Cascade |
|-------------|-------------|--------------|---------|
| `auth.users` | `student_profiles` | 1:1 | DELETE |
| `auth.users` | `learning_sessions` | 1:N | DELETE |
| `auth.users` | `assessments` | 1:N | DELETE |
| `auth.users` | `assignments` | 1:N | DELETE |
| `auth.users` | `concept_mastery` | 1:N | DELETE |
| `learning_sessions` | `lesson_progress` | 1:N | DELETE |
| `learning_sessions` | `assessments` | 1:N | DELETE |
| `learning_sessions` | `tutor_sessions` | 1:N | DELETE |
| `lesson_progress` | `subtopic_progress` | 1:N | DELETE |
| `lesson_progress` | `lesson_context` | 1:1 | DELETE |
| `resources` | `resource_recommendations` | 1:N | DELETE |

**Cascade Behavior:**
- If user deleted → All their data deleted
- If session deleted → All related progress deleted
- If lesson deleted → All subtopics deleted
- Maintains referential integrity

---

## 🔧 Helper Functions Available

### 1. **Update Student Statistics**
```sql
-- Call after major events (assessment complete, assignment done)
SELECT update_student_stats('user-id-here');

-- Updates:
-- • total_sessions
-- • completed_assignments
-- • average_score
-- • topics_studied[]
-- • mastered_topics[]
```

---

## 🎨 Color Coding Legend

```
┌─────────────────────────────────────────┐
│  TABLE TYPE COLORS                      │
├─────────────────────────────────────────┤
│  🟦 CORE: Student profiles, sessions    │
│  🟩 TRACKING: Progress, lessons         │
│  🟨 ASSESSMENT: Quizzes, assignments    │
│  🟧 ANALYTICS: Performance, mastery     │
│  🟥 SYSTEM: Activity log, resources     │
└─────────────────────────────────────────┘
```

---

## 📦 Table Sizes (Expected Growth)

| Table | Per User | Per Session | Total Est. |
|-------|----------|-------------|------------|
| `student_profiles` | 1 | - | 10,000 |
| `learning_sessions` | ~20 | 1 | 200,000 |
| `lesson_progress` | ~100 | ~5 | 1M |
| `subtopic_progress` | ~500 | ~25 | 5M |
| `assessments` | ~50 | ~2-3 | 500K |
| `assignments` | ~100 | ~5 | 1M |
| `activity_log` | ~1000 | ~50 | 10M |

**Storage Optimization:**
- Indexes: ~30% of data size
- JSONB columns: Compressed automatically
- Historical data: Consider archiving after 1 year

---

**Created:** November 7, 2025  
**Version:** 1.0  
**Format:** Visual Schema Map  
**Purpose:** Quick reference for database structure
