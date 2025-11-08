-- Learning Sessions Table
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  grade_level INT NOT NULL,
  learning_style TEXT DEFAULT 'auditory',
  tutor_messages JSONB NOT NULL DEFAULT '[]',
  current_phase TEXT DEFAULT 'learning',
  performance_data JSONB,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_student_id (student_id),
  INDEX idx_session_id (session_id)
);

-- Agent Workflows Table - tracks each agent's work
CREATE TABLE IF NOT EXISTS agent_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL UNIQUE,
  phase TEXT NOT NULL, -- 'tutor', 'assessment', 'feedback', 'synthesis'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in-progress', 'completed'
  workflow_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_student_id (student_id),
  INDEX idx_phase (phase)
);

-- Assessments Table - stores assessment questions and results
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  questions JSONB NOT NULL,
  student_answers JSONB,
  score FLOAT,
  feedback_data JSONB,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_student_id (student_id),
  INDEX idx_session_id (session_id)
);

-- Feedback Records Table - comprehensive feedback from feedback agent
CREATE TABLE IF NOT EXISTS feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL, -- 'question', 'assessment', 'session'
  content JSONB NOT NULL,
  student_misconceptions TEXT[],
  learning_gaps TEXT[],
  recommendations TEXT[],
  confidence_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_student_id (student_id),
  INDEX idx_session_id (session_id)
);

-- Performance Analytics Table - tracks student progress over time
CREATE TABLE IF NOT EXISTS performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  session_count INT DEFAULT 1,
  average_score FLOAT,
  engagement_level FLOAT DEFAULT 50,
  topics_covered TEXT[] DEFAULT '{}',
  weak_concepts TEXT[] DEFAULT '{}',
  strong_concepts TEXT[] DEFAULT '{}',
  last_session_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, topic),
  INDEX idx_student_id (student_id),
  INDEX idx_topic (topic)
);

-- Tutor Session History - detailed logs of tutor interactions
CREATE TABLE IF NOT EXISTS tutor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message_count INT DEFAULT 0,
  total_duration_minutes INT,
  engagement_metrics JSONB,
  topics_discussed TEXT[] DEFAULT '{}',
  learning_objectives TEXT[] DEFAULT '{}',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_student_id (student_id),
  INDEX idx_session_id (session_id)
);

-- Enable RLS policies
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own sessions" ON learning_sessions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own workflows" ON agent_workflows
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own assessments" ON assessments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own feedback" ON feedback_records
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own analytics" ON performance_analytics
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own tutor sessions" ON tutor_sessions
  FOR SELECT USING (auth.uid() = student_id);

-- Create indexes for performance
CREATE INDEX idx_learning_sessions_created ON learning_sessions(created_at);
CREATE INDEX idx_assessments_created ON assessments(created_at);
CREATE INDEX idx_feedback_records_created ON feedback_records(created_at);
