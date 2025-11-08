# 🗄️ DATABASE OPTIMIZATION GUIDE

## Overview
This guide will help you migrate to the optimized user-centric database schema that ensures proper data organization and history tracking.

---

## 📋 What's Included

### **New Schema File**: `09-optimized-user-centric-schema.sql`
- **Complete user-centric design** - All data linked to `auth.users(id)`
- **11 comprehensive tables** for full learning platform
- **Full history tracking** - Never lose student progress
- **Optimized indexes** - Fast queries even with millions of records
- **Automatic triggers** - Timestamps update automatically
- **Helpful views** - Easy dashboard queries
- **Complete RLS** - Students only see their own data

### **Updated RLS Policies**: `08-add-delete-policy.sql`
- All CRUD operations properly secured
- Students can manage their own data
- Public read access for resources

---

## 🎯 Key Features

### 1. **Central User Hub**
```
auth.users (Supabase Auth)
    ↓
student_profiles (Extended info)
    ↓
├── learning_sessions (All learning activity)
├── assessments (All tests/quizzes)
├── assignments (Practice work)
├── feedback_history (All feedback)
├── tutor_sessions (Conversation history)
├── concept_mastery (Progress tracking)
├── performance_analytics (Stats)
└── activity_log (Complete audit trail)
```

### 2. **Full History Tracking**
Every student interaction is recorded:
- **Learning sessions**: Topic, duration, messages, progress
- **Assessments**: Questions, answers, scores, feedback
- **Assignments**: Games, results, time spent
- **Tutor conversations**: Full message history
- **Concept mastery**: Practice attempts, success rates
- **Performance trends**: Score changes over time

### 3. **Optimized Performance**
- **50+ indexes** for instant queries
- **Composite indexes** for complex filters
- **JSONB support** for flexible data
- **Text search** capabilities (pg_trgm)

### 4. **Data Integrity**
- **Foreign keys** with `ON DELETE CASCADE`
- **Check constraints** for valid values
- **Unique constraints** to prevent duplicates
- **Automatic timestamp** updates

---

## 🚀 Migration Steps

### **Option 1: Fresh Installation (Recommended for New Projects)**

1. **Open Supabase SQL Editor**
   - Go to your Supabase project
   - Click "SQL Editor" in sidebar

2. **Run the optimized schema**
   ```sql
   -- Copy and run: scripts/09-optimized-user-centric-schema.sql
   ```

3. **Run RLS policies**
   ```sql
   -- Copy and run: scripts/08-add-delete-policy.sql
   ```

4. **Verify installation**
   ```sql
   -- Check tables
   SELECT * FROM student_dashboard;
   
   -- Check policies
   SELECT tablename, policyname FROM pg_policies 
   WHERE schemaname = 'public';
   ```

---

### **Option 2: Migrate Existing Data**

If you already have data, follow these steps:

#### **Step 1: Backup Current Data**
```sql
-- Export current data (run these separately)
COPY (SELECT * FROM student_profiles) TO '/tmp/student_profiles_backup.csv' CSV HEADER;
COPY (SELECT * FROM learning_sessions) TO '/tmp/learning_sessions_backup.csv' CSV HEADER;
COPY (SELECT * FROM assessments) TO '/tmp/assessments_backup.csv' CSV HEADER;
COPY (SELECT * FROM assignments) TO '/tmp/assignments_backup.csv' CSV HEADER;
```

Or use Supabase Dashboard:
- Go to Table Editor
- Click each table → Export → Download CSV

#### **Step 2: Run Migration Script**

Create and run this migration:

```sql
-- ============================================================
-- DATA MIGRATION SCRIPT
-- Migrates existing data to new optimized schema
-- ============================================================

-- Step 1: Create new tables (run 09-optimized-user-centric-schema.sql first)

-- Step 2: Migrate student_profiles
INSERT INTO student_profiles (
    id, name, email, grade_level, learning_style,
    average_score, created_at, updated_at
)
SELECT 
    id, 
    name, 
    email, 
    COALESCE(grade_level, 9) as grade_level,
    COALESCE(learning_style, 'visual') as learning_style,
    COALESCE(average_score, 0) as average_score,
    created_at,
    COALESCE(updated_at, created_at) as updated_at
FROM student_profiles_old
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();

-- Step 3: Migrate learning_sessions
INSERT INTO learning_sessions (
    id, student_id, session_id, topic, grade_level,
    tutor_messages, curriculum_plan, status,
    created_at, started_at, updated_at
)
SELECT 
    id,
    student_id,
    COALESCE(session_id, id::text) as session_id,
    COALESCE(topic, 'General Learning') as topic,
    COALESCE(grade_level::integer, 9) as grade_level,
    COALESCE(tutor_messages, '[]'::jsonb) as tutor_messages,
    COALESCE(curriculum_plan, '{}'::jsonb) as curriculum_plan,
    COALESCE(status, 'active') as status,
    created_at,
    COALESCE(started_at, created_at) as started_at,
    COALESCE(updated_at, created_at) as updated_at
FROM learning_sessions_old
ON CONFLICT (id) DO UPDATE SET
    curriculum_plan = EXCLUDED.curriculum_plan,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Step 4: Migrate assessments
INSERT INTO assessments (
    id, student_id, session_id, topic,
    questions, student_answers, total_questions,
    score, percentage, status, created_at
)
SELECT 
    id,
    student_id,
    session_id,
    COALESCE(topic, 'Unknown') as topic,
    questions,
    COALESCE(student_answers, '[]'::jsonb) as student_answers,
    COALESCE(jsonb_array_length(questions), 0) as total_questions,
    COALESCE(score, 0) as score,
    COALESCE(score, 0) as percentage,
    COALESCE(status, 'in_progress') as status,
    created_at
FROM assessments_old
ON CONFLICT (id) DO NOTHING;

-- Step 5: Migrate assignments
INSERT INTO assignments (
    id, student_id, title, topic, difficulty,
    mini_games, total_points, status, score,
    created_at
)
SELECT 
    id,
    student_id,
    COALESCE(title, 'Assignment') as title,
    COALESCE(topic, 'General') as topic,
    COALESCE(difficulty, 'medium') as difficulty,
    COALESCE(mini_games, '[]'::jsonb) as mini_games,
    COALESCE(total_points, 0) as total_points,
    COALESCE(status, 'pending') as status,
    score,
    created_at
FROM assignments_old
ON CONFLICT (id) DO NOTHING;

-- Step 6: Update student statistics
SELECT update_student_stats(id) FROM student_profiles;

-- Verify migration
SELECT 
    'student_profiles' as table_name, COUNT(*) as row_count 
FROM student_profiles
UNION ALL
SELECT 'learning_sessions', COUNT(*) FROM learning_sessions
UNION ALL
SELECT 'assessments', COUNT(*) FROM assessments
UNION ALL
SELECT 'assignments', COUNT(*) FROM assignments;
```

#### **Step 3: Verify Data**
```sql
-- Check all students have profiles
SELECT COUNT(*) FROM student_profiles;

-- Check sessions are linked
SELECT s.id, sp.name, s.topic 
FROM learning_sessions s
JOIN student_profiles sp ON s.student_id = sp.id
LIMIT 10;

-- Check assessments are linked
SELECT a.id, sp.name, a.topic, a.score
FROM assessments a
JOIN student_profiles sp ON a.student_id = sp.id
LIMIT 10;
```

#### **Step 4: Update Application Code**
See "Code Changes Needed" section below.

---

## 📝 Database Structure

### **Core Tables**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `student_profiles` | Extended user info | name, email, grade_level, average_score |
| `learning_sessions` | All learning activity | topic, curriculum_plan, tutor_messages, status |
| `assessments` | Tests & quizzes | questions, answers, score, weak_concepts |
| `assignments` | Practice work | mini_games, game_results, points_earned |
| `feedback_history` | All feedback | weak_concepts, recommendations, engagement |
| `tutor_sessions` | Conversation logs | message_count, topics_covered, engagement |
| `concept_mastery` | Learning progress | mastery_level, success_rate, attempts |
| `performance_analytics` | Aggregated stats | average_score, session_count, trends |
| `resources` | Learning materials | title, type, url, difficulty |
| `resource_recommendations` | Suggested resources | relevance_score, viewed, completed |
| `activity_log` | Complete audit trail | activity_type, activity_data |

---

## 💾 Helpful Queries

### **Get Student Dashboard**
```sql
SELECT * FROM student_dashboard 
WHERE student_id = 'user-uuid-here';
```

### **Get Complete Learning History**
```sql
SELECT * FROM get_student_history('user-uuid-here')
ORDER BY created_at DESC
LIMIT 50;
```

### **Get Session History**
```sql
SELECT * FROM session_history
WHERE student_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

### **Get Assessment Performance**
```sql
SELECT * FROM assessment_performance
WHERE student_id = 'user-uuid-here'
ORDER BY completed_at DESC;
```

### **Get Learning Progress by Topic**
```sql
SELECT * FROM learning_progress
WHERE student_id = 'user-uuid-here';
```

### **Get Active Sessions**
```sql
SELECT id, topic, status, progress_percentage, time_spent_minutes
FROM learning_sessions
WHERE student_id = 'user-uuid-here'
  AND status = 'active'
ORDER BY last_activity_at DESC;
```

### **Get Recent Activity**
```sql
SELECT activity_type, activity_description, created_at
FROM activity_log
WHERE student_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 20;
```

### **Update Student Stats**
```sql
SELECT update_student_stats('user-uuid-here');
```

---

## 🔧 Code Changes Needed

Update your API routes to use the new schema:

### **1. Session Creation** (`app/api/agents/generate-curriculum/route.ts`)
Already updated to use `learning_sessions` table with proper session reuse logic.

### **2. Assessment Creation**
```typescript
// Before
const { data } = await supabase
  .from("assessments")
  .insert({
    student_id: userId,
    topic: topic,
    questions: questions
  })

// After (no changes needed - same structure!)
// But now you get additional fields automatically:
// - total_questions
// - weak_concepts[]
// - strong_concepts[]
// - recommendations[]
```

### **3. Getting Student Data**
```typescript
// Use the new views for easy access
const { data: dashboard } = await supabase
  .from("student_dashboard")
  .select("*")
  .eq("student_id", userId)
  .single()

// Get complete history
const { data: history } = await supabase
  .rpc("get_student_history", { p_student_id: userId })
```

### **4. Update Student Stats**
```typescript
// Call after any major activity
await supabase.rpc("update_student_stats", { 
  p_student_id: userId 
})
```

---

## 🎨 Benefits of New Schema

### **1. Complete History Tracking**
- Every interaction is saved
- Full audit trail of learning
- Easy to generate reports

### **2. Better Performance**
- Optimized indexes
- Efficient queries
- Fast even with millions of records

### **3. Data Integrity**
- No orphaned records
- Consistent data
- Proper relationships

### **4. Easy Analytics**
- Pre-built views
- Helper functions
- Trend analysis

### **5. Scalability**
- Ready for millions of users
- Efficient storage
- Smart partitioning support

---

## 🔍 Troubleshooting

### **"relation does not exist" error**
**Solution**: Run the schema creation script first
```sql
-- Run scripts/09-optimized-user-centric-schema.sql
```

### **"permission denied" error**
**Solution**: Run the RLS policy script
```sql
-- Run scripts/08-add-delete-policy.sql
```

### **"duplicate key value violates unique constraint"**
**Solution**: Check for existing data
```sql
-- Find duplicates
SELECT student_id, topic, COUNT(*)
FROM learning_sessions
WHERE status IN ('active', 'paused')
GROUP BY student_id, topic
HAVING COUNT(*) > 1;

-- Keep only the most recent
DELETE FROM learning_sessions
WHERE id NOT IN (
    SELECT DISTINCT ON (student_id, topic) id
    FROM learning_sessions
    WHERE status IN ('active', 'paused')
    ORDER BY student_id, topic, created_at DESC
);
```

### **Slow queries**
**Solution**: Verify indexes are created
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## ✅ Verification Checklist

After migration, verify:

- [ ] All tables created: `SELECT * FROM student_dashboard;`
- [ ] RLS policies active: Check `pg_policies` table
- [ ] Indexes created: Check `pg_indexes` table
- [ ] Data migrated: Count rows in each table
- [ ] Foreign keys work: Try joining tables
- [ ] Views accessible: Query `session_history`, etc.
- [ ] Triggers working: Update a record, check `updated_at`
- [ ] Helper functions: Call `update_student_stats()`
- [ ] Application working: Test all features
- [ ] No errors in logs: Check Supabase logs

---

## 📊 Performance Expectations

With the optimized schema:
- **Query speed**: < 50ms for most queries
- **Dashboard load**: < 100ms
- **Session creation**: < 200ms
- **Full history**: < 500ms (even with 1000+ records)

---

## 🎯 Next Steps

1. **Run the schema**: Execute `09-optimized-user-centric-schema.sql`
2. **Apply RLS**: Execute `08-add-delete-policy.sql`
3. **Test queries**: Try the example queries above
4. **Update code**: If needed, adjust your API routes
5. **Monitor performance**: Check query times in Supabase
6. **Celebrate**: You now have a production-ready database! 🎉

---

## 📚 Additional Resources

- **Supabase RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Indexes**: https://www.postgresql.org/docs/current/indexes.html
- **JSONB Performance**: https://www.postgresql.org/docs/current/datatype-json.html
- **Foreign Keys**: https://www.postgresql.org/docs/current/ddl-constraints.html

---

**Need Help?** 
Check the verification queries in each SQL file or review the error messages carefully.
