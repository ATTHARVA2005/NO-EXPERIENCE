-- ============================================================
-- CLEANUP SCRIPT - Run this FIRST to clean up partial installation
-- Then run 09-optimized-user-centric-schema.sql fresh
-- ============================================================

-- ⚠️ WARNING: This will DELETE ALL DATA in these tables!
-- Only run this if you want to start fresh

-- ============================================================
-- STEP 1: Drop all policies first
-- ============================================================

DROP POLICY IF EXISTS "Students can view own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can view own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can insert own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can update own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can delete own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can view own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can insert own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can update own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can delete own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can insert own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can update own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can delete own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can view own feedback" ON feedback_history;
DROP POLICY IF EXISTS "Students can insert own feedback" ON feedback_history;
DROP POLICY IF EXISTS "Students can view own tutor sessions" ON tutor_sessions;
DROP POLICY IF EXISTS "Students can insert own tutor sessions" ON tutor_sessions;
DROP POLICY IF EXISTS "Students can update own tutor sessions" ON tutor_sessions;
DROP POLICY IF EXISTS "Students can view own concept mastery" ON concept_mastery;
DROP POLICY IF EXISTS "Students can insert own concept mastery" ON concept_mastery;
DROP POLICY IF EXISTS "Students can update own concept mastery" ON concept_mastery;
DROP POLICY IF EXISTS "Students can view own performance analytics" ON performance_analytics;
DROP POLICY IF EXISTS "Students can insert own performance analytics" ON performance_analytics;
DROP POLICY IF EXISTS "Students can update own performance analytics" ON performance_analytics;
DROP POLICY IF EXISTS "All users can view resources" ON resources;
DROP POLICY IF EXISTS "Students can view own resource recommendations" ON resource_recommendations;
DROP POLICY IF EXISTS "Students can insert own resource recommendations" ON resource_recommendations;
DROP POLICY IF EXISTS "Students can update own resource recommendations" ON resource_recommendations;

-- ============================================================
-- STEP 2: Drop all triggers
-- ============================================================

DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
DROP TRIGGER IF EXISTS update_learning_sessions_updated_at ON learning_sessions;
DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
DROP TRIGGER IF EXISTS update_concept_mastery_updated_at ON concept_mastery;
DROP TRIGGER IF EXISTS update_performance_analytics_updated_at ON performance_analytics;
DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
DROP TRIGGER IF EXISTS update_tutor_sessions_updated_at ON tutor_sessions;

-- ============================================================
-- STEP 3: Drop all views
-- ============================================================

DROP VIEW IF EXISTS student_dashboard;
DROP VIEW IF EXISTS session_history;
DROP VIEW IF EXISTS assessment_performance;
DROP VIEW IF EXISTS learning_progress;

-- ============================================================
-- STEP 4: Drop all functions
-- ============================================================

DROP FUNCTION IF EXISTS get_student_history(UUID);
DROP FUNCTION IF EXISTS update_student_stats(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================
-- STEP 5: Drop all tables (in correct order due to foreign keys)
-- ============================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS resource_recommendations CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS performance_analytics CASCADE;
DROP TABLE IF EXISTS concept_mastery CASCADE;
DROP TABLE IF EXISTS tutor_sessions CASCADE;
DROP TABLE IF EXISTS feedback_history CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS learning_sessions CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;

-- ============================================================
-- VERIFICATION: Check that everything is gone
-- ============================================================

SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'student_profiles',
    'learning_sessions',
    'assessments',
    'assignments',
    'feedback_history',
    'tutor_sessions',
    'concept_mastery',
    'performance_analytics',
    'resources',
    'resource_recommendations',
    'activity_log'
  );

-- Expected: 0 rows (all tables should be gone)

-- ============================================================
-- ✅ NEXT STEPS:
-- ============================================================
-- 1. Verify above query returns 0 rows
-- 2. Run 09-optimized-user-centric-schema.sql (the FIXED version)
-- 3. Run 08-add-delete-policy.sql
-- 4. Run 11-verify-installation.sql
-- ============================================================
