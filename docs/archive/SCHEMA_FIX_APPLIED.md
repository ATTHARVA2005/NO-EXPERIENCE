# ✅ Schema Fix Applied

## Issue Fixed
The original `06-lesson-progress-tracking.sql` script had two issues:

1. **Referenced a non-existent `students` table**
2. **Not idempotent** - Would fail if run multiple times (Error 42710: trigger already exists)

## Root Cause
Your database schema uses:
- `auth.users(id)` for authentication (built-in Supabase table)
- `student_profiles(id)` which references `auth.users(id)`

**NOT** a separate `students` table.

Additionally, the script used `CREATE TRIGGER` without checking if triggers already existed.

## Changes Made

### 1. Foreign Key References
**Before:**
```sql
student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE
```

**After:**
```sql
student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

### 2. RLS Policies
**Before:**
```sql
USING (auth.uid() IN (SELECT user_id FROM students WHERE id = student_id))
```

**After:**
```sql
USING (auth.uid() = student_id)
```

This matches the pattern used in your existing tables like `learning_sessions` and `student_profiles`.

### 3. Idempotent Triggers (NEW FIX)
**Before:**
```sql
CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**After:**
```sql
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
DROP TRIGGER IF EXISTS update_subtopic_progress_updated_at ON subtopic_progress;
DROP TRIGGER IF EXISTS update_lesson_context_updated_at ON lesson_context;

-- Create triggers
CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4. Idempotent RLS Policies (NEW FIX)
**Before:**
```sql
CREATE POLICY "Students can view their own lesson progress"
    ON lesson_progress FOR SELECT
    USING (auth.uid() = student_id);
```

**After:**
```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Students can insert their own lesson progress" ON lesson_progress;
-- ... (all policies)

-- Create policies
CREATE POLICY "Students can view their own lesson progress"
    ON lesson_progress FOR SELECT
    USING (auth.uid() = student_id);
```

## Benefits of Idempotent Script

Now you can run the script multiple times safely:
- ✅ First run: Creates everything
- ✅ Second run: Drops and recreates (no errors)
- ✅ Subsequent runs: Always works

**No more Error 42710!**

## Updated Script
The corrected SQL script is: **`scripts/06-lesson-progress-tracking.sql`**

All three tables now correctly reference:
- `student_id UUID → auth.users(id)`
- `session_id UUID → learning_sessions(id)`

And the script is fully idempotent - safe to run multiple times.

## Next Step
You can now run the migration on Supabase without errors:

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `scripts/06-lesson-progress-tracking.sql`
3. Paste and click **Run**
4. Should execute successfully (even if run multiple times)

---

**Status**: ✅ Ready to migrate (fixed foreign keys + idempotent)
