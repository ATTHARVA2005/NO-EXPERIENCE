export interface StudentProfile {
  id: string
  name: string
  grade_level: number
  learning_style?: "visual" | "auditory" | "kinesthetic" | "reading"
  average_score?: number
  created_at: string
  updated_at: string
}

export interface LearningSession {
  id: string
  student_id: string
  type: "tutor_session" | "assessment" | "feedback"
  content: string
  response?: string
  duration: number
  created_at: string
}

export interface AssessmentQuestion {
  id: string
  type: "multiple-choice" | "short-answer" | "numeric" | "essay"
  question: string
  options?: string[]
  correctAnswer: string
  difficulty: "easy" | "medium" | "hard"
  explanation: string
  timeLimit: number
  topic: string
}

export interface FeedbackData {
  isCorrect: boolean
  correctnessScore: number
  reasoning: string
  studentMisconception?: string
  conceptExplanation: string
  guidedQuestion: string
  learningGap?: string
  confidence: number
  followUpResources?: string[]
}
