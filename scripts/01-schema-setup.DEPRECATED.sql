-- Simplified schema to match current agent implementation
-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER DEFAULT 9,
  learning_style TEXT DEFAULT 'visual',
  average_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create learning sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tutor_session', 'assessment', 'feedback')),
  content TEXT NOT NULL,
  response TEXT,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Create student weaknesses tracking
CREATE TABLE IF NOT EXISTS student_weaknesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(student_id, topic)
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB,
  score NUMERIC(5,2) DEFAULT 0,
  accuracy NUMERIC(5,2) DEFAULT 0,
  confidence NUMERIC(3,2) DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);

-- Create feedback reports table
CREATE TABLE IF NOT EXISTS feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  question_index INTEGER,
  feedback JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  duration TEXT,
  difficulty TEXT,
  description TEXT,
  source TEXT,
  tags JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Create resource recommendations table
CREATE TABLE IF NOT EXISTS resource_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  reason TEXT,
  relevance_score NUMERIC(3,2),
  recommended_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for students table
CREATE POLICY students_select ON students FOR SELECT USING (auth.uid() = id);
CREATE POLICY students_update ON students FOR UPDATE USING (auth.uid() = id);
CREATE POLICY students_insert ON students FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for sessions table
CREATE POLICY sessions_select ON sessions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY sessions_insert ON sessions FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Create RLS policies for assessments table
CREATE POLICY assessments_select ON assessments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY assessments_insert ON assessments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY assessments_update ON assessments FOR UPDATE USING (auth.uid() = student_id);

-- Create RLS policies for feedback_reports table
CREATE POLICY feedback_reports_select ON feedback_reports FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE auth.uid() = id)
);

-- Create RLS policies for resource_recommendations table
CREATE POLICY resource_recommendations_select ON resource_recommendations FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE auth.uid() = id)
);

-- Create indexes
CREATE INDEX idx_sessions_student_id ON sessions(student_id);
CREATE INDEX idx_assessments_student_id ON assessments(student_id);
CREATE INDEX idx_weaknesses_student_id ON student_weaknesses(student_id);
CREATE INDEX idx_feedback_student_id ON feedback_reports(student_id);
CREATE INDEX idx_recommendations_student_id ON resource_recommendations(student_id);
