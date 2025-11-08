-- Fix learning_sessions table to support curriculum generation
-- This adds missing columns needed by the generate-curriculum API

-- Add missing columns to learning_sessions
ALTER TABLE learning_sessions 
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS grade_level TEXT,
  ADD COLUMN IF NOT EXISTS learning_style TEXT DEFAULT 'visual',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS syllabus_content TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_plan JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS learning_goals TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Make type and content nullable since we're using this for curriculum sessions too
ALTER TABLE learning_sessions ALTER COLUMN type DROP NOT NULL;
ALTER TABLE learning_sessions ALTER COLUMN content DROP NOT NULL;

-- Add check constraint for status
ALTER TABLE learning_sessions DROP CONSTRAINT IF EXISTS learning_sessions_status_check;
ALTER TABLE learning_sessions ADD CONSTRAINT learning_sessions_status_check 
  CHECK (status IS NULL OR status IN ('active', 'paused', 'completed'));

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_learning_sessions_status ON learning_sessions(status);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_topic ON learning_sessions(topic);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student_updated ON learning_sessions(student_id, updated_at DESC);

-- Update RLS policies to allow service role to insert
DROP POLICY IF EXISTS "Service role can insert learning sessions" ON learning_sessions;
CREATE POLICY "Service role can insert learning sessions" 
  ON learning_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update learning sessions" ON learning_sessions;
CREATE POLICY "Service role can update learning sessions" 
  ON learning_sessions FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Service role can select learning sessions" ON learning_sessions;
CREATE POLICY "Service role can select learning sessions" 
  ON learning_sessions FOR SELECT
  USING (true);

-- Also allow students to view their own sessions
DROP POLICY IF EXISTS "Students can view own sessions" ON learning_sessions;
CREATE POLICY "Students can view own sessions" 
  ON learning_sessions FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own sessions" ON learning_sessions;
CREATE POLICY "Students can insert own sessions" 
  ON learning_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);
