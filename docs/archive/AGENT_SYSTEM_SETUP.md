# EduAgent AI - Complete Integration Guide

## Overview

This is a fully integrated, production-ready AI learning platform that combines:
- **Tutor Agent**: Voice-based adaptive teaching using Hume AI + Google Gemini
- **Assessment Agent**: Dynamic quiz generation and evaluation
- **Feedback Agent**: Comprehensive pedagogical feedback with learning gap analysis
- **Orchestrator**: Manages agent communication and learning flow

## Quick Start

### 1. Environment Variables

Add these to your Vercel project (Settings > Environment Variables):

\`\`\`env
# Supabase (Your provided keys)
NEXT_PUBLIC_SUPABASE_URL=https://fnzpgunxsluvscfrgjmy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Hume Voice AI (Your provided keys)
NEXT_PUBLIC_HUME_API_KEY=ZkIFdeGEhJrJIdOxzVLh5S1qn1MO10UhqJPsCAiKw6dffSvL
NEXT_PUBLIC_HUME_TEACHER_CONFIG_ID=<your-teacher-config-id>

# Google AI (Your provided key)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyB5dsBLxATxP-MH3lON7y7e_3NfWXMMyGE
\`\`\`

### 2. Database Setup

Run the SQL migrations in order:

\`\`\`bash
# In Supabase SQL Editor or locally via CLI

# 1. Run schema migrations
scripts/04-agent-system-schema.sql

# 2. Seed test data (optional)
scripts/05-agent-system-inserts.sql
\`\`\`

### 3. Start the Application

\`\`\`bash
npm run dev
\`\`\`

Access the unified dashboard at: `http://localhost:3000/dashboard/unified`

## System Architecture

### Agent Flow

\`\`\`
Student → Hume Voice Input
    ↓
    ├→ Tutor Agent (generateTutorResponse)
    │   ├─ Personalized explanations
    │   ├─ Adaptive guidance
    │   └─ Progress tracking
    │
    ├→ Assessment Agent (generateAssessmentQuestions)
    │   ├─ Dynamic question generation
    │   ├─ Difficulty adaptation
    │   └─ Question validation
    │
    └→ Feedback Agent (generateDetailedFeedback)
        ├─ Answer evaluation
        ├─ Misconception detection
        ├─ Learning gap identification
        └─ Performance analysis

Results → Real-time Dashboard → Hume Voice Output
\`\`\`

### Key Components

1. **Agent Orchestrator** (`lib/agents/agent-orchestrator.ts`)
   - Manages session lifecycle
   - Routes messages through agents
   - Persists session data
   - Handles phase transitions

2. **Unified Dashboard** (`app/dashboard/unified/page.tsx`)
   - Single-page interface
   - Real-time message updates
   - Assessment interface
   - Feedback visualization
   - Session management

3. **Hume Voice Bridge** (`lib/hume-agent-bridge.ts`)
   - Voice I/O management
   - Agent context injection
   - Conversation routing
   - Voice assessment handling

4. **Real-time Feedback** (`lib/real-time-session-manager.ts`)
   - Live engagement monitoring
   - Instant feedback generation
   - Intervention suggestions
   - Session analytics

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/session/initialize` | POST | Start new learning session |
| `/api/session/end` | POST | End session & save progress |
| `/api/tutor/chat` | POST | Get tutor response |
| `/api/assessment/generate` | POST | Generate assessment questions |
| `/api/assessment/evaluate` | POST | Evaluate answers & feedback |
| `/api/feedback/comprehensive` | POST | Detailed pedagogical feedback |
| `/api/performance/analytics` | POST | Student performance analysis |
| `/api/progress` | GET | Overall progress dashboard |

## Features

### 1. Intelligent Tutoring
- Adapts to learning style (visual, auditory, kinesthetic, reading)
- Tracks knowledge gaps
- Provides scaffolded guidance
- Remembers student context

### 2. Adaptive Assessments
- Difficulty adjusts based on performance
- Multiple question types (MC, short answer, numeric)
- Explanation for each answer
- Real-time feedback

### 3. Comprehensive Feedback
- Identifies misconceptions
- Highlights learning gaps
- Suggests next topics
- Tracks progress over time

### 4. Real-time Analytics
- Engagement monitoring
- Performance trends
- Strength/weakness analysis
- Personalized recommendations

## Usage Examples

### Starting a Session

\`\`\`typescript
// In unified dashboard
const session = await fetch("/api/session/initialize", {
  method: "POST",
  body: JSON.stringify({
    studentId: user.id,
    topic: "Mathematics",
    gradeLevel: 6,
    learningStyle: "auditory",
  }),
})
\`\`\`

### Voice Interaction

\`\`\`typescript
// Via Hume hook
const { initializeVoiceSession } = useHumeAgentBridge(config)

await initializeVoiceSession(
  process.env.NEXT_PUBLIC_HUME_API_KEY,
  process.env.NEXT_PUBLIC_HUME_TEACHER_CONFIG_ID
)
\`\`\`

### Assessment Flow

\`\`\`typescript
// Generate assessment
const assessment = await fetch("/api/assessment/generate", {
  method: "POST",
  body: JSON.stringify({ topic, gradeLevel })
})

// Evaluate answers
const result = await fetch("/api/assessment/evaluate", {
  method: "POST",
  body: JSON.stringify({ answers, topic })
})
\`\`\`

## Customization

### Modify Agent Behavior

Edit agent system prompts in:
- `lib/agents/tutor-agent.ts` - Teaching approach
- `lib/agents/assessment-agent.ts` - Question generation
- `lib/agents/feedback-agent.ts` - Feedback style

### Adjust Difficulty Progression

In `AgentOrchestrator` class, modify difficulty calculation based on recent performance.

### Customize Dashboard Layout

Edit `app/dashboard/unified/page.tsx` for UI/UX changes.

## Troubleshooting

### Voice Not Working
- Check Hume API key in environment variables
- Verify microphone permissions in browser
- Test audio in browser DevTools

### Assessment Not Generating
- Ensure GOOGLE_GENERATIVE_AI_API_KEY is set
- Check quota limits on Google AI
- Verify Supabase connection

### Feedback Not Saving
- Confirm database migrations ran successfully
- Check Supabase RLS policies
- Verify authentication token

## Production Deployment

1. Deploy to Vercel:
   \`\`\`bash
   vercel --prod
   \`\`\`

2. Set environment variables in Vercel dashboard

3. Run database migrations in production Supabase

4. Test full flow in production environment

## Support

For issues or questions:
1. Check the documentation files in root directory
2. Review agent system logs
3. Check Supabase logs for database issues
4. Test individual API endpoints with curl/Postman

---

**System Status**: Production Ready
**Last Updated**: 2025
**Version**: 1.0.0
