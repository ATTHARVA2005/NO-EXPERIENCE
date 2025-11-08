-- ============================================================
-- OPTIMIZED USER-CENTRIC SCHEMA
-- Complete database restructure for proper history tracking
-- ============================================================
-- 
-- This migration:
-- 1. Consolidates all user data under auth.users(id)
-- 2. Ensures proper foreign key relationships
-- 3. Adds comprehensive indexes for performance
-- 4. Implements full RLS policies
-- 5. Creates views for easy data access
-- 6. Adds triggers for automatic timestamp updates
--
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================
-- SECTION 1: CORE USER TABLE (Central Hub)
-- ============================================================

-- Student Profiles - Extended user information
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  name TEXT NOT NULL,
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
  learning_style TEXT DEFAULT 'visual' CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'reading')),
  
  -- Performance Metrics
  average_score NUMERIC(5,2) DEFAULT 0 CHECK (average_score >= 0 AND average_score <= 100),
  total_sessions INTEGER DEFAULT 0,
  total_assignments INTEGER DEFAULT 0,
  completed_assignments INTEGER DEFAULT 0,
  total_assessments INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_learning_time INTEGER DEFAULT 0, -- Total minutes
  engagement_score NUMERIC(5,2) DEFAULT 50,
  
  -- Learning Progress
  topics_studied TEXT[] DEFAULT ARRAY[]::TEXT[],
  mastered_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  weak_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Activity Tracking
  last_activity_at TIMESTAMP WITH TIME ZONE,
  last_session_topic TEXT,
  
  -- Metadata
  preferences JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 2: LEARNING SESSIONS (All Learning Activity)
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session Identity
  topic TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  
  -- Learning Configuration
  learning_style TEXT DEFAULT 'visual',
  difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  learning_goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Session Content
  curriculum_plan JSONB DEFAULT '{}'::jsonb,
  lesson_content JSONB DEFAULT '{}'::jsonb,
  resources JSONB DEFAULT '[]'::jsonb,
  
  -- Tutor Interaction History
  tutor_messages JSONB DEFAULT '[]'::jsonb, -- Full conversation history
  message_count INTEGER DEFAULT 0,
  
  -- Session Progress
  current_phase TEXT DEFAULT 'learning' CHECK (current_phase IN ('learning', 'assessment', 'feedback', 'completed')),
  progress_percentage NUMERIC(5,2) DEFAULT 0,
  concepts_covered TEXT[] DEFAULT ARRAY[]::TEXT[],
  concepts_mastered TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Performance Data
  performance_data JSONB DEFAULT '{}'::jsonb,
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  time_spent_minutes INTEGER DEFAULT 0,
  
  -- Status Tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paused_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 3: ASSESSMENTS (All Testing & Evaluation)
-- ============================================================

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  
  -- Assessment Details
  topic TEXT NOT NULL,
  type TEXT DEFAULT 'quiz' CHECK (type IN ('quiz', 'test', 'practice', 'diagnostic')),
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Questions and Answers
  questions JSONB NOT NULL,
  student_answers JSONB DEFAULT '[]'::jsonb,
  correct_answers JSONB DEFAULT '[]'::jsonb,
  
  -- Scoring
  total_questions INTEGER NOT NULL,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  score NUMERIC(5,2) DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  
  -- Performance Analysis
  accuracy NUMERIC(5,2) DEFAULT 0,
  confidence_score NUMERIC(3,2) DEFAULT 0,
  time_per_question JSONB DEFAULT '{}'::jsonb,
  
  -- Learning Insights
  weak_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  strong_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  misconceptions TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Feedback
  feedback_data JSONB DEFAULT '{}'::jsonb,
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_taken_seconds INTEGER
);

-- ============================================================
-- SECTION 4: ASSIGNMENTS (Practice Work)
-- ============================================================

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE SET NULL,
  
  -- Assignment Details
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Configuration
  mini_games JSONB DEFAULT '[]'::jsonb,
  learning_objectives TEXT[] DEFAULT ARRAY[]::TEXT[],
  total_points INTEGER DEFAULT 0,
  passing_score INTEGER DEFAULT 0,
  estimated_time_minutes INTEGER,
  
  -- Personalization
  adapted_for JSONB DEFAULT '{}'::jsonb,
  custom_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Results
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
  score INTEGER DEFAULT 0,
  percent_correct NUMERIC(5,2) DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  
  -- Detailed Results
  game_results JSONB DEFAULT '[]'::jsonb,
  answers_data JSONB DEFAULT '{}'::jsonb,
  
  -- Performance Insights
  weak_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  strong_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  improvement_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Feedback
  student_feedback TEXT,
  tutor_guidance TEXT,
  
  -- Time Tracking
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 5: FEEDBACK HISTORY (All Feedback Records)
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  
  -- Feedback Type and Context
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('question', 'assessment', 'assignment', 'session', 'general')),
  context JSONB DEFAULT '{}'::jsonb,
  
  -- Performance Analysis
  weak_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  strong_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  student_misconceptions TEXT[] DEFAULT ARRAY[]::TEXT[],
  learning_gaps TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Recommendations
  recommended_difficulty TEXT CHECK (recommended_difficulty IN ('easy', 'medium', 'hard')),
  focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  next_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  practice_recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  tutor_recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Engagement Analysis
  engagement_level TEXT CHECK (engagement_level IN ('low', 'medium', 'high')),
  confidence_score NUMERIC(5,2),
  
  -- Feedback Content
  feedback_content JSONB NOT NULL,
  student_feedback_text TEXT,
  tutor_guidance_text TEXT,
  automated_feedback TEXT,
  
  -- Metadata
  generated_by TEXT DEFAULT 'system', -- 'system', 'tutor', 'ai'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 6: TUTOR SESSIONS (Conversation History)
-- ============================================================

CREATE TABLE IF NOT EXISTS tutor_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  
  -- Conversation Data
  message_count INTEGER DEFAULT 0,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  
  -- Topics and Concepts
  topics_covered TEXT[] DEFAULT ARRAY[]::TEXT[],
  topics_discussed TEXT[] DEFAULT ARRAY[]::TEXT[],
  learning_objectives TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Areas Identified
  struggling_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  mastered_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  concepts_explained TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Engagement Metrics
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  questions_asked INTEGER DEFAULT 0,
  
  -- Session Performance
  total_duration_minutes INTEGER DEFAULT 0,
  session_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 7: CONCEPT MASTERY (Learning Progress)
-- ============================================================

CREATE TABLE IF NOT EXISTS concept_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Concept Details
  concept TEXT NOT NULL,
  topic TEXT NOT NULL,
  subject TEXT,
  grade_level INTEGER,
  
  -- Mastery Metrics
  mastery_level TEXT DEFAULT 'novice' CHECK (mastery_level IN ('novice', 'beginner', 'practicing', 'proficient', 'mastered', 'expert')),
  mastery_percentage NUMERIC(5,2) DEFAULT 0,
  
  -- Practice Statistics
  total_attempts INTEGER DEFAULT 0,
  successful_attempts INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Recent Performance (last 5 attempts)
  recent_scores INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  trend TEXT, -- 'improving', 'declining', 'stable'
  
  -- Time Tracking
  total_practice_time_minutes INTEGER DEFAULT 0,
  average_time_per_attempt INTEGER,
  
  -- Learning Journey
  first_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mastered_at TIMESTAMP WITH TIME ZONE,
  
  -- Related Data
  related_sessions UUID[] DEFAULT ARRAY[]::UUID[],
  related_assignments UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Metadata
  notes TEXT,
  
  -- Unique constraint: one entry per student per concept
  UNIQUE(student_id, concept, topic),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 8: PERFORMANCE ANALYTICS (Aggregated Stats)
-- ============================================================

CREATE TABLE IF NOT EXISTS performance_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scope
  topic TEXT NOT NULL,
  subject TEXT,
  time_period TEXT DEFAULT 'all_time', -- 'daily', 'weekly', 'monthly', 'all_time'
  
  -- Session Statistics
  session_count INTEGER DEFAULT 1,
  total_session_time_minutes INTEGER DEFAULT 0,
  average_session_duration INTEGER,
  
  -- Performance Metrics
  average_score NUMERIC(5,2) DEFAULT 0,
  highest_score NUMERIC(5,2) DEFAULT 0,
  lowest_score NUMERIC(5,2) DEFAULT 0,
  total_assessments INTEGER DEFAULT 0,
  passed_assessments INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  engagement_level NUMERIC(5,2) DEFAULT 50,
  participation_rate NUMERIC(5,2) DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Learning Coverage
  topics_covered TEXT[] DEFAULT ARRAY[]::TEXT[],
  concepts_learned TEXT[] DEFAULT ARRAY[]::TEXT[],
  weak_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  strong_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Trend Analysis
  score_trend TEXT, -- 'improving', 'declining', 'stable'
  engagement_trend TEXT,
  learning_velocity NUMERIC(5,2), -- Concepts mastered per week
  
  -- Recommendations
  recommended_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  suggested_difficulty TEXT,
  
  -- Activity Tracking
  last_session_date TIMESTAMP WITH TIME ZONE,
  streak_days INTEGER DEFAULT 0,
  
  -- Unique constraint: one entry per student per topic per period
  UNIQUE(student_id, topic, time_period),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 9: RESOURCES & RECOMMENDATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Resource Details
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('video', 'article', 'exercise', 'game', 'tutorial', 'reference')),
  url TEXT NOT NULL,
  
  -- Classification
  topic TEXT NOT NULL,
  subject TEXT,
  grade_levels INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Metadata
  duration_minutes INTEGER,
  source TEXT,
  author TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Quality Metrics
  rating NUMERIC(3,2),
  view_count INTEGER DEFAULT 0,
  recommendation_count INTEGER DEFAULT 0,
  
  -- Content
  thumbnail_url TEXT,
  preview_text TEXT,
  full_content TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  
  -- Recommendation Context
  reason TEXT,
  relevance_score NUMERIC(5,2) CHECK (relevance_score >= 0 AND relevance_score <= 100),
  priority INTEGER DEFAULT 0,
  
  -- Related To
  related_session_id UUID REFERENCES learning_sessions(id) ON DELETE SET NULL,
  related_assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  related_topic TEXT,
  
  -- Student Interaction
  viewed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  student_rating INTEGER CHECK (student_rating >= 1 AND student_rating <= 5),
  was_helpful BOOLEAN,
  
  -- Timestamps
  recommended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- SECTION 10: ACTIVITY LOG (Complete Audit Trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Activity Details
  activity_type TEXT NOT NULL, -- 'session_start', 'assessment_complete', 'assignment_submit', etc.
  activity_category TEXT NOT NULL CHECK (activity_category IN ('learning', 'assessment', 'assignment', 'tutor', 'system')),
  
  -- Related Entities
  related_session_id UUID,
  related_assessment_id UUID,
  related_assignment_id UUID,
  
  -- Activity Data
  activity_description TEXT,
  activity_data JSONB DEFAULT '{}'::jsonb,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 11: COMPREHENSIVE INDEXES
-- ============================================================

-- Student Profiles
CREATE INDEX IF NOT EXISTS idx_student_profiles_grade ON student_profiles(grade_level);
CREATE INDEX IF NOT EXISTS idx_student_profiles_learning_style ON student_profiles(learning_style);
CREATE INDEX IF NOT EXISTS idx_student_profiles_last_activity ON student_profiles(last_activity_at DESC);

-- Learning Sessions
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student ON learning_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_topic ON learning_sessions(topic);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_status ON learning_sessions(status);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_created ON learning_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student_topic ON learning_sessions(student_id, topic);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student_status ON learning_sessions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_last_activity ON learning_sessions(last_activity_at DESC);

-- Assessments
CREATE INDEX IF NOT EXISTS idx_assessments_student ON assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_session ON assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_assessments_topic ON assessments(topic);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_created ON assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_student_topic ON assessments(student_id, topic);

-- Assignments
CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_session ON assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_topic ON assignments(topic);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_difficulty ON assignments(difficulty);
CREATE INDEX IF NOT EXISTS idx_assignments_created ON assignments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_student_status ON assignments(student_id, status);

-- Feedback History
CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback_history(student_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback_history(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_assignment ON feedback_history(assignment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_assessment ON feedback_history(assessment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback_history(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_history(created_at DESC);

-- Tutor Sessions
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_student ON tutor_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_learning_session ON tutor_sessions(learning_session_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_created ON tutor_sessions(created_at DESC);

-- Concept Mastery
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student ON concept_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_topic ON concept_mastery(topic);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_level ON concept_mastery(mastery_level);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student_topic ON concept_mastery(student_id, topic);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_last_practiced ON concept_mastery(last_practiced_at DESC);

-- Performance Analytics
CREATE INDEX IF NOT EXISTS idx_performance_student ON performance_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_performance_topic ON performance_analytics(topic);
CREATE INDEX IF NOT EXISTS idx_performance_period ON performance_analytics(time_period);
CREATE INDEX IF NOT EXISTS idx_performance_student_topic ON performance_analytics(student_id, topic);

-- Resources
CREATE INDEX IF NOT EXISTS idx_resources_topic ON resources(topic);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_difficulty ON resources(difficulty);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active) WHERE is_active = true;

-- Resource Recommendations
CREATE INDEX IF NOT EXISTS idx_resource_recs_student ON resource_recommendations(student_id);
CREATE INDEX IF NOT EXISTS idx_resource_recs_resource ON resource_recommendations(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_recs_viewed ON resource_recommendations(viewed);
CREATE INDEX IF NOT EXISTS idx_resource_recs_completed ON resource_recommendations(completed);

-- Activity Log
CREATE INDEX IF NOT EXISTS idx_activity_log_student ON activity_log(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_category ON activity_log(activity_category);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================================
-- SECTION 12: AUTOMATIC TIMESTAMP UPDATES
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_sessions_updated_at BEFORE UPDATE ON learning_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concept_mastery_updated_at BEFORE UPDATE ON concept_mastery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_analytics_updated_at BEFORE UPDATE ON performance_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tutor_sessions_updated_at BEFORE UPDATE ON tutor_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION 13: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all user-related tables
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Student Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON student_profiles;

CREATE POLICY "Users can view own profile" ON student_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON student_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON student_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Learning Sessions Policies
DROP POLICY IF EXISTS "Students can view own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can insert own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can update own sessions" ON learning_sessions;
DROP POLICY IF EXISTS "Students can delete own sessions" ON learning_sessions;

CREATE POLICY "Students can view own sessions" ON learning_sessions
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own sessions" ON learning_sessions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own sessions" ON learning_sessions
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own sessions" ON learning_sessions
    FOR DELETE USING (auth.uid() = student_id);

-- Assessments Policies
DROP POLICY IF EXISTS "Students can view own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can insert own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can update own assessments" ON assessments;
DROP POLICY IF EXISTS "Students can delete own assessments" ON assessments;

CREATE POLICY "Students can view own assessments" ON assessments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own assessments" ON assessments
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own assessments" ON assessments
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own assessments" ON assessments
    FOR DELETE USING (auth.uid() = student_id);

-- Assignments Policies
DROP POLICY IF EXISTS "Students can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can insert own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can update own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can delete own assignments" ON assignments;

CREATE POLICY "Students can view own assignments" ON assignments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own assignments" ON assignments
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own assignments" ON assignments
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own assignments" ON assignments
    FOR DELETE USING (auth.uid() = student_id);

-- Feedback History Policies
DROP POLICY IF EXISTS "Students can view own feedback" ON feedback_history;
DROP POLICY IF EXISTS "Students can insert own feedback" ON feedback_history;

CREATE POLICY "Students can view own feedback" ON feedback_history
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own feedback" ON feedback_history
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Tutor Sessions Policies
DROP POLICY IF EXISTS "Students can view own tutor sessions" ON tutor_sessions;
DROP POLICY IF EXISTS "Students can insert own tutor sessions" ON tutor_sessions;
DROP POLICY IF EXISTS "Students can update own tutor sessions" ON tutor_sessions;

CREATE POLICY "Students can view own tutor sessions" ON tutor_sessions
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own tutor sessions" ON tutor_sessions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own tutor sessions" ON tutor_sessions
    FOR UPDATE USING (auth.uid() = student_id);

-- Concept Mastery Policies
DROP POLICY IF EXISTS "Students can view own concept mastery" ON concept_mastery;
DROP POLICY IF EXISTS "Students can insert own concept mastery" ON concept_mastery;
DROP POLICY IF EXISTS "Students can update own concept mastery" ON concept_mastery;

CREATE POLICY "Students can view own concept mastery" ON concept_mastery
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own concept mastery" ON concept_mastery
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own concept mastery" ON concept_mastery
    FOR UPDATE USING (auth.uid() = student_id);

-- Performance Analytics Policies
DROP POLICY IF EXISTS "Students can view own analytics" ON performance_analytics;
DROP POLICY IF EXISTS "Students can insert own analytics" ON performance_analytics;
DROP POLICY IF EXISTS "Students can update own analytics" ON performance_analytics;

CREATE POLICY "Students can view own analytics" ON performance_analytics
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own analytics" ON performance_analytics
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own analytics" ON performance_analytics
    FOR UPDATE USING (auth.uid() = student_id);

-- Resource Recommendations Policies
DROP POLICY IF EXISTS "Students can view own recommendations" ON resource_recommendations;
DROP POLICY IF EXISTS "Students can update own recommendations" ON resource_recommendations;

CREATE POLICY "Students can view own recommendations" ON resource_recommendations
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update own recommendations" ON resource_recommendations
    FOR UPDATE USING (auth.uid() = student_id);

-- Resources - Public read, admin write
DROP POLICY IF EXISTS "Anyone can view active resources" ON resources;
CREATE POLICY "Anyone can view active resources" ON resources
    FOR SELECT USING (is_active = true);

-- Activity Log Policies
DROP POLICY IF EXISTS "Students can view own activity log" ON activity_log;
DROP POLICY IF EXISTS "Students can insert own activity log" ON activity_log;

CREATE POLICY "Students can view own activity log" ON activity_log
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own activity log" ON activity_log
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- ============================================================
-- SECTION 14: USEFUL VIEWS FOR EASY DATA ACCESS
-- ============================================================

-- Student Dashboard View
CREATE OR REPLACE VIEW student_dashboard AS
SELECT 
    sp.id as student_id,
    sp.name,
    sp.grade_level,
    sp.average_score,
    sp.current_streak,
    sp.total_sessions,
    sp.completed_assignments,
    sp.last_activity_at,
    sp.last_session_topic,
    COUNT(DISTINCT ls.id) as active_sessions,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'in_progress') as pending_assignments,
    COALESCE(AVG(ass.score), 0) as recent_assessment_avg
FROM student_profiles sp
LEFT JOIN learning_sessions ls ON sp.id = ls.student_id AND ls.status = 'active'
LEFT JOIN assignments a ON sp.id = a.student_id
LEFT JOIN assessments ass ON sp.id = ass.student_id 
    AND ass.completed_at > NOW() - INTERVAL '7 days'
GROUP BY sp.id;

-- Session History View
CREATE OR REPLACE VIEW session_history AS
SELECT 
    ls.id,
    ls.student_id,
    sp.name as student_name,
    ls.topic,
    ls.status,
    ls.progress_percentage,
    ls.time_spent_minutes,
    ls.message_count,
    ls.concepts_covered,
    ls.created_at,
    ls.completed_at,
    COALESCE(array_length(ls.concepts_mastered, 1), 0) as concepts_mastered_count,
    CASE 
        WHEN ls.status = 'completed' THEN 'Completed'
        WHEN ls.status = 'paused' THEN 'Paused'
        WHEN ls.status = 'active' THEN 'In Progress'
        ELSE 'Abandoned'
    END as status_display
FROM learning_sessions ls
JOIN student_profiles sp ON ls.student_id = sp.id
ORDER BY ls.last_activity_at DESC;

-- Assessment Performance View
CREATE OR REPLACE VIEW assessment_performance AS
SELECT 
    a.id,
    a.student_id,
    sp.name as student_name,
    a.topic,
    a.score,
    a.percentage,
    a.total_questions,
    a.correct_count,
    a.weak_concepts,
    a.strong_concepts,
    a.completed_at,
    CASE 
        WHEN a.percentage >= 90 THEN 'Excellent'
        WHEN a.percentage >= 80 THEN 'Good'
        WHEN a.percentage >= 70 THEN 'Satisfactory'
        WHEN a.percentage >= 60 THEN 'Needs Improvement'
        ELSE 'Needs Attention'
    END as performance_level
FROM assessments a
JOIN student_profiles sp ON a.student_id = sp.id
WHERE a.status = 'completed'
ORDER BY a.completed_at DESC;

-- Learning Progress View
CREATE OR REPLACE VIEW learning_progress AS
SELECT 
    cm.student_id,
    sp.name as student_name,
    cm.topic,
    COUNT(*) as total_concepts,
    COUNT(*) FILTER (WHERE cm.mastery_level = 'mastered') as mastered_count,
    COUNT(*) FILTER (WHERE cm.mastery_level = 'proficient') as proficient_count,
    COUNT(*) FILTER (WHERE cm.mastery_level = 'practicing') as practicing_count,
    COUNT(*) FILTER (WHERE cm.mastery_level IN ('novice', 'beginner')) as learning_count,
    ROUND(AVG(cm.mastery_percentage), 2) as average_mastery,
    MAX(cm.last_practiced_at) as last_practice_date
FROM concept_mastery cm
JOIN student_profiles sp ON cm.student_id = sp.id
GROUP BY cm.student_id, sp.name, cm.topic
ORDER BY average_mastery DESC;

-- ============================================================
-- SECTION 15: HELPER FUNCTIONS
-- ============================================================

-- Function to get student's complete learning history
CREATE OR REPLACE FUNCTION get_student_history(p_student_id UUID)
RETURNS TABLE (
    history_type TEXT,
    id UUID,
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    score NUMERIC,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Session'::TEXT as history_type,
        ls.id,
        ls.topic,
        ls.created_at,
        ls.status,
        NULL::NUMERIC as score,
        jsonb_build_object(
            'time_spent', ls.time_spent_minutes,
            'concepts_covered', ls.concepts_covered,
            'progress', ls.progress_percentage
        ) as details
    FROM learning_sessions ls
    WHERE ls.student_id = p_student_id
    
    UNION ALL
    
    SELECT 
        'Assessment'::TEXT,
        a.id,
        a.topic,
        a.created_at,
        a.status,
        a.score,
        jsonb_build_object(
            'total_questions', a.total_questions,
            'correct_count', a.correct_count,
            'percentage', a.percentage
        ) as details
    FROM assessments a
    WHERE a.student_id = p_student_id
    
    UNION ALL
    
    SELECT 
        'Assignment'::TEXT,
        asn.id,
        asn.topic,
        asn.created_at,
        asn.status,
        asn.score::NUMERIC,
        jsonb_build_object(
            'title', asn.title,
            'difficulty', asn.difficulty,
            'time_spent', asn.time_spent_seconds
        ) as details
    FROM assignments asn
    WHERE asn.student_id = p_student_id
    
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update student profile statistics
CREATE OR REPLACE FUNCTION update_student_stats(p_student_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE student_profiles
    SET 
        total_sessions = (
            SELECT COUNT(*) FROM learning_sessions 
            WHERE student_id = p_student_id
        ),
        completed_assignments = (
            SELECT COUNT(*) FROM assignments 
            WHERE student_id = p_student_id AND status = 'completed'
        ),
        total_assignments = (
            SELECT COUNT(*) FROM assignments 
            WHERE student_id = p_student_id
        ),
        total_assessments = (
            SELECT COUNT(*) FROM assessments 
            WHERE student_id = p_student_id AND status = 'completed'
        ),
        average_score = (
            SELECT COALESCE(AVG(score), 0) FROM assessments 
            WHERE student_id = p_student_id AND status = 'completed'
        ),
        total_learning_time = (
            SELECT COALESCE(SUM(time_spent_minutes), 0) FROM learning_sessions 
            WHERE student_id = p_student_id
        ),
        topics_studied = (
            SELECT ARRAY_AGG(DISTINCT topic) FROM learning_sessions 
            WHERE student_id = p_student_id
        ),
        mastered_topics = (
            SELECT ARRAY_AGG(DISTINCT topic) FROM concept_mastery 
            WHERE student_id = p_student_id AND mastery_level = 'mastered'
        ),
        updated_at = NOW()
    WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
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

-- Verify all RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify all indexes
SELECT 
    tablename,
    indexname,
    indexdef
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
ORDER BY tablename, indexname;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ OPTIMIZED USER-CENTRIC SCHEMA CREATED SUCCESSFULLY!';
    RAISE NOTICE '📊 All tables created with proper foreign keys to auth.users(id)';
    RAISE NOTICE '🔒 Row Level Security enabled on all user tables';
    RAISE NOTICE '⚡ Comprehensive indexes created for performance';
    RAISE NOTICE '🔄 Automatic timestamp triggers configured';
    RAISE NOTICE '👁️  Helpful views created for easy data access';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run verification queries above';
    RAISE NOTICE '2. Test with: SELECT * FROM student_dashboard;';
    RAISE NOTICE '3. Update your application code to use these tables';
END $$;
