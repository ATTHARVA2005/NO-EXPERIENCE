-- ========================================
-- ASSIGNMENT AGENT SYSTEM - DATABASE SETUP
-- Complete SQL migration for Supabase
-- ========================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. STUDENT PROFILES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
  learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'reading')),
  average_score NUMERIC(5,2) CHECK (average_score >= 0 AND average_score <= 100),
  total_assignments INTEGER DEFAULT 0,
  completed_assignments INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. TUTOR SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS tutor_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topics_covered TEXT[] DEFAULT ARRAY[]::TEXT[],
  struggling_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  mastered_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
  duration INTEGER, -- Duration in seconds
  session_notes TEXT,
  questions_asked INTEGER DEFAULT 0,
  concepts_explained TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. ASSIGNMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Assignment details
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  estimated_time INTEGER, -- Estimated time in minutes
  
  -- Game configuration
  mini_games JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_points INTEGER NOT NULL DEFAULT 0,
  passing_score INTEGER NOT NULL DEFAULT 0,
  learning_objectives TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Personalization
  adapted_for JSONB DEFAULT '{}'::jsonb,
  
  -- Status and results
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
  score INTEGER,
  percent_correct INTEGER CHECK (percent_correct >= 0 AND percent_correct <= 100),
  time_spent INTEGER, -- Actual time spent in seconds
  
  -- Detailed results
  game_results JSONB,
  student_feedback TEXT,
  tutor_guidance TEXT,
  
  -- Concept tracking
  weak_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  strong_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- 4. LEARNING SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tutor_session', 'assessment', 'feedback', 'practice')),
  content TEXT NOT NULL,
  response TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  duration INTEGER, -- Duration in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 5. FEEDBACK HISTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS feedback_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  
  -- Performance analysis
  weak_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  strong_concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  recommended_difficulty TEXT CHECK (recommended_difficulty IN ('easy', 'medium', 'hard')),
  focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  engagement_level TEXT CHECK (engagement_level IN ('low', 'medium', 'high')),
  
  -- Recommendations
  tutor_recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  next_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  practice_recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Feedback text
  student_feedback TEXT,
  tutor_guidance TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 6. CONCEPT MASTERY TRACKING
-- ========================================
CREATE TABLE IF NOT EXISTS concept_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  topic TEXT NOT NULL,
  grade_level INTEGER,
  
  -- Mastery metrics
  mastery_level TEXT DEFAULT 'novice' CHECK (mastery_level IN ('novice', 'practicing', 'proficient', 'mastered')),
  attempts INTEGER DEFAULT 0,
  successes INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Progress tracking
  first_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mastered_at TIMESTAMP WITH TIME ZONE,
  
  -- Unique constraint: one entry per student per concept
  UNIQUE(student_id, concept, topic)
);

-- ========================================
-- 7. INDEXES FOR PERFORMANCE
-- ========================================

-- Student profiles indexes
CREATE INDEX IF NOT EXISTS idx_student_profiles_grade ON student_profiles(grade_level);
CREATE INDEX IF NOT EXISTS idx_student_profiles_learning_style ON student_profiles(learning_style);

-- Tutor sessions indexes
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_student ON tutor_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_created ON tutor_sessions(created_at DESC);

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_created ON assignments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_topic ON assignments(topic);
CREATE INDEX IF NOT EXISTS idx_assignments_difficulty ON assignments(difficulty);

-- Learning sessions indexes
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student ON learning_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_type ON learning_sessions(type);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_created ON learning_sessions(created_at DESC);

-- Feedback history indexes
CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback_history(student_id);
CREATE INDEX IF NOT EXISTS idx_feedback_assignment ON feedback_history(assignment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_history(created_at DESC);

-- Concept mastery indexes
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student ON concept_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_level ON concept_mastery(mastery_level);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_topic ON concept_mastery(topic);

-- ========================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;

-- Student Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON student_profiles;
CREATE POLICY "Users can view their own profile"
  ON student_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON student_profiles;
CREATE POLICY "Users can update their own profile"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON student_profiles;
CREATE POLICY "Users can insert their own profile"
  ON student_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Tutor Sessions Policies
DROP POLICY IF EXISTS "Users can view their own tutor sessions" ON tutor_sessions;
CREATE POLICY "Users can view their own tutor sessions"
  ON tutor_sessions FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert their own tutor sessions" ON tutor_sessions;
CREATE POLICY "Users can insert their own tutor sessions"
  ON tutor_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Assignments Policies
DROP POLICY IF EXISTS "Users can view their own assignments" ON assignments;
CREATE POLICY "Users can view their own assignments"
  ON assignments FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert their own assignments" ON assignments;
CREATE POLICY "Users can insert their own assignments"
  ON assignments FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update their own assignments" ON assignments;
CREATE POLICY "Users can update their own assignments"
  ON assignments FOR UPDATE
  USING (auth.uid() = student_id);

-- Learning Sessions Policies
DROP POLICY IF EXISTS "Users can view their own learning sessions" ON learning_sessions;
CREATE POLICY "Users can view their own learning sessions"
  ON learning_sessions FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert their own learning sessions" ON learning_sessions;
CREATE POLICY "Users can insert their own learning sessions"
  ON learning_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Feedback History Policies
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback_history;
CREATE POLICY "Users can view their own feedback"
  ON feedback_history FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert their own feedback" ON feedback_history;
CREATE POLICY "Users can insert their own feedback"
  ON feedback_history FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Concept Mastery Policies
DROP POLICY IF EXISTS "Users can view their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can view their own concept mastery"
  ON concept_mastery FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can insert their own concept mastery"
  ON concept_mastery FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can update their own concept mastery"
  ON concept_mastery FOR UPDATE
  USING (auth.uid() = student_id);

-- ========================================
-- 9. FUNCTIONS AND TRIGGERS
-- ========================================

-- Function: Update student profile statistics
CREATE OR REPLACE FUNCTION update_student_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE student_profiles
    SET 
      completed_assignments = completed_assignments + 1,
      average_score = (
        SELECT AVG(percent_correct)
        FROM assignments
        WHERE student_id = NEW.student_id AND status = 'completed'
      ),
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update stats when assignment completed
DROP TRIGGER IF EXISTS trigger_update_student_stats ON assignments;
CREATE TRIGGER trigger_update_student_stats
  AFTER UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_stats();

-- Function: Update concept mastery
CREATE OR REPLACE FUNCTION update_concept_mastery(
  p_student_id UUID,
  p_concept TEXT,
  p_topic TEXT,
  p_grade_level INTEGER,
  p_success BOOLEAN
)
RETURNS VOID AS $$
DECLARE
  v_attempts INTEGER;
  v_successes INTEGER;
  v_success_rate NUMERIC(5,2);
  v_mastery_level TEXT;
BEGIN
  -- Insert or update concept mastery
  INSERT INTO concept_mastery (student_id, concept, topic, grade_level, attempts, successes)
  VALUES (p_student_id, p_concept, p_topic, p_grade_level, 1, CASE WHEN p_success THEN 1 ELSE 0 END)
  ON CONFLICT (student_id, concept, topic)
  DO UPDATE SET
    attempts = concept_mastery.attempts + 1,
    successes = concept_mastery.successes + CASE WHEN p_success THEN 1 ELSE 0 END,
    last_practiced_at = NOW();
  
  -- Calculate new metrics
  SELECT attempts, successes INTO v_attempts, v_successes
  FROM concept_mastery
  WHERE student_id = p_student_id AND concept = p_concept AND topic = p_topic;
  
  v_success_rate := (v_successes::NUMERIC / v_attempts::NUMERIC * 100);
  
  -- Determine mastery level
  IF v_success_rate >= 90 AND v_attempts >= 5 THEN
    v_mastery_level := 'mastered';
  ELSIF v_success_rate >= 70 AND v_attempts >= 3 THEN
    v_mastery_level := 'proficient';
  ELSIF v_attempts >= 2 THEN
    v_mastery_level := 'practicing';
  ELSE
    v_mastery_level := 'novice';
  END IF;
  
  -- Update mastery level and success rate
  UPDATE concept_mastery
  SET 
    success_rate = v_success_rate,
    mastery_level = v_mastery_level,
    mastered_at = CASE WHEN v_mastery_level = 'mastered' THEN NOW() ELSE mastered_at END
  WHERE student_id = p_student_id AND concept = p_concept AND topic = p_topic;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update student_profiles.updated_at
DROP TRIGGER IF EXISTS trigger_update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER trigger_update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 10. SAMPLE DATA (FOR TESTING)
-- ========================================

-- Note: Uncomment the following to insert sample test data
-- Replace 'your-user-id-here' with an actual auth.users.id

/*
-- Sample student profile
INSERT INTO student_profiles (id, name, grade_level, learning_style)
VALUES (
  'your-user-id-here'::UUID,
  'Test Student',
  3,
  'visual'
)
ON CONFLICT (id) DO NOTHING;

-- Sample tutor session
INSERT INTO tutor_sessions (student_id, topics_covered, struggling_areas, mastered_areas, engagement_score, duration)
VALUES (
  'your-user-id-here'::UUID,
  ARRAY['Addition', 'Subtraction'],
  ARRAY['Borrowing', 'Word problems'],
  ARRAY['Single-digit addition'],
  75,
  600
);

-- Sample concept mastery entries
INSERT INTO concept_mastery (student_id, concept, topic, grade_level, attempts, successes, success_rate, mastery_level)
VALUES
  ('your-user-id-here'::UUID, 'Single-digit addition', 'Addition', 3, 10, 10, 100, 'mastered'),
  ('your-user-id-here'::UUID, 'Borrowing', 'Subtraction', 3, 5, 3, 60, 'practicing'),
  ('your-user-id-here'::UUID, 'Word problems', 'Mixed operations', 3, 8, 4, 50, 'practicing')
ON CONFLICT (student_id, concept, topic) DO NOTHING;
*/

-- ========================================
-- 11. VIEWS FOR ANALYTICS
-- ========================================

-- View: Student progress summary
CREATE OR REPLACE VIEW student_progress_summary AS
SELECT 
  sp.id as student_id,
  sp.name,
  sp.grade_level,
  sp.learning_style,
  sp.average_score,
  sp.completed_assignments,
  sp.current_streak,
  COUNT(DISTINCT cm.concept) FILTER (WHERE cm.mastery_level = 'mastered') as concepts_mastered,
  COUNT(DISTINCT cm.concept) FILTER (WHERE cm.mastery_level IN ('practicing', 'proficient')) as concepts_in_progress,
  sp.last_activity_at
FROM student_profiles sp
LEFT JOIN concept_mastery cm ON sp.id = cm.student_id
GROUP BY sp.id, sp.name, sp.grade_level, sp.learning_style, sp.average_score, 
         sp.completed_assignments, sp.current_streak, sp.last_activity_at;

-- View: Recent activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  student_id,
  'tutor_session' as activity_type,
  array_to_string(topics_covered, ', ') as title,
  NULL::INTEGER as score,
  created_at
FROM tutor_sessions
UNION ALL
SELECT 
  student_id,
  'assignment' as activity_type,
  title,
  percent_correct as score,
  completed_at as created_at
FROM assignments
WHERE status = 'completed'
ORDER BY created_at DESC;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'student_profiles',
    'tutor_sessions', 
    'assignments',
    'learning_sessions',
    'feedback_history',
    'concept_mastery'
  )
ORDER BY table_name;
