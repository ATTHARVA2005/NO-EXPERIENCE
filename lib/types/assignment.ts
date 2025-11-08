// lib/types/assignment.ts

/**
 * Assignment System Type Definitions
 * Complete type safety for the assignment agent system
 */

// ==================== MINI-GAME TYPES ====================

export type MiniGameType =
  | "balloon-pop-math"
  | "cat-counting"
  | "number-story"
  | "math-race"
  | "treasure-hunt-math"
  | "quiz"

export type DifficultyLevel = "easy" | "medium" | "hard"

export type EngagementLevel = "low" | "medium" | "high"

export type LearningStyle = "visual" | "auditory" | "kinesthetic" | "reading"

// ==================== GAME DATA STRUCTURES ====================

export interface BalloonPopData {
  balloons: Array<{
    value: number | string
    isCorrect: boolean
    equation?: string
  }>
  timePerRound: number
  rounds: number
}

export interface CatCountingData {
  rounds: Array<{
    catsShown: number
    operation?: string
    correctAnswer: number
  }>
  maxCats: number
}

export interface NumberStoryData {
  story: string
  problems: Array<{
    question: string
    answer: number | string
    context: string
  }>
}

export interface MathRaceData {
  equations: Array<{
    problem: string
    answer: number
    difficulty: number
  }>
  timeLimit: number
}

export interface TreasureHuntData {
  map: string
  treasures: Array<{
    location: string
    problem: string
    answer: number | string
    reward: string
  }>
}

export interface QuizData {
  topic: string
  questions: Array<{
    question: string
    options?: string[]
    correct: string | number
    explanation: string
  }>
}

export type GameData =
  | BalloonPopData
  | CatCountingData
  | NumberStoryData
  | MathRaceData
  | TreasureHuntData
  | QuizData

// ==================== MINI-GAME ====================

export interface MiniGame {
  id: string
  type: MiniGameType
  title: string
  instructions: string
  gameData: Record<string, any>
  pointsAvailable: number
  timeLimit?: number
}

// ==================== ASSIGNMENT ====================

export interface Assignment {
  id: string
  title: string
  description: string
  topic: string
  difficulty: DifficultyLevel
  estimatedTime: number
  miniGames: MiniGame[]
  totalPoints: number
  passingScore: number
  learningObjectives: string[]
  adaptedFor: {
    studentLevel: string
    focusAreas: string[]
  }
}

// ==================== REQUESTS ====================

export interface AssignmentRequest {
  studentId: string
  topic: string
  gradeLevel: number
  topicProgress: number
  strugglingConcepts: string[]
  masteredConcepts: string[]
  studentEngagement: EngagementLevel
  learningStyle?: LearningStyle
}

export interface GenerateAssignmentRequest {
  topic: string
  gradeLevel?: number
  studentId?: string
  includeFeedbackAnalysis?: boolean
}

export interface EvaluateAssignmentRequest {
  assignmentId: string
  studentAnswers: Record<string, any>
  timeSpent?: number
}

// ==================== EVALUATION ====================

export interface GameEvaluation {
  gameId: string
  score: number
  timeSpent: number
  correctAnswers: number
  totalQuestions: number
  conceptsMastered: string[]
  conceptsNeedingWork: string[]
}

export interface AssignmentEvaluation {
  totalScore: number
  percentCorrect: number
  gameResults: GameEvaluation[]
  overallFeedback: string
  recommendNextSteps: string[]
}

// ==================== FEEDBACK ====================

export interface FeedbackAnalysis {
  weakConcepts: string[]
  strongConcepts: string[]
  recommendedDifficulty: DifficultyLevel
  focusAreas: string[]
  engagementLevel: EngagementLevel
  tutorRecommendations: string[]
}

export interface TutorSessionData {
  topicsCovered: string[]
  strugglingAreas: string[]
  sessionCount: number
  averageEngagement: number
}

export interface AssessmentData {
  recentScores: number[]
  weakConcepts: string[]
  strongConcepts: string[]
  completionRate: number
}

export interface AssignmentFeedback {
  studentFeedback: string
  tutorGuidance: string
  nextTopicsToTeach: string[]
  adjustedLearningPath: {
    shouldRevisit: string[]
    readyToAdvance: string[]
    practiceRecommendations: string[]
  }
}

export interface AssignmentResults {
  assignmentId: string
  topic: string
  score: number
  percentCorrect: number
  conceptsNeedingWork: string[]
  conceptsMastered: string[]
  timeSpent: number
  gameResults: Array<{
    gameType: string
    performance: number
  }>
}

// ==================== DATABASE MODELS ====================

export interface AssignmentDB {
  id: string
  student_id: string
  title: string
  description: string | null
  topic: string
  difficulty: DifficultyLevel
  estimated_time: number
  mini_games: MiniGame[]
  total_points: number
  passing_score: number
  learning_objectives: string[]
  adapted_for: {
    studentLevel: string
    focusAreas: string[]
  }
  status: "pending" | "in_progress" | "completed"
  score: number | null
  percent_correct: number | null
  game_results: GameEvaluation[] | null
  student_feedback: string | null
  tutor_guidance: string | null
  weak_concepts: string[]
  strong_concepts: string[]
  created_at: string
  completed_at: string | null
}

export interface TutorSessionDB {
  id: string
  student_id: string
  topics_covered: string[]
  struggling_areas: string[]
  engagement_score: number
  duration: number
  session_notes: string | null
  created_at: string
}

export interface StudentProfileDB {
  id: string
  name: string | null
  grade_level: number
  learning_style: LearningStyle | null
  average_score: number | null
  created_at: string
  updated_at: string
}

export interface LearningSessionDB {
  id: string
  student_id: string
  type: "tutor_session" | "assessment" | "feedback"
  content: string
  response: string | null
  duration: number
  created_at: string
}

// ==================== API RESPONSES ====================

export interface GenerateAssignmentResponse {
  success: boolean
  assignment: AssignmentDB
  feedbackAnalysis?: FeedbackAnalysis
  error?: string
}

export interface EvaluateAssignmentResponse {
  success: boolean
  evaluation: AssignmentEvaluation
  feedback: AssignmentFeedback
  error?: string
}

export interface StudentProgressResponse {
  studentId: string
  totalAssignments: number
  completedAssignments: number
  averageScore: number
  currentStreak: number
  conceptsMastered: string[]
  conceptsInProgress: string[]
  recentActivity: Array<{
    type: string
    title: string
    score?: number
    date: string
  }>
}

// ==================== UTILITY TYPES ====================

export type GameAnswer = number | string | boolean

export interface GameAnswers {
  [questionIndex: number]: GameAnswer
  timeSpent?: number
}

export interface StudentAnswers {
  [gameId: string]: GameAnswers
}

// ==================== CONSTANTS ====================

export const DIFFICULTY_MULTIPLIERS: Record<DifficultyLevel, number> = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.2,
}

export const ENGAGEMENT_TIME_LIMITS: Record<EngagementLevel, number> = {
  low: 15, // 15 minutes
  medium: 25, // 25 minutes
  high: 35, // 35 minutes
}

export const PASSING_SCORE_PERCENTAGE = 70

export const MINI_GAME_DESCRIPTIONS: Record<MiniGameType, string> = {
  "balloon-pop-math": "Pop balloons with correct answers in this fast-paced math game!",
  "cat-counting": "Count the cute cats and solve simple math problems!",
  "number-story": "Solve math problems within engaging story contexts!",
  "math-race": "Race against the clock solving math equations!",
  "treasure-hunt-math": "Solve puzzles to find hidden treasures!",
  "quiz": "Test your knowledge with interactive quizzes!",
}

// ==================== TYPE GUARDS ====================

export function isBalloonPopData(data: any): data is BalloonPopData {
  return (
    data &&
    Array.isArray(data.balloons) &&
    typeof data.timePerRound === "number" &&
    typeof data.rounds === "number"
  )
}

export function isCatCountingData(data: any): data is CatCountingData {
  return (
    data &&
    Array.isArray(data.rounds) &&
    typeof data.maxCats === "number"
  )
}

export function isNumberStoryData(data: any): data is NumberStoryData {
  return (
    data &&
    typeof data.story === "string" &&
    Array.isArray(data.problems)
  )
}

export function isMathRaceData(data: any): data is MathRaceData {
  return (
    data &&
    Array.isArray(data.equations) &&
    typeof data.timeLimit === "number"
  )
}

export function isTreasureHuntData(data: any): data is TreasureHuntData {
  return (
    data &&
    typeof data.map === "string" &&
    Array.isArray(data.treasures)
  )
}

export function isQuizData(data: any): data is QuizData {
  return (
    data &&
    typeof data.topic === "string" &&
    Array.isArray(data.questions)
  )
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate passing score based on difficulty
 */
export function calculatePassingScore(
  totalPoints: number,
  difficulty: DifficultyLevel
): number {
  const basePassingPercentage = PASSING_SCORE_PERCENTAGE
  const multiplier = DIFFICULTY_MULTIPLIERS[difficulty]
  const adjustedPercentage = basePassingPercentage / multiplier
  return Math.round((adjustedPercentage / 100) * totalPoints)
}

/**
 * Calculate estimated time based on engagement level and game count
 */
export function calculateEstimatedTime(
  gameCount: number,
  engagement: EngagementLevel
): number {
  const maxTime = ENGAGEMENT_TIME_LIMITS[engagement]
  return Math.min(gameCount * 8, maxTime) // ~8 min per game, capped by engagement
}

/**
 * Determine difficulty level from performance
 */
export function determineDifficulty(
  averageScore: number
): DifficultyLevel {
  if (averageScore >= 85) return "hard"
  if (averageScore >= 65) return "medium"
  return "easy"
}

/**
 * Calculate concept mastery percentage
 */
export function calculateMasteryPercentage(
  mastered: string[],
  total: string[]
): number {
  if (total.length === 0) return 0
  return Math.round((mastered.length / total.length) * 100)
}

/**
 * Format time in minutes and seconds
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

/**
 * Get grade-appropriate vocabulary
 */
export function getGradeVocabulary(gradeLevel: number): {
  encouraging: string[]
  instructional: string[]
} {
  if (gradeLevel <= 2) {
    return {
      encouraging: ["Great job!", "Awesome!", "You did it!", "Super!"],
      instructional: ["Let's try", "Can you", "Look at", "Count the"],
    }
  } else if (gradeLevel <= 5) {
    return {
      encouraging: ["Excellent!", "Well done!", "Nice work!", "Keep it up!"],
      instructional: ["Calculate", "Solve", "Find", "Determine"],
    }
  } else {
    return {
      encouraging: ["Outstanding!", "Impressive!", "Great work!", "Excellent progress!"],
      instructional: ["Analyze", "Evaluate", "Compute", "Derive"],
    }
  }
}
