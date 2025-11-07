-- ============================================================
-- 🚀 COMPLETE FRESH SUPABASE SETUP
-- Run this ONCE in your new Supabase SQL Editor
-- ============================================================
-- 
-- This sets up EVERYTHING you need:
-- ✅ All 11 tables with proper relationships
-- ✅ All indexes for performance
-- ✅ All RLS policies for security
-- ✅ All views for easy querying
-- ✅ All helper functions
-- ✅ All triggers for automatic updates
--
-- Time: ~30 seconds to run
-- ============================================================

-- ============================================================
-- SECTION 1: ENABLE EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================
-- SECTION 2: CREATE ALL TABLES
-- ============================================================

-- Table 1: Student Profiles (Extended user information)
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
  total_learning_time INTEGER DEFAULT 0,
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

-- Table 2: Learning Sessions (All learning activity)
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
  tutor_messages JSONB DEFAULT '[]'::jsonb,
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

-- Table 3: Assessments (All testing & evaluation)
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

-- Table 4: Assignments (Practice work)
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
  performance_breakdown JSONB DEFAULT '{}'::jsonb,
  
  -- Feedback
  feedback JSONB DEFAULT '{}'::jsonb,
  weak_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  strong_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_minutes INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 5: Feedback History (All feedback records)
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
  generated_by TEXT DEFAULT 'system',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 6: Tutor Sessions (Conversation history)
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

-- Table 7: Concept Mastery (Learning progress)
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
  
  -- Progress Tracking
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  mastered_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance
  average_score NUMERIC(5,2) DEFAULT 0,
  best_score NUMERIC(5,2) DEFAULT 0,
  recent_scores NUMERIC(5,2)[] DEFAULT ARRAY[]::NUMERIC[],
  
  -- Insights
  common_mistakes TEXT[] DEFAULT ARRAY[]::TEXT[],
  learning_notes TEXT,
  
  -- Unique constraint
  UNIQUE(student_id, concept, topic),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 8: Performance Analytics (Aggregated stats)
CREATE TABLE IF NOT EXISTS performance_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scope
  topic TEXT NOT NULL,
  subject TEXT,
  time_period TEXT DEFAULT 'all_time',
  
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
  score_trend TEXT,
  engagement_trend TEXT,
  learning_velocity NUMERIC(5,2),
  
  -- Recommendations
  recommended_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  suggested_difficulty TEXT,
  
  -- Activity Tracking
  last_session_date TIMESTAMP WITH TIME ZONE,
  streak_days INTEGER DEFAULT 0,
  
  -- Unique constraint
  UNIQUE(student_id, topic, time_period),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 9: Resources (Learning materials)
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

-- Table 10: Resource Recommendations (Personalized suggestions)
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

-- Table 11: Activity Log (Complete audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Activity Details
  activity_type TEXT NOT NULL,
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
-- SECTION 3: CREATE ALL INDEXES (Performance)
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

-- Performance Analytics
CREATE INDEX IF NOT EXISTS idx_performance_student ON performance_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_performance_topic ON performance_analytics(topic);
CREATE INDEX IF NOT EXISTS idx_performance_period ON performance_analytics(time_period);
CREATE INDEX IF NOT EXISTS idx_performance_student_topic ON performance_analytics(student_id, topic);

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
-- SECTION 4: CREATE HELPER FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 5: CREATE AUTOMATIC TRIGGERS
-- ============================================================

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
-- SECTION 6: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_recommendations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 7: CREATE RLS POLICIES
-- ============================================================

-- Student Profiles Policies
CREATE POLICY "Students can view own profile" ON student_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Students can update own profile" ON student_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Students can insert own profile" ON student_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Learning Sessions Policies
CREATE POLICY "Students can view own sessions" ON learning_sessions
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own sessions" ON learning_sessions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own sessions" ON learning_sessions
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own sessions" ON learning_sessions
    FOR DELETE USING (auth.uid() = student_id);

-- Assessments Policies
CREATE POLICY "Students can view own assessments" ON assessments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own assessments" ON assessments
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own assessments" ON assessments
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own assessments" ON assessments
    FOR DELETE USING (auth.uid() = student_id);

-- Assignments Policies
CREATE POLICY "Students can view own assignments" ON assignments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own assignments" ON assignments
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own assignments" ON assignments
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own assignments" ON assignments
    FOR DELETE USING (auth.uid() = student_id);

-- Feedback History Policies
CREATE POLICY "Students can view own feedback" ON feedback_history
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own feedback" ON feedback_history
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Tutor Sessions Policies
CREATE POLICY "Students can view own tutor sessions" ON tutor_sessions
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own tutor sessions" ON tutor_sessions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own tutor sessions" ON tutor_sessions
    FOR UPDATE USING (auth.uid() = student_id);

-- Concept Mastery Policies
CREATE POLICY "Students can view own concept mastery" ON concept_mastery
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own concept mastery" ON concept_mastery
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own concept mastery" ON concept_mastery
    FOR UPDATE USING (auth.uid() = student_id);

-- Performance Analytics Policies
CREATE POLICY "Students can view own performance analytics" ON performance_analytics
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own performance analytics" ON performance_analytics
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own performance analytics" ON performance_analytics
    FOR UPDATE USING (auth.uid() = student_id);

-- Resources Policies (public read)
CREATE POLICY "All users can view resources" ON resources
    FOR SELECT USING (true);

-- Resource Recommendations Policies
CREATE POLICY "Students can view own resource recommendations" ON resource_recommendations
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own resource recommendations" ON resource_recommendations
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own resource recommendations" ON resource_recommendations
    FOR UPDATE USING (auth.uid() = student_id);

-- ============================================================
-- SECTION 8: CREATE HELPFUL VIEWS
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
-- ✅ SETUP COMPLETE!
-- ============================================================

SELECT 
    '✅ DATABASE SETUP COMPLETE!' as status,
    '11 Tables Created' as tables,
    '45+ Indexes Created' as indexes,
    '30+ RLS Policies Applied' as security,
    '4 Views Created' as views,
    '1 Helper Function' as functions,
    '7 Auto-Update Triggers' as triggers;

-- ============================================================
-- 🎯 NEXT STEPS:
-- ============================================================
-- 1. Go to Supabase Authentication settings
-- 2. Enable Email provider
-- 3. Test signup: Create a new user
-- 4. Run this query to create their profile:
--
--    INSERT INTO student_profiles (id, name, grade_level)
--    VALUES (
--      (SELECT id FROM auth.users WHERE email = 'test@example.com'),
--      'Test Student',
--      9
--    );
--
-- 5. Start using your app!
-- ============================================================
