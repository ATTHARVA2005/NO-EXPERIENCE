-- ============================================================
-- LESSON PROGRESS TRACKING SYSTEM
-- ============================================================
-- This schema tracks individual lesson progress, subtopic completion,
-- and maintains context for the AI tutor

-- Table: lesson_progress
-- Tracks overall progress for each lesson in a session
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    lesson_title TEXT NOT NULL,
    topic TEXT NOT NULL,
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed_subtopics INTEGER DEFAULT 0,
    total_subtopics INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'assessment_passed')),
    assessment_taken BOOLEAN DEFAULT FALSE,
    assessment_passed BOOLEAN DEFAULT FALSE,
    assessment_score INTEGER,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, lesson_id)
);

-- Table: subtopic_progress
-- Tracks individual subtopic/checkpoint completion within lessons
CREATE TABLE IF NOT EXISTS subtopic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_progress_id UUID NOT NULL REFERENCES lesson_progress(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
    
    subtopic_id TEXT NOT NULL,
    subtopic_title TEXT NOT NULL,
    subtopic_order INTEGER NOT NULL,
    
    -- Completion tracking
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    
    -- Tutor context - what was discussed
    concepts_covered TEXT[], -- Array of concepts the tutor explained
    student_understanding TEXT, -- Notes on student's grasp of the subtopic
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(lesson_progress_id, subtopic_id)
);

-- Table: lesson_context
-- Stores conversation context and teaching notes for each lesson
-- This helps the AI tutor maintain continuity
CREATE TABLE IF NOT EXISTS lesson_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_progress_id UUID NOT NULL REFERENCES lesson_progress(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
    
    -- Context data
    concepts_taught TEXT[], -- List of concepts covered
    examples_used TEXT[], -- Examples given by tutor
    questions_asked TEXT[], -- Student questions
    misconceptions_addressed TEXT[], -- Student misconceptions corrected
    
    -- Interaction summary
    total_messages INTEGER DEFAULT 0,
    student_engagement_level TEXT, -- 'high', 'medium', 'low'
    difficulty_level_adjusted TEXT, -- 'easier', 'harder', 'appropriate'
    
    -- Notes for teacher/parent
    tutor_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(lesson_progress_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student 
    ON lesson_progress(student_id);
    
CREATE INDEX IF NOT EXISTS idx_lesson_progress_session 
    ON lesson_progress(session_id);
    
CREATE INDEX IF NOT EXISTS idx_lesson_progress_status 
    ON lesson_progress(status);

CREATE INDEX IF NOT EXISTS idx_subtopic_progress_lesson 
    ON subtopic_progress(lesson_progress_id);
    
CREATE INDEX IF NOT EXISTS idx_subtopic_progress_student 
    ON subtopic_progress(student_id);

CREATE INDEX IF NOT EXISTS idx_lesson_context_lesson 
    ON lesson_context(lesson_progress_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
DROP TRIGGER IF EXISTS update_subtopic_progress_updated_at ON subtopic_progress;
DROP TRIGGER IF EXISTS update_lesson_context_updated_at ON lesson_context;

-- Create triggers
CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtopic_progress_updated_at
    BEFORE UPDATE ON subtopic_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_context_updated_at
    BEFORE UPDATE ON lesson_context
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_context ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Students can view their own lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Students can insert their own lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Students can update their own lesson progress" ON lesson_progress;

DROP POLICY IF EXISTS "Students can view their own subtopic progress" ON subtopic_progress;
DROP POLICY IF EXISTS "Students can insert their own subtopic progress" ON subtopic_progress;
DROP POLICY IF EXISTS "Students can update their own subtopic progress" ON subtopic_progress;

DROP POLICY IF EXISTS "Students can view their own lesson context" ON lesson_context;
DROP POLICY IF EXISTS "System can manage lesson context" ON lesson_context;

-- RLS Policies
CREATE POLICY "Students can view their own lesson progress"
    ON lesson_progress FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own lesson progress"
    ON lesson_progress FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own lesson progress"
    ON lesson_progress FOR UPDATE
    USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own subtopic progress"
    ON subtopic_progress FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own subtopic progress"
    ON subtopic_progress FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own subtopic progress"
    ON subtopic_progress FOR UPDATE
    USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own lesson context"
    ON lesson_context FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "System can manage lesson context"
    ON lesson_context FOR ALL
    USING (true);

-- Grant permissions
GRANT ALL ON lesson_progress TO authenticated;
GRANT ALL ON subtopic_progress TO authenticated;
GRANT ALL ON lesson_context TO authenticated;

GRANT ALL ON lesson_progress TO service_role;
GRANT ALL ON subtopic_progress TO service_role;
GRANT ALL ON lesson_context TO service_role;
