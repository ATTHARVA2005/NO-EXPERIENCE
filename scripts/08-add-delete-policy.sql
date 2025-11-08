-- ============================================================
-- COMPREHENSIVE RLS POLICIES FOR ALL TABLES
-- Ensures students can only access their own data
-- 
-- ⚠️ IMPORTANT: Run this AFTER running 09-optimized-user-centric-schema.sql
-- This file requires the tables to exist first!
-- 
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- LEARNING SESSIONS POLICIES
-- ============================================================

ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can insert own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can update own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can delete own sessions" ON learning_sessions;

-- Create comprehensive policies
CREATE POLICY "Students can view own sessions"
ON learning_sessions FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own sessions"
ON learning_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own sessions"
ON learning_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own sessions"
ON learning_sessions FOR DELETE
TO authenticated
USING (auth.uid() = student_id);

-- ============================================================
-- STUDENT PROFILES POLICIES
-- ============================================================

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON student_profiles;

CREATE POLICY "Users can view own profile"
ON student_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON student_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON student_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- ============================================================
-- ASSESSMENTS POLICIES
-- ============================================================

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can insert own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can update own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can delete own assessments" ON assessments;

CREATE POLICY "Students can view own assessments"
ON assessments FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own assessments"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own assessments"
ON assessments FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own assessments"
ON assessments FOR DELETE
TO authenticated
USING (auth.uid() = student_id);

-- ============================================================
-- ASSIGNMENTS POLICIES
-- ============================================================

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can insert own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can update own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can delete own assignments" ON assignments;

CREATE POLICY "Students can view own assignments"
ON assignments FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own assignments"
ON assignments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own assignments"
ON assignments FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own assignments"
ON assignments FOR DELETE
TO authenticated
USING (auth.uid() = student_id);

-- ============================================================
-- FEEDBACK HISTORY POLICIES
-- ============================================================

ALTER TABLE feedback_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own feedback" ON feedback_history;
DROP POLICY IF EXISTS "Students can insert own feedback" ON feedback_history;

CREATE POLICY "Students can view own feedback"
ON feedback_history FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own feedback"
ON feedback_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- ============================================================
-- TUTOR SESSIONS POLICIES
-- ============================================================

ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own tutor sessions" ON tutor_sessions;
DROP POLICY IF EXISTS "Students can insert own tutor sessions" ON tutor_sessions;
DROP POLICY IF EXISTS "Students can update own tutor sessions" ON tutor_sessions;

CREATE POLICY "Students can view own tutor sessions"
ON tutor_sessions FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own tutor sessions"
ON tutor_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own tutor sessions"
ON tutor_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

-- ============================================================
-- CONCEPT MASTERY POLICIES
-- ============================================================

ALTER TABLE IF EXISTS concept_mastery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own mastery" ON concept_mastery;
DROP POLICY IF EXISTS "Students can insert own mastery" ON concept_mastery;
DROP POLICY IF EXISTS "Students can update own mastery" ON concept_mastery;

CREATE POLICY "Students can view own mastery"
ON concept_mastery FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own mastery"
ON concept_mastery FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own mastery"
ON concept_mastery FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

-- ============================================================
-- PERFORMANCE ANALYTICS POLICIES
-- ============================================================

ALTER TABLE IF EXISTS performance_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own analytics" ON performance_analytics;
DROP POLICY IF EXISTS "Students can insert own analytics" ON performance_analytics;
DROP POLICY IF EXISTS "Students can update own analytics" ON performance_analytics;

CREATE POLICY "Students can view own analytics"
ON performance_analytics FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own analytics"
ON performance_analytics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own analytics"
ON performance_analytics FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

-- ============================================================
-- RESOURCE RECOMMENDATIONS POLICIES
-- ============================================================

ALTER TABLE IF EXISTS resource_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own recommendations" ON resource_recommendations;
DROP POLICY IF EXISTS "Students can update own recommendations" ON resource_recommendations;

CREATE POLICY "Students can view own recommendations"
ON resource_recommendations FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can update own recommendations"
ON resource_recommendations FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

-- ============================================================
-- RESOURCES - Public read access
-- ============================================================

ALTER TABLE IF EXISTS resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view resources" ON resources;

CREATE POLICY "Anyone can view resources"
ON resources FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- VERIFY ALL POLICIES
-- ============================================================

SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'student_profiles',
    'learning_sessions',
    'assessments',
    'assignments',
    'feedback_history',
    'tutor_sessions',
    'concept_mastery',
    'performance_analytics',
    'resource_recommendations',
    'resources'
  )
ORDER BY tablename, policyname;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ALL RLS POLICIES CONFIGURED SUCCESSFULLY!';
    RAISE NOTICE '🔒 Students can only access their own data';
    RAISE NOTICE '📊 Full CRUD operations enabled for user data';
    RAISE NOTICE '🌐 Resources are publicly readable';
    RAISE NOTICE '';
    RAISE NOTICE 'Policies applied to:';
    RAISE NOTICE '  - student_profiles';
    RAISE NOTICE '  - learning_sessions';
    RAISE NOTICE '  - assessments';
    RAISE NOTICE '  - assignments';
    RAISE NOTICE '  - feedback_history';
    RAISE NOTICE '  - tutor_sessions';
    RAISE NOTICE '  - concept_mastery';
    RAISE NOTICE '  - performance_analytics';
    RAISE NOTICE '  - resource_recommendations';
    RAISE NOTICE '  - resources';
END $$;
