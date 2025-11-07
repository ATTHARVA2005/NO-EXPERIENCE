# 🚀 Complete Production Setup - Quick Reference Guide

## 📋 Overview

**File:** `scripts/COMPLETE_PRODUCTION_SETUP.sql`

This is a **SINGLE, COMPREHENSIVE SQL FILE** that contains your entire database schema. It's:
- ✅ **Production-ready** - Used in your live application
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Complete** - All 15 tables, indexes, policies, and functions
- ✅ **Secure** - Full Row Level Security implementation
- ✅ **Optimized** - 60+ performance indexes

---

## 🎯 When to Use This Script

### ✅ **USE THIS SCRIPT WHEN:**
1. **Setting up a new Supabase project** (fresh install)
2. **Recreating your database** (if you need to start clean)
3. **Deploying to production** (staging/production environments)
4. **Onboarding new developers** (they can run this once)
5. **Testing with a clean slate** (development/testing)

### ❌ **DO NOT USE IF:**
- You already have data you want to keep (this drops tables)
- You're making incremental changes (use migration files instead)
- Your database is already set up and working

---

## 🛠️ How to Run This Script

### **Method 1: Supabase Dashboard (Recommended)**

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste**
   - Open `scripts/COMPLETE_PRODUCTION_SETUP.sql`
   - Copy **ALL** content (Ctrl+A, Ctrl+C)
   - Paste into SQL Editor

4. **Run the Script**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion (should take 5-10 seconds)

5. **Verify Success**
   - Look for success messages in output
   - Check "Table Editor" to see all tables

### **Method 2: Supabase CLI**

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the script
supabase db push --db-url YOUR_DATABASE_URL < scripts/COMPLETE_PRODUCTION_SETUP.sql

# Or use psql directly
psql YOUR_DATABASE_URL -f scripts/COMPLETE_PRODUCTION_SETUP.sql
```

---

## 📊 What This Script Creates

### **15 Core Tables**

| Table Name | Purpose | Records |
|-----------|---------|---------|
| `student_profiles` | User profile data | 1 per user |
| `learning_sessions` | Active learning sessions | Multiple per user |
| `lesson_progress` | Lesson tracking | 1 per lesson |
| `subtopic_progress` | Checkpoint tracking | Multiple per lesson |
| `lesson_context` | AI tutor context | 1 per lesson |
| `assessments` | Quizzes and tests | Multiple per user |
| `assignments` | Practice work | Multiple per user |
| `feedback_history` | All feedback records | Multiple per activity |
| `tutor_sessions` | Conversation history | Multiple per session |
| `concept_mastery` | Learning progress | Multiple per concept |
| `performance_analytics` | Aggregated stats | Multiple per topic |
| `curriculum_analytics` | Teacher dashboard | 1 per session |
| `resources` | Learning materials | Shared library |
| `resource_recommendations` | Personalized suggestions | Multiple per user |
| `activity_log` | Audit trail | All activities |

### **60+ Performance Indexes**
- Foreign key indexes for fast joins
- Composite indexes for common queries
- Timestamp indexes for sorting
- Status indexes for filtering

### **40+ Security Policies**
- Students can only see their own data
- Automatic user authentication checks
- Service role has full access
- Resources are publicly readable

### **11 Automatic Triggers**
- Auto-update `updated_at` timestamps
- Maintains data freshness
- No manual timestamp management

---

## ✅ Verification After Running

### **1. Check Tables Created**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```
**Expected:** 15 tables

### **2. Check RLS Enabled**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true;
```
**Expected:** 14 tables with RLS (all except resources)

### **3. Check Policies Created**
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
**Expected:** 40+ policies

### **4. Check Indexes Created**
```sql
SELECT tablename, indexname 
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```
**Expected:** 60+ indexes

### **5. Test Basic Query**
```sql
-- Should work after you sign up a user
SELECT * FROM student_profiles;
```

---

## 🔄 Schema Architecture

### **Data Flow**

```
auth.users (Supabase Auth)
    ↓
student_profiles (1:1)
    ↓
├── learning_sessions (1:N)
│   ├── lesson_progress (1:N)
│   │   ├── subtopic_progress (1:N)
│   │   └── lesson_context (1:1)
│   ├── assessments (1:N)
│   ├── assignments (1:N)
│   ├── tutor_sessions (1:N)
│   └── curriculum_analytics (1:N)
├── concept_mastery (1:N)
├── performance_analytics (1:N)
├── feedback_history (1:N)
├── resource_recommendations (1:N)
│   └── resources (N:1)
└── activity_log (1:N)
```

### **Key Relationships**

- **Everything starts with `auth.users(id)`**
- **`student_profiles` extends user info** (1:1 with auth.users)
- **`learning_sessions` are the main learning container**
- **Most tables reference `auth.users(id)` directly**
- **Cascade deletes protect data integrity**

---

## 🛡️ Security Model (RLS)

### **Policy Pattern**

Every user table has 3-4 policies:

```sql
-- SELECT: Students can view their own data
CREATE POLICY "Students can view own data" ON table_name
    FOR SELECT USING (auth.uid() = student_id);

-- INSERT: Students can create their own records
CREATE POLICY "Students can insert own data" ON table_name
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- UPDATE: Students can modify their own records
CREATE POLICY "Students can update own data" ON table_name
    FOR UPDATE USING (auth.uid() = student_id);

-- DELETE: Students can delete their own records (some tables)
CREATE POLICY "Students can delete own data" ON table_name
    FOR DELETE USING (auth.uid() = student_id);
```

### **Special Cases**

- **`resources`**: Publicly readable (no student_id)
- **`lesson_context`**: System can manage (FOR ALL)
- **All tables**: Service role has full access

---

## 🎯 Usage in Your Application

### **After Running This Script**

1. **Authentication Works**
   ```typescript
   // User signs up
   const { data, error } = await supabase.auth.signUp({
     email: 'student@example.com',
     password: 'password123'
   })
   ```

2. **Profile Auto-Created**
   ```typescript
   // Create profile after signup
   const { data } = await supabase
     .from('student_profiles')
     .insert([{
       id: user.id, // Same as auth.users(id)
       name: 'John Doe',
       grade_level: 9
     }])
   ```

3. **Start Learning Session**
   ```typescript
   const { data } = await supabase
     .from('learning_sessions')
     .insert([{
       student_id: user.id,
       topic: 'Algebra',
       grade_level: 9
     }])
   ```

4. **Track Lesson Progress**
   ```typescript
   const { data } = await supabase
     .from('lesson_progress')
     .insert([{
       student_id: user.id,
       session_id: session.id,
       lesson_id: 'lesson_1',
       lesson_title: 'Introduction to Variables'
     }])
   ```

5. **All Queries Work Automatically**
   - RLS filters data to current user
   - No need to add `WHERE student_id = ?`
   - Security handled at database level

---

## 🚨 Important Notes

### **⚠️ WARNING: This Script Drops Tables**

```sql
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS learning_sessions CASCADE;
-- ... etc
```

**This means:**
- ❌ All existing data will be DELETED
- ❌ Cannot be undone
- ✅ Safe for new projects
- ✅ Safe for fresh starts
- ❌ NOT safe if you have production data

### **🔒 Security Best Practices**

1. **Never disable RLS**
   ```sql
   -- ❌ DON'T DO THIS
   ALTER TABLE student_profiles DISABLE ROW LEVEL SECURITY;
   ```

2. **Always use service_role for admin operations**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   
   const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY! // Not anon key!
   )
   ```

3. **Test RLS policies**
   ```sql
   -- Should only return current user's data
   SELECT * FROM student_profiles;
   ```

---

## 📝 Maintenance

### **Updating the Schema**

If you need to make changes:

1. **Don't modify this file** (it's for fresh installs)
2. **Create a migration file** instead:
   ```sql
   -- scripts/XX-your-migration-name.sql
   ALTER TABLE student_profiles ADD COLUMN new_field TEXT;
   ```
3. **Run the migration** on existing databases

### **Keeping Track**

This file represents your **complete schema** as of:
- **Date:** November 7, 2025
- **Version:** Production v1.0
- **Tables:** 15 core tables
- **Status:** ✅ Verified and tested

---

## 🆘 Troubleshooting

### **Issue: "relation already exists"**

**Cause:** Tables already exist

**Solution:**
```sql
-- Option 1: Drop all tables first (DANGEROUS - loses data)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Option 2: Run cleanup script
-- (Create a separate cleanup script)
```

### **Issue: "permission denied"**

**Cause:** Not using service_role key

**Solution:**
- Use Supabase Dashboard SQL Editor (has full permissions)
- Or use service_role key in connection string

### **Issue: "RLS policies blocking queries"**

**Cause:** Not authenticated or using wrong user

**Solution:**
```typescript
// Make sure user is signed in
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user?.id)
```

---

## 📚 Related Files

- **`COMPLETE_PRODUCTION_SETUP.sql`** - This file (run once)
- **`SCHEMA_VERIFICATION_REPORT.md`** - Detailed schema documentation
- **`06-lesson-progress-tracking.sql`** - Original lesson tracking (included here)
- **`06-curriculum-analytics-schema.sql`** - Original analytics (included here)
- **`09-optimized-user-centric-schema.sql`** - Original full schema (merged into this)

---

## ✅ Checklist for Fresh Setup

- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Open `COMPLETE_PRODUCTION_SETUP.sql`
- [ ] Copy all content
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Wait for completion (5-10 seconds)
- [ ] Check output for success messages
- [ ] Verify tables in Table Editor
- [ ] Sign up test user in your app
- [ ] Create test student profile
- [ ] Start test learning session
- [ ] Verify data appears in dashboard
- [ ] Test RLS by querying tables
- [ ] Celebrate! 🎉

---

## 🎉 Success!

If you see these messages after running:

```
✅ COMPLETE PRODUCTION SETUP - SUCCESSFULLY DEPLOYED!
📊 Tables created: 15 / 15
🔒 Tables with RLS enabled: 14
⚡ Indexes created: 60+
🛡️ RLS Policies created: 40+
```

**You're ready to build!** Your database is fully configured and production-ready.

---

## 📞 Support

If you encounter issues:

1. Check verification queries above
2. Review error messages carefully
3. Make sure you're using Supabase Dashboard SQL Editor
4. Verify your Supabase project is active
5. Check that auth is enabled in your project

---

**Created:** November 7, 2025  
**Status:** ✅ Production Ready  
**Version:** 1.0  
**Maintained by:** AI Learning Platform Team
