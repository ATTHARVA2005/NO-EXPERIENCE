-- Migration: Add curriculum analytics table for teacher dashboard
-- Created: 2025-11-05

-- Table to store curriculum generation analytics for teacher review
CREATE TABLE IF NOT EXISTS curriculum_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  lesson_count INTEGER DEFAULT 0,
  resource_count INTEGER DEFAULT 0,
  assignment_count INTEGER DEFAULT 0,
  curriculum_quality_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
  ai_generated BOOLEAN DEFAULT true,
  teacher_reviewed BOOLEAN DEFAULT false,
  teacher_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast teacher dashboard queries
CREATE INDEX idx_curriculum_analytics_student ON curriculum_analytics(student_id, created_at DESC);
CREATE INDEX idx_curriculum_analytics_session ON curriculum_analytics(session_id);
CREATE INDEX idx_curriculum_analytics_quality ON curriculum_analytics(curriculum_quality_score DESC);

-- Enable RLS
ALTER TABLE curriculum_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own analytics
CREATE POLICY "Students can view own curriculum analytics"
  ON curriculum_analytics FOR SELECT
  USING (auth.uid() = student_id);

-- Policy: Service role can do anything
CREATE POLICY "Service role full access to curriculum analytics"
  ON curriculum_analytics FOR ALL
  USING (auth.role() = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_curriculum_analytics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_curriculum_analytics_timestamp
  BEFORE UPDATE ON curriculum_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_curriculum_analytics_timestamp();

-- Add comment
COMMENT ON TABLE curriculum_analytics IS 'Stores curriculum generation analytics for teacher dashboard and quality monitoring';
