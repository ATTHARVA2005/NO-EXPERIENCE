# 🔍 Codebase Analysis Report - Critical Issues Found

## Executive Summary

**Status**: ⚠️ **CRITICAL ISSUES FOUND**

Found inconsistencies between database schema and code references. The codebase has conflicting table names:
- Some files use `students` table (doesn't exist in current schema)
- Current schema uses `student_profiles` table

---

## 🚨 Critical Issues

### 1. **Table Name Mismatch: `students` vs `student_profiles`**

**Impact**: HIGH - Database queries will fail  
**Affected Files**: 5 critical files

#### **Issue A: Old Schema File**
**File**: `scripts/01-schema-setup.sql`
**Problem**: Creates old `students` table that conflicts with `student_profiles`

```sql
-- ❌ WRONG: Creates students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  ...
)
```

**Fix**: This file should be deprecated or updated to use `student_profiles`

**Status**: ⚠️ **DEPRECATED - DO NOT RUN**

---

#### **Issue B: Memory Agent References Wrong Table**
**File**: `lib/agents/memory-agent.ts` (Lines 22, 37)
**Problem**: Queries `students` table instead of `student_profiles`

```typescript
// ❌ WRONG
const { data, error } = await supabase
  .from("students")  // Table doesn't exist!
  .select("*")
  .eq("id", userId)
  .single()

// ❌ WRONG
const { data: inserted } = await supabase
  .from("students")  // Table doesn't exist!
  .insert([newStudent])
```

**Fix Required**:
```typescript
// ✅ CORRECT
const { data, error } = await supabase
  .from("student_profiles")
  .select("*")
  .eq("id", userId)
  .single()
```

**Status**: 🔴 **MUST FIX - Blocking user profile operations**

---

#### **Issue C: Curriculum Analytics Schema**
**File**: `scripts/06-curriculum-analytics-schema.sql` (Line 8)
**Problem**: Foreign key references non-existent `students` table

```sql
-- ❌ WRONG
student_id UUID REFERENCES students(id) ON DELETE CASCADE,
```

**Fix Required**:
```sql
-- ✅ CORRECT
student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
```

**Status**: 🟡 **MEDIUM - Migration will fail if run**

---

#### **Issue D: Test Script**
**File**: `scripts/test-auth-setup.sql` (Lines 28, 38)
**Problem**: Queries non-existent `students` table

```sql
-- ❌ WRONG
SELECT COUNT(*) as total_students FROM students;
```

**Fix**: Update to use `student_profiles`

**Status**: 🟢 **LOW - Test script only**

---

### 2. **Non-Idempotent SQL Triggers** ✅ **FIXED**

**File**: `scripts/06-lesson-progress-tracking.sql`  
**Status**: ✅ **ALREADY FIXED** - Added `DROP TRIGGER IF EXISTS`

---

### 3. **Foreign Key Inconsistencies**

**File**: `scripts/06-lesson-progress-tracking.sql`  
**Status**: ✅ **ALREADY FIXED** - Uses `auth.users(id)` correctly

---

## 📋 Detailed Findings

### Files Using `students` Table (❌ WRONG):
1. `lib/agents/memory-agent.ts` - **CRITICAL**
2. `lib/memory-agent.ts` - **CRITICAL** (appears to be duplicate)
3. `scripts/01-schema-setup.sql` - **DEPRECATED**
4. `scripts/06-curriculum-analytics-schema.sql` - **MEDIUM**
5. `scripts/test-auth-setup.sql` - **LOW PRIORITY**

### Files Using `student_profiles` Table (✅ CORRECT):
- `scripts/09-optimized-user-centric-schema.sql` ✅
- `scripts/03-assignment-system-migration.sql` ✅
- `app/dashboard/teacher/page.tsx` ✅
- Most API routes ✅

---

## 🔧 Required Fixes

### **Priority 1: Fix Memory Agent (CRITICAL)**

**File**: `lib/agents/memory-agent.ts`

**Change 1** (Line 22):
```typescript
// FROM:
const { data, error } = await supabase.from("students").select("*").eq("id", userId).single()

// TO:
const { data, error } = await supabase.from("student_profiles").select("*").eq("id", userId).single()
```

**Change 2** (Line 37):
```typescript
// FROM:
const { data: inserted } = await supabase.from("students").insert([newStudent]).select().single()

// TO:
const { data: inserted } = await supabase.from("student_profiles").insert([newStudent]).select().single()
```

**Change 3** (Update type to match student_profiles schema):
```typescript
const newStudent = {
  id: userId,
  name: authUser?.user_metadata?.full_name || "Student",
  grade_level: 9,
  learning_style: "visual",
  average_score: 0,
  total_sessions: 0,
  total_assignments: 0,
  completed_assignments: 0,
  // ... other student_profiles fields
}
```

---

### **Priority 2: Fix Curriculum Analytics Schema**

**File**: `scripts/06-curriculum-analytics-schema.sql`

**Change** (Line 8):
```sql
-- FROM:
student_id UUID REFERENCES students(id) ON DELETE CASCADE,

-- TO:
student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
```

Also add idempotent policy drops:
```sql
-- Add before CREATE POLICY
DROP POLICY IF EXISTS "Students can view own curriculum analytics" ON curriculum_analytics;
```

---

### **Priority 3: Deprecate Old Schema**

**File**: `scripts/01-schema-setup.sql`

**Options**:
1. **Rename**: `01-schema-setup.sql` → `01-schema-setup.DEPRECATED.sql`
2. **Delete**: Remove entirely (recommended if not used)
3. **Update**: Completely rewrite to match current schema

**Recommendation**: Rename to `.DEPRECATED.sql` to avoid accidental execution

---

### **Priority 4: Update Test Script**

**File**: `scripts/test-auth-setup.sql`

**Change** (Line 28):
```sql
-- FROM:
SELECT COUNT(*) as total_students FROM students;

-- TO:
SELECT COUNT(*) as total_students FROM student_profiles;
```

**Change** (Line 38):
```sql
-- FROM:
FROM students

-- TO:
FROM student_profiles
```

---

## 🎯 Schema Consistency

### **Current Correct Schema**:
```
auth.users (built-in Supabase)
    ↓ (id)
student_profiles
    ↓ (student_id = auth.users.id)
learning_sessions
lesson_progress
subtopic_progress
lesson_context
assessments
assignments
feedback_records
```

### **Foreign Key Pattern**:
- ✅ **ALWAYS use**: `student_id UUID REFERENCES auth.users(id)`
- ❌ **NEVER use**: `student_id UUID REFERENCES students(id)`

### **Query Pattern**:
- ✅ **ALWAYS use**: `.from("student_profiles")`
- ❌ **NEVER use**: `.from("students")`

---

## 📊 Impact Assessment

### **If Not Fixed**:

**User Impact**:
- ❌ Profile creation will fail
- ❌ Progress tracking won't work
- ❌ Teacher dashboard may show incorrect data
- ❌ Memory agent can't retrieve user context

**Database Impact**:
- ❌ Some migrations will fail
- ❌ Foreign key constraints violated
- ❌ Orphaned data possible

**Developer Impact**:
- ❌ Confusion about which table to use
- ❌ Inconsistent codebase
- ❌ Hard to debug issues

---

## ✅ Verification Checklist

After applying fixes:

### **Database Level**:
- [ ] Run: `SELECT table_name FROM information_schema.tables WHERE table_name IN ('students', 'student_profiles');`
- [ ] Should only see `student_profiles` (not `students`)
- [ ] Verify foreign keys: `SELECT * FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';`
- [ ] All student_id FK should point to `auth.users` or `student_profiles`

### **Code Level**:
- [ ] Search codebase: `grep -r "from(\"students\")" .`
- [ ] Should return 0 results (or only in documentation/deprecated files)
- [ ] Search: `grep -r "REFERENCES students(" scripts/`
- [ ] Should return 0 results

### **Runtime Testing**:
- [ ] Create new user account
- [ ] Verify profile created in `student_profiles` table
- [ ] Start learning session
- [ ] Complete checkpoint
- [ ] Open teacher dashboard
- [ ] All data should load correctly

---

## 🚀 Migration Plan

### **Step 1: Fix Memory Agent** (5 minutes)
```bash
# Edit lib/agents/memory-agent.ts
# Replace "students" with "student_profiles" (2 occurrences)
```

### **Step 2: Fix Curriculum Analytics Schema** (2 minutes)
```bash
# Edit scripts/06-curriculum-analytics-schema.sql
# Replace REFERENCES students(id) with REFERENCES auth.users(id)
```

### **Step 3: Deprecate Old Schema** (1 minute)
```bash
# Rename scripts/01-schema-setup.sql to scripts/01-schema-setup.DEPRECATED.sql
```

### **Step 4: Verify** (5 minutes)
```bash
# Run grep searches
grep -r 'from("students")' lib/
grep -r 'REFERENCES students(' scripts/
# Both should return 0 results (except deprecated files)
```

### **Step 5: Test** (10 minutes)
- Sign up new user
- Check if profile created
- Start learning session
- Verify all features work

**Total Time**: ~25 minutes

---

## 📝 Summary

**Issues Found**: 5  
**Critical**: 2 (memory agent, curriculum analytics)  
**Medium**: 1 (deprecated schema file)  
**Low**: 2 (test script, documentation)

**Issues Fixed**: 2  
- ✅ Non-idempotent triggers
- ✅ Foreign key references in lesson_progress tables

**Issues Remaining**: 3  
- 🔴 Memory agent table references
- 🟡 Curriculum analytics schema
- 🟢 Deprecated files

**Estimated Fix Time**: 25 minutes  
**Risk Level**: HIGH if not fixed  
**Priority**: Urgent - Blocks core functionality

---

## 🎯 Next Actions

1. **IMMEDIATE**: Fix `lib/agents/memory-agent.ts`
2. **TODAY**: Fix `scripts/06-curriculum-analytics-schema.sql`
3. **THIS WEEK**: Deprecate `scripts/01-schema-setup.sql`
4. **OPTIONAL**: Update test scripts

**After fixes**: Run full system test to verify everything works end-to-end.
