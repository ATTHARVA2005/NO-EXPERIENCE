# Assignment Agent - Complete System Documentation

## Overview

The **Assignment Agent Enhanced** is a comprehensive AI-powered system that creates personalized, gamified learning assignments for students. It integrates seamlessly with the **Tutor Agent** and **Feedback Agent** to provide adaptive, engaging educational experiences.

## Architecture

\`\`\`
┌─────────────────┐
│  Tutor Agent    │──────┐
│  (Teaching)     │      │
└─────────────────┘      │
                         ▼
                  ┌──────────────────┐
                  │  Feedback Agent  │
                  │  (Analysis)      │
                  └──────────────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │ Assignment Agent │
                  │ (Gamification)   │
                  └──────────────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │    Student       │
                  │  (Learning)      │
                  └──────────────────┘
\`\`\`

## System Flow

### 1. **Tutor Agent → Feedback Agent**
The Tutor Agent teaches students through interactive sessions and reports:
- Topics covered in each session
- Areas where student struggled
- Student engagement level
- Questions asked and answered
- Time spent on each concept

### 2. **Feedback Agent Analysis**
The Feedback Agent processes data from both Tutor and Assessment:
- **Input from Tutor**: Session data, struggling concepts, mastered topics
- **Input from Assessments**: Previous assignment scores, completion rates
- **Output**: 
  - Weak concepts (needs more practice)
  - Strong concepts (mastered)
  - Recommended difficulty level
  - Focus areas
  - Engagement level assessment

### 3. **Assignment Agent Generation**
Based on Feedback Agent's analysis, creates personalized assignments:
- Selects appropriate mini-games
- Adjusts difficulty level
- Focuses on weak areas while building confidence with mastered concepts
- Chooses game types matching learning style

### 4. **Student Completes Assignment**
Student plays through interactive mini-games:
- Balloon Pop Math
- Cat Counting
- Number Story
- Math Race
- Treasure Hunt Math
- Quiz

### 5. **Assignment Agent Evaluation**
Evaluates student performance:
- Calculates scores per game
- Identifies newly mastered concepts
- Identifies concepts still needing work
- Generates encouraging feedback

### 6. **Feedback Loop**
Results sent back to Feedback Agent:
- Performance data
- Time spent
- Concepts mastered/struggling
- Recommendations for next session

→ This feeds into the **Tutor Agent** for next teaching session

## Components

### 1. Assignment Agent (`assignment-agent-enhanced.ts`)

#### Main Functions

##### `generateAssignment(request: AssignmentRequest): Promise<Assignment>`
Creates a personalized assignment with 2-4 mini-games.

**Input:**
\`\`\`typescript
{
  studentId: string
  topic: string
  gradeLevel: number
  topicProgress: number // 0-100
  strugglingConcepts: string[]
  masteredConcepts: string[]
  studentEngagement: "low" | "medium" | "high"
  learningStyle?: string
}
\`\`\`

**Output:**
\`\`\`typescript
{
  id: string
  title: string
  description: string
  topic: string
  difficulty: "easy" | "medium" | "hard"
  estimatedTime: number // minutes
  miniGames: MiniGame[]
  totalPoints: number
  passingScore: number
  learningObjectives: string[]
  adaptedFor: {
    studentLevel: string
    focusAreas: string[]
  }
}
\`\`\`

##### `evaluateAssignment(assignment, studentAnswers): Promise<AssignmentEvaluation>`
Evaluates completed assignment and generates feedback.

**Input:**
\`\`\`typescript
{
  assignment: Assignment
  studentAnswers: Record<string, any>
}
\`\`\`

**Output:**
\`\`\`typescript
{
  totalScore: number
  percentCorrect: number
  gameResults: GameEvaluation[]
  overallFeedback: string
  recommendNextSteps: string[]
}
\`\`\`

##### `generateAdaptiveAssignment(studentId, feedbackData, gradeLevel, topic)`
Creates assignment based on Feedback Agent's analysis.

**Input:**
\`\`\`typescript
{
  studentId: string
  feedbackData: {
    weakConcepts: string[]
    strongConcepts: string[]
    recommendedDifficulty: "easy" | "medium" | "hard"
    focusAreas: string[]
    engagementLevel: "low" | "medium" | "high"
  }
  gradeLevel: number
  topic: string
}
\`\`\`

### 2. Feedback Agent (`feedback-agent.ts`)

#### New Integration Functions

##### `analyzeStudentPerformance(studentId, tutorSessionData, assessmentData)`
Analyzes overall student performance across all learning activities.

**Input:**
\`\`\`typescript
{
  studentId: string
  tutorSessionData?: {
    topicsCovered: string[]
    strugglingAreas: string[]
    sessionCount: number
    averageEngagement: number
  }
  assessmentData?: {
    recentScores: number[]
    weakConcepts: string[]
    strongConcepts: string[]
    completionRate: number
  }
}
\`\`\`

**Output:**
\`\`\`typescript
{
  weakConcepts: string[]
  strongConcepts: string[]
  recommendedDifficulty: "easy" | "medium" | "hard"
  focusAreas: string[]
  engagementLevel: "low" | "medium" | "high"
  tutorRecommendations: string[]
}
\`\`\`

##### `processAssignmentFeedback(studentId, assignmentResults)`
Processes assignment results and provides guidance for both student and tutor.

**Input:**
\`\`\`typescript
{
  studentId: string
  assignmentResults: {
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
}
\`\`\`

**Output:**
\`\`\`typescript
{
  studentFeedback: string // Encouraging message for student
  tutorGuidance: string // Instructions for tutor's next session
  nextTopicsToTeach: string[] // Priority topics
  adjustedLearningPath: {
    shouldRevisit: string[]
    readyToAdvance: string[]
    practiceRecommendations: string[]
  }
}
\`\`\`

## Mini-Game Types

### 1. Balloon Pop Math
**Best for:** Quick arithmetic, number recognition, speed practice

**Game Data Structure:**
\`\`\`typescript
{
  balloons: [
    {
      value: number | string,
      isCorrect: boolean,
      equation?: string
    }
  ],
  timePerRound: number,
  rounds: number
}
\`\`\`

**Example:**
\`\`\`json
{
  "balloons": [
    { "value": 12, "isCorrect": true, "equation": "7 + 5" },
    { "value": 11, "isCorrect": false, "equation": "6 + 6" },
    { "value": 13, "isCorrect": false, "equation": "8 + 3" }
  ],
  "timePerRound": 30,
  "rounds": 5
}
\`\`\`

### 2. Cat Counting
**Best for:** Counting, basic addition/subtraction, visual learning

**Game Data Structure:**
\`\`\`typescript
{
  rounds: [
    {
      catsShown: number,
      operation?: string,
      correctAnswer: number
    }
  ],
  maxCats: number
}
\`\`\`

**Example:**
\`\`\`json
{
  "rounds": [
    { "catsShown": 5, "operation": "count", "correctAnswer": 5 },
    { "catsShown": 3, "operation": "add 2", "correctAnswer": 5 }
  ],
  "maxCats": 10
}
\`\`\`

### 3. Number Story
**Best for:** Word problems, reading comprehension, contextual math

**Game Data Structure:**
\`\`\`typescript
{
  story: string,
  problems: [
    {
      question: string,
      answer: number | string,
      context: string
    }
  ]
}
\`\`\`

**Example:**
\`\`\`json
{
  "story": "Emma has a fruit stand...",
  "problems": [
    {
      "question": "How many apples does Emma have?",
      "answer": 12,
      "context": "She started with 8 and bought 4 more"
    }
  ]
}
\`\`\`

### 4. Math Race
**Best for:** Fact fluency, timed practice, competitive motivation

**Game Data Structure:**
\`\`\`typescript
{
  equations: [
    {
      problem: string,
      answer: number,
      difficulty: number
    }
  ],
  timeLimit: number
}
\`\`\`

### 5. Treasure Hunt Math
**Best for:** Multi-step problems, problem-solving strategies

**Game Data Structure:**
\`\`\`typescript
{
  map: string,
  treasures: [
    {
      location: string,
      problem: string,
      answer: number | string,
      reward: string
    }
  ]
}
\`\`\`

### 6. Quiz
**Best for:** Concept assessment, knowledge check

**Game Data Structure:**
\`\`\`typescript
{
  topic: string,
  questions: [
    {
      question: string,
      options?: string[],
      correct: string | number,
      explanation: string
    }
  ]
}
\`\`\`

## API Routes

### Generate Assignment
**Endpoint:** `POST /api/assignment/generate`

**Request Body:**
\`\`\`json
{
  "topic": "Addition and Subtraction",
  "gradeLevel": 3,
  "includeFeedbackAnalysis": true
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "assignment": {
    "id": "assign_123",
    "title": "Addition Adventure",
    "miniGames": [...],
    "totalPoints": 150
  },
  "feedbackAnalysis": {
    "weakConcepts": ["borrowing", "word problems"],
    "strongConcepts": ["basic addition"],
    "recommendedDifficulty": "medium"
  }
}
\`\`\`

### Evaluate Assignment
**Endpoint:** `POST /api/assignment/evaluate`

**Request Body:**
\`\`\`json
{
  "assignmentId": "assign_123",
  "studentAnswers": {
    "game_1": {
      "0": 12,
      "1": 15,
      "timeSpent": 120
    }
  },
  "timeSpent": 1200
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "evaluation": {
    "totalScore": 135,
    "percentCorrect": 90,
    "overallFeedback": "Excellent work! You've mastered addition!"
  },
  "feedback": {
    "studentFeedback": "Great job!...",
    "tutorGuidance": "Focus on word problems next session",
    "nextTopicsToTeach": ["Subtraction with borrowing"]
  }
}
\`\`\`

## Database Schema

### `assignments` Table
\`\`\`sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  estimated_time INTEGER,
  mini_games JSONB,
  total_points INTEGER,
  passing_score INTEGER,
  learning_objectives TEXT[],
  adapted_for JSONB,
  status TEXT DEFAULT 'pending',
  score INTEGER,
  percent_correct INTEGER,
  game_results JSONB,
  student_feedback TEXT,
  tutor_guidance TEXT,
  weak_concepts TEXT[],
  strong_concepts TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
\`\`\`

### `tutor_sessions` Table
\`\`\`sql
CREATE TABLE tutor_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id),
  topics_covered TEXT[],
  struggling_areas TEXT[],
  engagement_score INTEGER,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## Usage Examples

### Example 1: Generate Assignment with Feedback

\`\`\`typescript
import { generateAdaptiveAssignment } from '@/lib/agents/assignment-agent-enhanced'
import { analyzeStudentPerformance } from '@/lib/agents/feedback-agent'

// 1. Get feedback analysis
const analysis = await analyzeStudentPerformance(
  'student_123',
  {
    topicsCovered: ['Addition', 'Subtraction'],
    strugglingAreas: ['Word problems', 'Borrowing'],
    sessionCount: 5,
    averageEngagement: 75
  },
  {
    recentScores: [80, 85, 70, 90],
    weakConcepts: ['Word problems'],
    strongConcepts: ['Basic addition'],
    completionRate: 100
  }
)

// 2. Generate adaptive assignment
const assignment = await generateAdaptiveAssignment(
  'student_123',
  analysis,
  3,
  'Addition and Subtraction'
)
\`\`\`

### Example 2: Complete Assignment Flow

\`\`\`typescript
// 1. Student completes assignment
const studentAnswers = {
  'game_1': {
    '0': 12,
    '1': 15,
    '2': 8,
    'timeSpent': 120
  },
  'game_2': {
    '0': 'correct answer',
    'timeSpent': 180
  }
}

// 2. Evaluate assignment
const evaluation = await evaluateAssignment(assignment, studentAnswers)

// 3. Process feedback
const feedback = await processAssignmentFeedback('student_123', {
  assignmentId: assignment.id,
  topic: assignment.topic,
  score: evaluation.totalScore,
  percentCorrect: evaluation.percentCorrect,
  conceptsNeedingWork: [...],
  conceptsMastered: [...],
  timeSpent: 300,
  gameResults: [...]
})

// 4. Send to tutor for next session
console.log('Tutor should focus on:', feedback.nextTopicsToTeach)
\`\`\`

## Integration with Tutor Agent

The Tutor Agent uses feedback from assignments to personalize teaching:

\`\`\`typescript
// In tutor session
import { generateTutorResponse } from '@/lib/agents/tutor-agent'

const tutorResponse = await generateTutorResponse(
  studentMessage,
  {
    studentName: 'Emma',
    gradeLevel: 3,
    topic: 'Addition',
    previousWeaknesses: feedback.adjustedLearningPath.shouldRevisit,
    recentPerformance: evaluation.percentCorrect
  }
)
\`\`\`

## Best Practices

### 1. **Progressive Difficulty**
- Start with mastered concepts (30%)
- Mix in challenging content (50%)
- Include stretch goals (20%)

### 2. **Engagement Optimization**
- **Low engagement**: Shorter games, more variety, visual focus
- **Medium engagement**: Balanced mix, moderate length
- **High engagement**: Challenging content, longer games, competitive elements

### 3. **Learning Style Adaptation**
- **Visual**: Use Cat Counting, Number Story with images
- **Auditory**: Include spoken instructions, audio feedback
- **Kinesthetic**: Interactive games like Balloon Pop, Treasure Hunt
- **Reading**: Number Story, Quiz with detailed explanations

### 4. **Feedback Timing**
- Immediate: After each game
- Formative: During assignment
- Summative: After completion
- Follow-up: Sent to tutor for next session

## Performance Metrics

Track these metrics for continuous improvement:

1. **Completion Rate**: % of students completing assignments
2. **Average Score**: Mean performance across all students
3. **Engagement Time**: Time spent vs estimated time
4. **Improvement Rate**: Score progression over time
5. **Concept Mastery**: % of concepts moved from weak to strong

## Future Enhancements

1. **Multiplayer Games**: Collaborative learning experiences
2. **Voice Integration**: Hume AI for spoken responses
3. **Parent Dashboard**: Progress tracking for parents
4. **Adaptive Difficulty**: Real-time difficulty adjustment
5. **Achievement System**: Badges, streaks, rewards
6. **Custom Game Builder**: Teachers create custom mini-games

## Troubleshooting

### Assignment Not Generating
- Check Gemini API credentials
- Verify feedback data format
- Ensure student profile exists

### Evaluation Errors
- Validate student answer format
- Check game data structure
- Verify all games have evaluation functions

### Feedback Loop Issues
- Confirm database connections
- Check table permissions
- Verify student ID matches across tables

## Support

For issues or questions:
- Check error logs in Supabase
- Review API response messages
- Verify environment variables
- Test with sample data first
