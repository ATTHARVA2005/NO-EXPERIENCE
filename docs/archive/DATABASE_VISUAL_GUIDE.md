# 📊 DATABASE SCHEMA VISUAL GUIDE

## 🎯 Complete Database Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE AUTHENTICATION                      │
│                        auth.users                               │
│                     ┌─────────────┐                            │
│                     │ id (UUID)   │ ← Primary Authentication    │
│                     │ email       │                            │
│                     │ created_at  │                            │
│                     └──────┬──────┘                            │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │ REFERENCES
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT PROFILE (Hub)                       │
│                    student_profiles                             │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID) ← auth.users(id)                                     │
│ name, email, grade_level                                        │
│ learning_style (visual/auditory/kinesthetic/reading)            │
│ average_score, total_sessions, completed_assignments            │
│ current_streak, total_learning_time                            │
│ topics_studied[], mastered_topics[], weak_areas[]              │
│ last_activity_at, preferences{json}                            │
└──────┬──────────────────────────────────────────────────────────┘
       │
       │ All child tables link here via student_id
       │
       ├─────────────────────────────────────────────────────────┐
       │                                                          │
       ↓                                                          ↓
┌──────────────────────┐                              ┌─────────────────────┐
│  LEARNING SESSIONS   │                              │    ASSESSMENTS      │
│  learning_sessions   │                              │    assessments      │
├──────────────────────┤                              ├─────────────────────┤
│ id (UUID)            │                              │ id (UUID)           │
│ student_id → profile │                              │ student_id → profile│
│ session_id (unique)  │                              │ session_id → session│
│ topic, grade_level   │                              │ topic, difficulty   │
│ curriculum_plan{}    │                              │ questions[], answers│
│ tutor_messages[]     │←──┐                          │ score, percentage   │
│ status, progress%    │   │                          │ weak_concepts[]     │
│ time_spent_minutes   │   │                          │ strong_concepts[]   │
│ concepts_covered[]   │   │                          │ feedback_data{}     │
│ learning_goals[]     │   │                          │ status, created_at  │
└──────┬───────────────┘   │                          └──────┬──────────────┘
       │                   │                                 │
       │                   │                                 │
       ↓                   │                                 ↓
┌──────────────────────┐   │                          ┌─────────────────────┐
│    ASSIGNMENTS       │   │                          │  FEEDBACK HISTORY   │
│    assignments       │   │                          │  feedback_history   │
├──────────────────────┤   │                          ├─────────────────────┤
│ id (UUID)            │   │                          │ id (UUID)           │
│ student_id → profile │   │                          │ student_id → profile│
│ session_id → session │   │                          │ session_id → session│
│ title, topic         │   │                          │ assessment_id       │
│ difficulty           │   │                          │ assignment_id       │
│ mini_games[]         │   │                          │ feedback_type       │
│ score, percent_correct│   │                          │ weak_concepts[]     │
│ game_results[]       │   │                          │ recommendations[]   │
│ weak_concepts[]      │   │                          │ engagement_level    │
│ strong_concepts[]    │   │                          │ feedback_content{}  │
│ time_spent_seconds   │   │                          │ created_at          │
└──────────────────────┘   │                          └─────────────────────┘
                           │
       ┌───────────────────┘
       │
       ↓
┌──────────────────────┐                              ┌─────────────────────┐
│   TUTOR SESSIONS     │                              │  CONCEPT MASTERY    │
│   tutor_sessions     │                              │  concept_mastery    │
├──────────────────────┤                              ├─────────────────────┤
│ id (UUID)            │                              │ id (UUID)           │
│ student_id → profile │                              │ student_id → profile│
│ learning_session_id  │                              │ concept, topic      │
│ session_id           │                              │ mastery_level       │
│ conversation_history│                               │ - novice            │
│ message_count        │                              │ - beginner          │
│ topics_covered[]     │                              │ - practicing        │
│ struggling_areas[]   │                              │ - proficient        │
│ mastered_areas[]     │                              │ - mastered          │
│ engagement_score     │                              │ success_rate        │
│ total_duration_mins  │                              │ total_attempts      │
└──────────────────────┘                              │ recent_scores[]     │
                                                      │ trend (improving)   │
┌──────────────────────┐                              │ last_practiced_at   │
│ PERFORMANCE ANALYTICS│                              └─────────────────────┘
│ performance_analytics│
├──────────────────────┤                              ┌─────────────────────┐
│ id (UUID)            │                              │   ACTIVITY LOG      │
│ student_id → profile │                              │   activity_log      │
│ topic, time_period   │                              ├─────────────────────┤
│ session_count        │                              │ id (UUID)           │
│ average_score        │                              │ student_id → profile│
│ engagement_level     │                              │ activity_type       │
│ topics_covered[]     │                              │ activity_category   │
│ weak_concepts[]      │                              │ activity_description│
│ strong_concepts[]    │                              │ activity_data{}     │
│ score_trend          │                              │ ip_address          │
│ learning_velocity    │                              │ user_agent          │
│ recommended_topics[] │                              │ created_at          │
└──────────────────────┘                              └─────────────────────┘

┌──────────────────────┐                              ┌─────────────────────┐
│     RESOURCES        │                              │ RESOURCE RECS       │
│     resources        │◄─────────────────────────────┤ resource_recommen.. │
├──────────────────────┤                              ├─────────────────────┤
│ id (UUID)            │                              │ id (UUID)           │
│ title, description   │                              │ student_id → profile│
│ type (video/article) │                              │ resource_id → res   │
│ url, topic           │                              │ relevance_score     │
│ difficulty           │                              │ reason, priority    │
│ duration_minutes     │                              │ viewed, completed   │
│ tags[], keywords[]   │                              │ related_session_id  │
│ rating, view_count   │                              │ was_helpful         │
│ is_active            │                              │ recommended_at      │
└──────────────────────┘                              └─────────────────────┘
```

---

## 🔗 Relationship Key

```
→   Foreign Key Reference
[]  Array/List field
{}  JSONB object
←   Points back to
```

---

## 📊 Data Flow Examples

### **Example 1: Student Starts Learning Session**

```
User Signs In
    ↓
auth.users (Supabase Auth)
    ↓
Check student_profiles (exists?)
    ↓
Check learning_sessions (existing for topic?)
    ↓
IF EXISTS: Reuse session
IF NOT: Create new session
    ↓
learning_sessions created/updated
    ↓
tutor_sessions created for conversation
    ↓
activity_log records "session_start"
    ↓
Student sees dashboard
```

### **Example 2: Student Takes Assessment**

```
Student clicks "Take Assessment"
    ↓
assessments record created
    ├─ linked to student_id
    ├─ linked to session_id
    └─ questions loaded
    ↓
Student answers questions
    ↓
assessments updated with:
    ├─ student_answers[]
    ├─ score calculated
    ├─ weak_concepts identified
    └─ strong_concepts identified
    ↓
feedback_history created
    ├─ weak_concepts
    ├─ recommendations
    └─ next steps
    ↓
concept_mastery updated for each concept
    ├─ attempts++
    ├─ success_rate recalculated
    └─ mastery_level adjusted
    ↓
performance_analytics updated
    ├─ average_score
    ├─ session_count
    └─ trends calculated
    ↓
student_profiles updated
    ├─ average_score
    ├─ total_assessments++
    └─ last_activity_at
    ↓
activity_log records "assessment_complete"
```

### **Example 3: Getting Dashboard Data**

```
User opens dashboard
    ↓
SELECT FROM student_dashboard VIEW
    ↓
Automatically joins:
    ├─ student_profiles (basic info)
    ├─ learning_sessions (active count)
    ├─ assignments (pending count)
    └─ assessments (recent average)
    ↓
Returns single row with:
    ├─ Student name, grade
    ├─ Average score, streak
    ├─ Total sessions
    ├─ Active session count
    ├─ Pending assignments
    └─ Recent performance
    ↓
Display dashboard in < 100ms
```

---

## 🎯 Key Indexes for Performance

### **Most Important Indexes**

1. **student_id indexes** (on every table)
   - Instant lookup of all user data
   - Example: `idx_learning_sessions_student`

2. **Composite indexes**
   - student_id + topic
   - student_id + status
   - Example: `idx_learning_sessions_student_topic`

3. **Status indexes**
   - Quick filtering by status
   - Example: `idx_learning_sessions_status`

4. **Timestamp indexes**
   - Chronological sorting
   - Example: `idx_learning_sessions_created`

---

## 🔒 Security (RLS) Flow

```
User makes request
    ↓
Supabase checks auth.uid()
    ↓
RLS Policy checks:
    ├─ Is user authenticated?
    └─ Does auth.uid() = student_id?
    ↓
IF YES: Allow access
IF NO: Deny (403 error)
    ↓
User only sees their own data
```

**Example Policy:**
```sql
CREATE POLICY "Students can view own sessions"
ON learning_sessions FOR SELECT
USING (auth.uid() = student_id);
```

This means:
- ✅ User can see sessions where `student_id` = their UUID
- ❌ User CANNOT see other users' sessions
- ✅ Automatic filtering by Supabase

---

## 📈 Scalability Design

### **Current Design Supports:**

| Metric | Capacity | Notes |
|--------|----------|-------|
| Students | Millions | Indexed by UUID |
| Sessions per student | Unlimited | One per topic active |
| Assessments per student | Thousands | Indexed by date |
| Messages per session | 10,000+ | JSONB storage |
| Query time | < 100ms | With proper indexes |
| Storage | Terabytes | Supabase default |

### **Growth Pattern:**

```
Stage 1: 100 students
    └─ All queries < 10ms
    └─ No optimization needed

Stage 2: 1,000 students
    └─ Queries < 50ms
    └─ Indexes fully utilized

Stage 3: 10,000 students
    └─ Queries < 100ms
    └─ Consider table partitioning

Stage 4: 100,000+ students
    └─ Queries < 200ms
    └─ Enable connection pooling
    └─ Add read replicas
    └─ Partition by date ranges
```

---

## 🎨 View Architecture

### **Pre-built Views for Easy Queries:**

```
student_dashboard
    ↓ Joins
    ├─ student_profiles
    ├─ learning_sessions (COUNT active)
    ├─ assignments (COUNT pending)
    └─ assessments (AVG recent)
    ↓ Returns
    └─ Complete dashboard in 1 query

session_history
    ↓ Joins
    ├─ learning_sessions
    └─ student_profiles (for name)
    ↓ Returns
    └─ All sessions with details

assessment_performance
    ↓ Joins
    ├─ assessments
    └─ student_profiles
    ↓ Calculates
    └─ Performance level (Excellent/Good/etc)

learning_progress
    ↓ Joins
    ├─ concept_mastery
    └─ student_profiles
    ↓ Groups by topic
    └─ Mastery statistics
```

---

## 🔧 Helper Functions

### **Available Functions:**

1. **`get_student_history(user_uuid)`**
   ```
   Returns ALL activity:
   - Learning sessions
   - Assessments  
   - Assignments
   Sorted by date
   ```

2. **`update_student_stats(user_uuid)`**
   ```
   Recalculates:
   - Total sessions
   - Average score
   - Total time
   - Topics studied
   - Mastered topics
   ```

---

## 🎯 Quick Reference: Find Any Data

### **Find All User Data:**
```sql
-- Profile
SELECT * FROM student_profiles WHERE id = 'uuid';

-- Sessions
SELECT * FROM learning_sessions WHERE student_id = 'uuid';

-- Assessments
SELECT * FROM assessments WHERE student_id = 'uuid';

-- Assignments
SELECT * FROM assignments WHERE student_id = 'uuid';

-- Feedback
SELECT * FROM feedback_history WHERE student_id = 'uuid';

-- Conversations
SELECT * FROM tutor_sessions WHERE student_id = 'uuid';

-- Progress
SELECT * FROM concept_mastery WHERE student_id = 'uuid';

-- Analytics
SELECT * FROM performance_analytics WHERE student_id = 'uuid';

-- Activity
SELECT * FROM activity_log WHERE student_id = 'uuid';
```

### **Find All Data for Topic:**
```sql
-- Sessions for topic
SELECT * FROM learning_sessions 
WHERE student_id = 'uuid' AND topic = 'Photosynthesis';

-- Assessments for topic
SELECT * FROM assessments 
WHERE student_id = 'uuid' AND topic = 'Photosynthesis';

-- Concept mastery for topic
SELECT * FROM concept_mastery 
WHERE student_id = 'uuid' AND topic = 'Photosynthesis';
```

---

## ✅ Verification Checklist

After running the SQL scripts, verify:

- [ ] All 11 tables exist
- [ ] Foreign keys point to student_profiles
- [ ] RLS enabled on all user tables
- [ ] Indexes created (50+ total)
- [ ] Views accessible (4 views)
- [ ] Helper functions work
- [ ] Triggers active (auto timestamps)
- [ ] Can insert test data
- [ ] Can query views
- [ ] Dashboard loads quickly

---

This visual guide shows how all the pieces fit together in your optimized database!
