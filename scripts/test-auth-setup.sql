-- Test Authentication System
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if students table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- 2. Check existing RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'students';

-- 3. Count existing student profiles
SELECT COUNT(*) as total_students FROM students;

-- 4. View sample student data (without sensitive info)
SELECT 
  id,
  name,
  grade_level,
  learning_style,
  average_score,
  created_at
FROM students
LIMIT 5;

-- 5. Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'students';

-- Expected Output:
-- ✅ Students table has columns: id, name, email, grade_level, learning_style, average_score, created_at, updated_at
-- ✅ RLS policies exist for SELECT, INSERT, UPDATE
-- ✅ RLS is enabled (rowsecurity = true)
-- ✅ At least one test student exists
