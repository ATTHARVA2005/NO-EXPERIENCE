-- ============================================================
-- QUICK REFERENCE SQL QUERIES
-- Common operations for the optimized schema
-- ============================================================
-- 
-- ⚠️ IMPORTANT: This file contains EXAMPLE queries only!
-- Do NOT run this entire file - it will fail!
-- 
-- These queries use placeholder values like 'USER_UUID_HERE'
-- Copy individual queries and replace placeholders with real values
-- 
-- Example:
--   Replace 'USER_UUID_HERE' with actual user UUID like:
--   '123e4567-e89b-12d3-a456-426614174000'
-- 
-- ============================================================

-- ============================================================
-- STUDENT PROFILE QUERIES
-- ============================================================

-- Get student's complete profile with stats
SELECT 
    sp.*,
    COUNT(DISTINCT ls.id) as total_sessions,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_assessments,
    COUNT(DISTINCT asn.id) FILTER (WHERE asn.status = 'completed') as completed_assignments,
    COALESCE(AVG(a.score), 0) as average_assessment_score
FROM student_profiles sp
LEFT JOIN learning_sessions ls ON sp.id = ls.student_id
LEFT JOIN assessments a ON sp.id = a.student_id
LEFT JOIN assignments asn ON sp.id = asn.student_id
WHERE sp.id = 'USER_UUID_HERE'
GROUP BY sp.id;

-- Update student profile
UPDATE student_profiles
SET 
    name = 'New Name',
    grade_level = 10,
    learning_style = 'visual',
    updated_at = NOW()
WHERE id = 'USER_UUID_HERE';

-- ============================================================
-- LEARNING SESSION QUERIES
-- ============================================================

-- Find or create session for a topic (prevents duplicates)
WITH existing_session AS (
    SELECT id, curriculum_plan, status
    FROM learning_sessions
    WHERE student_id = 'USER_UUID_HERE'
      AND topic = 'TOPIC_NAME'
      AND status IN ('active', 'paused')
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM existing_session) 
        THEN (SELECT id FROM existing_session)
        ELSE NULL
    END as existing_session_id;

-- Get active sessions for a student
SELECT 
    id,
    topic,
    status,
    progress_percentage,
    time_spent_minutes,
    message_count,
    created_at,
    last_activity_at
FROM learning_sessions
WHERE student_id = 'USER_UUID_HERE'
  AND status = 'active'
ORDER BY last_activity_at DESC;

-- Get session with full details
SELECT 
    ls.*,
    sp.name as student_name,
    sp.grade_level,
    COUNT(a.id) as assessment_count,
    COUNT(asn.id) as assignment_count
FROM learning_sessions ls
JOIN student_profiles sp ON ls.student_id = sp.id
LEFT JOIN assessments a ON ls.id = a.session_id
LEFT JOIN assignments asn ON ls.id = asn.session_id
WHERE ls.id = 'SESSION_UUID_HERE'
GROUP BY ls.id, sp.name, sp.grade_level;

-- Update session progress
UPDATE learning_sessions
SET 
    progress_percentage = 75.5,
    time_spent_minutes = time_spent_minutes + 30,
    message_count = message_count + 1,
    last_activity_at = NOW(),
    updated_at = NOW()
WHERE id = 'SESSION_UUID_HERE';

-- Mark session as completed
UPDATE learning_sessions
SET 
    status = 'completed',
    completion_percentage = 100,
    completed_at = NOW(),
    updated_at = NOW()
WHERE id = 'SESSION_UUID_HERE';

-- ============================================================
-- ASSESSMENT QUERIES
-- ============================================================

-- Create new assessment
INSERT INTO assessments (
    student_id,
    session_id,
    topic,
    difficulty,
    questions,
    total_questions,
    status
) VALUES (
    'USER_UUID_HERE',
    'SESSION_UUID_HERE',
    'Photosynthesis',
    'medium',
    '[{"question": "...", "options": [...]}]'::jsonb,
    10,
    'in_progress'
) RETURNING id;

-- Submit assessment answers
UPDATE assessments
SET 
    student_answers = '[{"answer": "A", "time_taken": 45}]'::jsonb,
    correct_count = 8,
    incorrect_count = 2,
    score = 80,
    percentage = 80,
    status = 'completed',
    completed_at = NOW(),
    time_taken_seconds = 600
WHERE id = 'ASSESSMENT_UUID_HERE';

-- Get student's assessment history
SELECT 
    a.id,
    a.topic,
    a.score,
    a.percentage,
    a.total_questions,
    a.correct_count,
    a.status,
    a.created_at,
    a.completed_at,
    ls.topic as session_topic
FROM assessments a
LEFT JOIN learning_sessions ls ON a.session_id = ls.id
WHERE a.student_id = 'USER_UUID_HERE'
ORDER BY a.created_at DESC;

-- Get assessment performance by topic
SELECT 
    topic,
    COUNT(*) as total_assessments,
    ROUND(AVG(score), 2) as average_score,
    MAX(score) as highest_score,
    MIN(score) as lowest_score,
    COUNT(*) FILTER (WHERE percentage >= 70) as passed_count
FROM assessments
WHERE student_id = 'USER_UUID_HERE'
  AND status = 'completed'
GROUP BY topic
ORDER BY average_score DESC;

-- ============================================================
-- ASSIGNMENT QUERIES
-- ============================================================

-- Create new assignment
INSERT INTO assignments (
    student_id,
    session_id,
    title,
    topic,
    difficulty,
    mini_games,
    total_points,
    passing_score,
    estimated_time_minutes
) VALUES (
    'USER_UUID_HERE',
    'SESSION_UUID_HERE',
    'Photosynthesis Practice',
    'Photosynthesis',
    'medium',
    '[{"type": "quiz", "points": 100}]'::jsonb,
    100,
    70,
    30
) RETURNING id;

-- Update assignment progress
UPDATE assignments
SET 
    status = 'in_progress',
    started_at = NOW(),
    game_results = game_results || '[{"game_id": 1, "score": 80}]'::jsonb,
    updated_at = NOW()
WHERE id = 'ASSIGNMENT_UUID_HERE';

-- Complete assignment
UPDATE assignments
SET 
    status = 'completed',
    score = 85,
    percent_correct = 85,
    points_earned = 85,
    time_spent_seconds = 1800,
    completed_at = NOW(),
    updated_at = NOW()
WHERE id = 'ASSIGNMENT_UUID_HERE';

-- Get student's assignment history
SELECT 
    a.id,
    a.title,
    a.topic,
    a.difficulty,
    a.status,
    a.score,
    a.percent_correct,
    a.time_spent_seconds,
    a.created_at,
    a.completed_at
FROM assignments a
WHERE a.student_id = 'USER_UUID_HERE'
ORDER BY a.created_at DESC;

-- ============================================================
-- FEEDBACK QUERIES
-- ============================================================

-- Create feedback record
INSERT INTO feedback_history (
    student_id,
    session_id,
    assessment_id,
    feedback_type,
    weak_concepts,
    strong_concepts,
    recommendations,
    engagement_level,
    feedback_content
) VALUES (
    'USER_UUID_HERE',
    'SESSION_UUID_HERE',
    'ASSESSMENT_UUID_HERE',
    'assessment',
    ARRAY['concept1', 'concept2'],
    ARRAY['concept3', 'concept4'],
    ARRAY['Review topic X', 'Practice more'],
    'high',
    '{"summary": "Good performance", "details": "..."}'::jsonb
) RETURNING id;

-- Get recent feedback for student
SELECT 
    fh.feedback_type,
    fh.weak_concepts,
    fh.strong_concepts,
    fh.recommendations,
    fh.engagement_level,
    fh.created_at,
    ls.topic as session_topic
FROM feedback_history fh
LEFT JOIN learning_sessions ls ON fh.session_id = ls.id
WHERE fh.student_id = 'USER_UUID_HERE'
ORDER BY fh.created_at DESC
LIMIT 10;

-- ============================================================
-- CONCEPT MASTERY QUERIES
-- ============================================================

-- Track concept practice
INSERT INTO concept_mastery (
    student_id,
    concept,
    topic,
    grade_level,
    mastery_level,
    total_attempts,
    successful_attempts,
    success_rate
) VALUES (
    'USER_UUID_HERE',
    'Photosynthesis Process',
    'Biology',
    9,
    'practicing',
    5,
    4,
    80
)
ON CONFLICT (student_id, concept, topic)
DO UPDATE SET
    total_attempts = concept_mastery.total_attempts + 1,
    successful_attempts = concept_mastery.successful_attempts + EXCLUDED.successful_attempts,
    success_rate = (concept_mastery.successful_attempts + EXCLUDED.successful_attempts) * 100.0 / (concept_mastery.total_attempts + 1),
    last_practiced_at = NOW(),
    updated_at = NOW();

-- Update mastery level based on performance
UPDATE concept_mastery
SET 
    mastery_level = CASE
        WHEN success_rate >= 90 THEN 'mastered'
        WHEN success_rate >= 70 THEN 'proficient'
        WHEN success_rate >= 50 THEN 'practicing'
        ELSE 'novice'
    END,
    mastered_at = CASE WHEN success_rate >= 90 THEN NOW() ELSE NULL END,
    updated_at = NOW()
WHERE student_id = 'USER_UUID_HERE'
  AND concept = 'CONCEPT_NAME';

-- Get student's mastery progress
SELECT 
    topic,
    concept,
    mastery_level,
    success_rate,
    total_attempts,
    last_practiced_at,
    mastered_at
FROM concept_mastery
WHERE student_id = 'USER_UUID_HERE'
ORDER BY topic, mastery_level DESC;

-- Get concepts needing practice
SELECT 
    concept,
    topic,
    mastery_level,
    success_rate,
    last_practiced_at,
    EXTRACT(DAY FROM NOW() - last_practiced_at) as days_since_practice
FROM concept_mastery
WHERE student_id = 'USER_UUID_HERE'
  AND mastery_level IN ('novice', 'beginner', 'practicing')
  AND (mastered_at IS NULL OR mastered_at < NOW() - INTERVAL '30 days')
ORDER BY success_rate ASC, last_practiced_at ASC
LIMIT 10;

-- ============================================================
-- PERFORMANCE ANALYTICS QUERIES
-- ============================================================

-- Update or create analytics record
INSERT INTO performance_analytics (
    student_id,
    topic,
    time_period,
    session_count,
    average_score,
    engagement_level,
    topics_covered,
    last_session_date
) VALUES (
    'USER_UUID_HERE',
    'Biology',
    'all_time',
    10,
    85.5,
    75.0,
    ARRAY['Photosynthesis', 'Cell Division'],
    NOW()
)
ON CONFLICT (student_id, topic, time_period)
DO UPDATE SET
    session_count = performance_analytics.session_count + 1,
    average_score = (performance_analytics.average_score * performance_analytics.session_count + EXCLUDED.average_score) / (performance_analytics.session_count + 1),
    last_session_date = NOW(),
    updated_at = NOW();

-- Get student's performance summary
SELECT 
    topic,
    session_count,
    average_score,
    engagement_level,
    completion_rate,
    score_trend,
    topics_covered,
    weak_concepts,
    strong_concepts
FROM performance_analytics
WHERE student_id = 'USER_UUID_HERE'
  AND time_period = 'all_time'
ORDER BY average_score DESC;

-- ============================================================
-- TUTOR SESSION QUERIES
-- ============================================================

-- Create tutor session
INSERT INTO tutor_sessions (
    student_id,
    learning_session_id,
    session_id,
    message_count,
    conversation_history,
    topics_covered,
    engagement_score
) VALUES (
    'USER_UUID_HERE',
    'LEARNING_SESSION_UUID',
    'TUTOR_SESSION_ID',
    10,
    '[{"role": "assistant", "content": "Hello!"}]'::jsonb,
    ARRAY['Photosynthesis'],
    85
) RETURNING id;

-- Update tutor session
UPDATE tutor_sessions
SET 
    message_count = message_count + 1,
    conversation_history = conversation_history || '[{"role": "user", "content": "..."}]'::jsonb,
    total_duration_minutes = total_duration_minutes + 5,
    engagement_score = 90,
    updated_at = NOW()
WHERE id = 'TUTOR_SESSION_UUID';

-- Get conversation history
SELECT 
    ts.id,
    ts.message_count,
    ts.conversation_history,
    ts.topics_covered,
    ts.engagement_score,
    ts.total_duration_minutes,
    ls.topic as session_topic
FROM tutor_sessions ts
JOIN learning_sessions ls ON ts.learning_session_id = ls.id
WHERE ts.student_id = 'USER_UUID_HERE'
ORDER BY ts.created_at DESC;

-- ============================================================
-- RESOURCE QUERIES
-- ============================================================

-- Get recommended resources for student
SELECT 
    r.id,
    r.title,
    r.type,
    r.url,
    r.difficulty,
    r.duration_minutes,
    rr.relevance_score,
    rr.reason,
    rr.viewed,
    rr.completed
FROM resource_recommendations rr
JOIN resources r ON rr.resource_id = r.id
WHERE rr.student_id = 'USER_UUID_HERE'
  AND rr.viewed = false
ORDER BY rr.relevance_score DESC, rr.recommended_at DESC
LIMIT 10;

-- Mark resource as viewed
UPDATE resource_recommendations
SET 
    viewed = true,
    viewed_at = NOW()
WHERE student_id = 'USER_UUID_HERE'
  AND resource_id = 'RESOURCE_UUID';

-- Mark resource as completed
UPDATE resource_recommendations
SET 
    completed = true,
    completed_at = NOW()
WHERE student_id = 'USER_UUID_HERE'
  AND resource_id = 'RESOURCE_UUID';

-- Get resources by topic and difficulty
SELECT *
FROM resources
WHERE topic = 'Photosynthesis'
  AND difficulty = 'medium'
  AND is_active = true
ORDER BY rating DESC, recommendation_count DESC;

-- ============================================================
-- ACTIVITY LOG QUERIES
-- ============================================================

-- Log an activity
INSERT INTO activity_log (
    student_id,
    activity_type,
    activity_category,
    related_session_id,
    activity_description,
    activity_data
) VALUES (
    'USER_UUID_HERE',
    'session_start',
    'learning',
    'SESSION_UUID',
    'Started learning session on Photosynthesis',
    '{"topic": "Photosynthesis", "duration": 30}'::jsonb
);

-- Get recent activity
SELECT 
    activity_type,
    activity_category,
    activity_description,
    activity_data,
    created_at
FROM activity_log
WHERE student_id = 'USER_UUID_HERE'
ORDER BY created_at DESC
LIMIT 50;

-- Get activity summary
SELECT 
    activity_category,
    activity_type,
    COUNT(*) as count,
    MAX(created_at) as last_occurrence
FROM activity_log
WHERE student_id = 'USER_UUID_HERE'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY activity_category, activity_type
ORDER BY count DESC;

-- ============================================================
-- CLEANUP QUERIES
-- ============================================================

-- Remove duplicate sessions (keep most recent)
DELETE FROM learning_sessions
WHERE id NOT IN (
    SELECT DISTINCT ON (student_id, topic) id
    FROM learning_sessions
    WHERE status IN ('active', 'paused')
    ORDER BY student_id, topic, created_at DESC
);

-- Archive old completed sessions (optional)
UPDATE learning_sessions
SET status = 'archived'
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '6 months';

-- Delete abandoned sessions older than 30 days
DELETE FROM learning_sessions
WHERE status = 'abandoned'
  AND created_at < NOW() - INTERVAL '30 days';

-- ============================================================
-- STATISTICS QUERIES
-- ============================================================

-- Platform-wide statistics
SELECT 
    COUNT(DISTINCT id) as total_students,
    COUNT(DISTINCT id) FILTER (WHERE last_activity_at > NOW() - INTERVAL '7 days') as active_students,
    ROUND(AVG(average_score), 2) as platform_avg_score,
    SUM(total_sessions) as total_sessions,
    SUM(completed_assignments) as total_assignments
FROM student_profiles;

-- Topic popularity
SELECT 
    topic,
    COUNT(*) as session_count,
    COUNT(DISTINCT student_id) as unique_students,
    ROUND(AVG(time_spent_minutes), 2) as avg_time_spent
FROM learning_sessions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY topic
ORDER BY session_count DESC
LIMIT 10;

-- Daily active users
SELECT 
    DATE(last_activity_at) as date,
    COUNT(DISTINCT id) as active_users
FROM student_profiles
WHERE last_activity_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(last_activity_at)
ORDER BY date DESC;

-- ============================================================
-- HELPER FUNCTION USAGE
-- ============================================================

-- Get complete student history
SELECT * FROM get_student_history('USER_UUID_HERE');

-- Update all student statistics
SELECT update_student_stats('USER_UUID_HERE');

-- Update stats for all students (be careful with large datasets)
SELECT update_student_stats(id) FROM student_profiles;
