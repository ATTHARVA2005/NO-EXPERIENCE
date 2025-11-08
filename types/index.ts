// Comprehensive type definitions for the AI Tutor platform

export type UserRole = "student" | "tutor" | "admin"

export interface StudentProfile {
  id: string
  name: string
  email: string
  grade: number
  learning_style: "visual" | "auditory" | "kinesthetic" | "reading-writing"
  preferences: {
    theme: "light" | "dark"
    voice_speed: number // 0.5 - 2.0
    tts_enabled: boolean
  }
  created_at: string
  updated_at: string
}

export interface Curriculum {
  id: string
  student_id: string
  subject: string
  grade: number
  topics: CurriculumTopic[]
  version: string
  generated_at: string
}

export interface CurriculumTopic {
  id: string
  name: string
  difficulty: "easy" | "medium" | "hard"
  time_minutes: number
  prerequisites: string[]
  learning_outcomes: string[]
  example_questions: string[]
}

export interface TutoringSession {
  id: string
  student_id: string
  topic_id: string
  transcript: Message[]
  started_at: string
  ended_at?: string
  duration_minutes?: number
  confidence_score: number
  key_points: string[]
  status: "active" | "completed" | "paused"
}

export interface Message {
  id: string
  role: "student" | "tutor"
  content: string
  timestamp: string
  stt_confidence?: number
}

export interface Assessment {
  id: string
  student_id: string
  topic_id: string
  questions: AssessmentQuestion[]
  started_at: string
  completed_at?: string
  total_score: number
  accuracy: number
  status: "in_progress" | "completed"
}

export interface AssessmentQuestion {
  id: string
  question_text: string
  question_type: "multiple_choice" | "short_answer" | "voice"
  correct_answer: string
  student_answer?: string
  score: number
  feedback: QuestionFeedback
  time_spent_ms: number
}

export interface QuestionFeedback {
  is_correct: boolean
  short_feedback: string
  detailed_feedback: string
  error_type?: "concept" | "arithmetic" | "careless" | "misread"
  next_step: string
  recommended_resource?: string
  confidence: number
}

export interface FeedbackReport {
  id: string
  student_id: string
  assessment_id?: string
  session_id?: string
  to_student: StudentFeedback
  to_tutor: TutorFeedback
  generated_at: string
}

export interface StudentFeedback {
  summary: string
  strengths: string[]
  areas_for_improvement: string[]
  per_question_feedback: QuestionFeedback[]
  resources: Resource[]
  next_suggested_lesson: string
}

export interface TutorFeedback {
  student_id: string
  actionable_suggestions: TeachingAction[]
  concept_mastery: Record<string, number>
  engagement_score: number
  urgency: "low" | "medium" | "high"
}

export interface TeachingAction {
  type: "reteach" | "reinforce" | "challenge" | "scaffold"
  subtopic: string
  reason: string
  suggested_approach: string
}

export interface Resource {
  id: string
  title: string
  type: "video" | "article" | "exercise" | "book"
  url: string
  duration?: string
  difficulty: "easy" | "medium" | "hard"
  description: string
  relevance_score: number
  source: string
  tags: string[]
}
