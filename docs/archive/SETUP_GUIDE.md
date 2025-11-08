# EduAgent AI System - Complete Setup Guide

## Overview
This is a production-ready AI learning platform featuring three intelligent agents (Tutor, Assessment, Feedback) integrated with Hume AI voice technology and Supabase database.

## Prerequisites
- Node.js 18+
- npm/yarn
- A Supabase account (provided)
- Hume AI API key (provided)
- Google Generative AI key (provided)

## Step 1: Environment Setup

Copy the provided API keys to `.env.local`:

\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://fnzpgunxsluvscfrgjmy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Hume AI
NEXT_PUBLIC_HUME_API_KEY=ZkIFdeGEhJrJIdOxzVLh5S1qn1MO10UhqJPsCAiKw6dffSvL
NEXT_PUBLIC_HUME_TEACHER_CONFIG_ID=your_config_id

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyB5dsBLxATxP-MH3lON7y7e_3NfWXMMyGE
\`\`\`

## Step 2: Install Dependencies

\`\`\`bash
npm install
\`\`\`

## Step 3: Initialize Database

The database schema is automatically configured via migration scripts:

**Migration files:**
- `scripts/04-agent-system-schema.sql` - Creates all tables with RLS policies
- `scripts/05-agent-system-inserts.sql` - Seeds initial data

**Tables created:**
- `learning_sessions` - Tracks active learning sessions
- `agent_workflows` - Manages agent execution phases
- `assessments` - Stores assessment questions and results
- `feedback_records` - Comprehensive feedback from agents
- `performance_analytics` - Long-term student progress
- `tutor_sessions` - Detailed interaction logs

## Step 4: Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Access the application at http://localhost:3000

## Step 5: Using the Dashboard

### Access Point
Navigate to `/dashboard/unified` after logging in.

### Features

#### 1. Learning Phase
- Select topic and grade level
- Choose learning style (visual, auditory, kinesthetic, reading)
- Interact with Tutor Agent via text or voice
- Real-time Hume voice I/O
- Session progress tracking

#### 2. Assessment Phase
- Dynamic adaptive assessment questions
- Multiple question types (multiple choice, short answer)
- Difficulty adjustment based on performance
- Real-time scoring

#### 3. Feedback Phase
- Comprehensive pedagogical feedback
- Learning gap identification
- Misconception detection
- Personalized recommendations
- Session analytics and progress tracking

### API Endpoints

#### Session Management
- `POST /api/session/initialize` - Start new learning session
- `POST /api/session/end` - End session and save data

#### Tutor Agent
- `POST /api/tutor/chat` - Send message to tutor

#### Assessment Agent
- `POST /api/assessment/generate` - Generate assessment questions
- `POST /api/assessment/evaluate` - Evaluate answers

#### Feedback Agent
- `POST /api/feedback/comprehensive` - Get detailed feedback
- `GET /api/performance/analytics` - Get student analytics
- `GET /api/progress` - Get learning progress

## Architecture

### Three-Agent System

**1. Tutor Agent**
- Adaptive personalized instruction
- Context-aware explanations
- Learning style optimization
- Real-time interaction via Hume voice

**2. Assessment Agent**
- Dynamic question generation
- Difficulty adaptation
- Multiple question types
- Performance-based difficulty adjustment

**3. Feedback Agent**
- Misconception identification
- Learning gap analysis
- Personalized recommendations
- Session synthesis

### Technology Stack
- **Frontend:** Next.js 15, React, TypeScript
- **Voice AI:** Hume AI (real-time voice I/O)
- **Database:** Supabase PostgreSQL
- **Generative AI:** Google Generative AI
- **Styling:** Tailwind CSS, shadcn/ui
- **Authentication:** Supabase Auth

## Security
- Row-Level Security (RLS) enabled on all tables
- Environment variables for all sensitive data
- Server-side API routes for agent orchestration
- Secure authentication flow

## Troubleshooting

### Voice Not Working
- Check Hume API key in `.env.local`
- Verify microphone permissions in browser
- Ensure `NEXT_PUBLIC_HUME_TEACHER_CONFIG_ID` is configured

### Database Connection Issues
- Verify Supabase URL and keys
- Check if migrations ran successfully
- Review database tables in Supabase dashboard

### Agent Responses Failing
- Verify Google AI key is set
- Check API rate limits
- Review console logs for detailed errors

## Database Execution

To run migrations manually in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Paste contents of `scripts/04-agent-system-schema.sql`
4. Click "Run"
5. Repeat with `scripts/05-agent-system-inserts.sql`

## Performance Optimization

- Session data cached with Supabase subscriptions
- Real-time updates for analytics
- Optimized database indexes on frequently queried fields
- API response caching with SWR

## Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel project settings
4. Deploy

### Production Checklist
- [ ] Database migrations executed
- [ ] Environment variables configured in deployment platform
- [ ] Hume API key verified
- [ ] Google AI API key verified
- [ ] Authentication flow tested
- [ ] Voice features tested
- [ ] Assessment generation tested
- [ ] Feedback generation tested

## Support
For issues or questions, check the console logs for detailed error messages and review API responses.
