-- ============================================================
-- VERIFICATION QUERIES - Safe to Run
-- Run this AFTER creating the schema to verify everything works
-- ============================================================

-- ============================================================
-- STEP 1: Verify All Tables Exist
-- ============================================================

SELECT 
    table_name,
    'EXISTS' as status
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
  )
ORDER BY table_name;

-- Expected: 11 rows

-- ============================================================
-- STEP 2: Verify Indexes Created
-- ============================================================

SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
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
    'resources',
    'resource_recommendations',
    'activity_log'
  )
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have 3-8 indexes

-- ============================================================
-- STEP 3: Verify RLS Policies
-- ============================================================

SELECT 
    tablename, 
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected: 8-10 tables with policies

-- ============================================================
-- STEP 4: Verify Views Exist
-- ============================================================

SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'student_dashboard',
    'session_history',
    'assessment_performance',
    'learning_progress'
  )
ORDER BY table_name;

-- Expected: 4 rows

-- ============================================================
-- STEP 5: Verify Helper Functions
-- ============================================================

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_student_history',
    'update_student_stats',
    'update_updated_at_column'
  )
ORDER BY routine_name;

-- Expected: 3 functions

-- ============================================================
-- STEP 6: Test with Your Actual User
-- ============================================================

-- First, get your user ID
SELECT id, email FROM auth.users LIMIT 1;

-- Copy the ID from above and use it below (replace the UUID)

/*
-- Example: Create a test profile (replace UUID with your actual user ID)
INSERT INTO student_profiles (
    id,
    name,
    grade_level
) VALUES (
    'YOUR-ACTUAL-UUID-HERE',  -- ← Replace with your UUID from above
    'Test Student',
    9
) ON CONFLICT (id) DO NOTHING;

-- Create a test session
INSERT INTO learning_sessions (
    student_id,
    topic,
    grade_level,
    status
) VALUES (
    'YOUR-ACTUAL-UUID-HERE',  -- ← Replace with your UUID
    'Test Topic',
    9,
    'active'
) RETURNING id;

-- View your data
SELECT * FROM student_dashboard 
WHERE student_id = 'YOUR-ACTUAL-UUID-HERE';  -- ← Replace with your UUID

-- View your sessions
SELECT * FROM learning_sessions 
WHERE student_id = 'YOUR-ACTUAL-UUID-HERE';  -- ← Replace with your UUID
*/

-- ============================================================
-- STEP 7: Summary Check
-- ============================================================

SELECT 
    'Tables' as type, 
    COUNT(*) as count,
    '11 expected' as expected
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
  )

UNION ALL

SELECT 
    'Indexes', 
    COUNT(*),
    '50+ expected'
FROM pg_indexes 
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
    'resources',
    'resource_recommendations',
    'activity_log'
  )

UNION ALL

SELECT 
    'Policies', 
    COUNT(*),
    '30+ expected'
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Views', 
    COUNT(*),
    '4 expected'
FROM information_schema.views 
WHERE table_schema = 'public'
  AND table_name IN (
    'student_dashboard',
    'session_history',
    'assessment_performance',
    'learning_progress'
  )

UNION ALL

SELECT 
    'Functions',
    COUNT(*),
    '3 expected'
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_student_history',
    'update_student_stats',
    'update_updated_at_column'
  );

-- ============================================================
-- ✅ SUCCESS CRITERIA
-- ============================================================
-- If you see:
-- - Tables: 11
-- - Indexes: 50+
-- - Policies: 30+
-- - Views: 4
-- - Functions: 3
-- 
-- Then everything is working correctly! 🎉
-- ============================================================
