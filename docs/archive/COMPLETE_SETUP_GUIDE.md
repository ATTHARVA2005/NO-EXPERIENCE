# Complete Setup & Deployment Guide
## Fully Functional Agentic AI Tutor System

This guide will help you set up and run the complete educational AI platform with three interconnected agents.

## 🎯 System Overview

**Three-Agent Architecture:**
1. **Tutor Agent** - Interactive AI tutor for learning
2. **Feedback Agent** - Analyzes performance and provides insights
3. **Assignment Agent** - Generates personalized practice assignments with 6 mini-game types

**Technology Stack:**
- Next.js 14 (App Router)
- TypeScript
- Supabase (PostgreSQL + Auth)
- Gemini 2.0 Flash (via Vercel AI SDK)
- Hume AI (Voice)
- Tailwind CSS + shadcn/ui

---

## 📋 Prerequisites

### Required Accounts
1. **Supabase Account** - https://supabase.com
2. **Google AI Studio** - https://aistudio.google.com (for Gemini API key)
3. **Hume AI Account** - https://platform.hume.ai (optional, for voice features)

### Required Software
- Node.js 18+ - https://nodejs.org
- pnpm - `npm install -g pnpm`
- Git

---

## 🚀 Setup Instructions

### Step 1: Environment Setup

1. **Clone or navigate to your project:**
\`\`\`powershell
cd d:\Programming\eduagent-ju-2005
\`\`\`

2. **Install dependencies:**
\`\`\`powershell
pnpm install
\`\`\`

3. **Create `.env.local` file in the root directory:**
\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Hume AI (Optional - for voice features)
NEXT_PUBLIC_HUME_API_KEY=your_hume_api_key
NEXT_PUBLIC_HUME_SECRET_KEY=your_hume_secret_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

---

### Step 2: Database Setup

1. **Go to your Supabase project dashboard**

2. **Run the database migrations in order:**

**Migration 1: Schema Setup (scripts/01-schema-setup.sql)**
\`\`\`sql
-- Copy and execute in Supabase SQL Editor
-- This creates core tables: student_profiles, tutor_sessions, etc.
\`\`\`

**Migration 2: Test Account (scripts/02-seed-test-account.sql)**
\`\`\`sql
-- Creates a test student account
\`\`\`

**Migration 3: Assignment System (scripts/03-assignment-system-migration.sql)**
\`\`\`sql
-- Creates assignment tables and analytics views
\`\`\`

3. **Enable Row Level Security (RLS)**
All policies are included in the migration scripts and will be automatically applied.

4. **Verify tables were created:**
Go to Supabase Dashboard > Table Editor and confirm these tables exist:
- `student_profiles`
- `tutor_sessions`
- `assignments`
- `learning_sessions`
- `feedback_history`
- `concept_mastery`

---

### Step 3: Configure Authentication

1. **In Supabase Dashboard, go to Authentication > Settings**

2. **Configure Email Auth:**
   - Enable Email provider
   - Disable email confirmations for testing (or configure SMTP)

3. **Set Site URL:**
   \`\`\`
   http://localhost:3000
   \`\`\`

4. **Add Redirect URLs:**
   \`\`\`
   http://localhost:3000/auth/callback
   http://localhost:3000/dashboard
   \`\`\`

---

### Step 4: API Key Configuration

#### Get Gemini API Key
1. Go to https://aistudio.google.com
2. Click "Get API Key"
3. Create a new API key
4. Copy it to `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`

#### Get Supabase Keys
1. In Supabase Dashboard, go to Settings > API
2. Copy **Project URL** to `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon public** key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role** key to `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep this secret!

#### (Optional) Get Hume AI Keys
1. Go to https://platform.hume.ai
2. Create an account and project
3. Get your API keys from the dashboard
4. Add to `.env.local`

---

### Step 5: Build and Run

1. **Install all dependencies:**
\`\`\`powershell
pnpm install
\`\`\`

2. **Run development server:**
\`\`\`powershell
pnpm dev
\`\`\`

3. **Open your browser:**
\`\`\`
http://localhost:3000
\`\`\`

4. **Expected output:**
\`\`\`
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- ready in XXXms
\`\`\`

---

## 🧪 Testing the System

### Test 1: Authentication
1. Go to `http://localhost:3000/login`
2. Sign up with test account:
   - Email: `test@example.com`
   - Password: `testpassword123`
3. Should redirect to `/dashboard`

### Test 2: Tutor Agent
1. Navigate to `/dashboard/learn`
2. Type a question: "What is 5 + 5?"
3. Should get AI response explaining addition
4. Session should be automatically saved

### Test 3: Assignment Generation
1. Navigate to `/dashboard/assignments`
2. Click "New Assignment"
3. System should:
   - Analyze your learning history
   - Generate personalized mini-games
   - Display assignment card
4. Click "Start Assignment"
5. Complete one of the games
6. Should show evaluation and feedback

### Test 4: Complete Workflow
\`\`\`
1. Student opens tutor chat
2. Tutor explains "Addition with carrying"
3. Session records: topics_covered = ["addition with carrying"]
4. Student clicks "Generate Assignment"
5. Feedback agent analyzes: student needs practice with "carrying"
6. Assignment agent generates: 3 games focusing on carrying
7. Student completes games
8. Evaluation agent scores and gives feedback
9. Feedback sent back to tutor for next session
\`\`\`

---

## 📁 Project Structure

\`\`\`
eduagent-ju-2005/
├── app/
│   ├── api/
│   │   ├── assignment/
│   │   │   ├── generate/route.ts     ✅ Assignment generation
│   │   │   ├── evaluate/route.ts     ✅ Assignment evaluation
│   │   │   └── list/route.ts         ✅ List assignments
│   │   ├── tutor/
│   │   │   ├── chat/route.ts         ✅ AI tutor chat
│   │   │   └── session/route.ts      ✅ Session recording
│   │   └── student/
│   │       └── profile/route.ts      ✅ Profile management
│   ├── dashboard/
│   │   ├── page.tsx                   Dashboard overview
│   │   ├── learn/page.tsx             Tutor interface
│   │   └── assignments/page.tsx       Assignment games
│   └── (auth)/login/page.tsx          Authentication
├── components/
│   ├── tutor-interface.tsx           ✅ AI tutor chat UI
│   ├── assignment-games.tsx          ✅ 6 mini-game components
│   └── ui/                            shadcn/ui components
├── lib/
│   ├── agents/
│   │   ├── tutor-agent.ts            ✅ Tutor AI logic
│   │   ├── feedback-agent.ts         ✅ Performance analysis
│   │   └── assignment-agent-enhanced.ts ✅ Game generation
│   ├── types/
│   │   └── assignment.ts             ✅ Complete type system
│   └── supabase/
│       ├── client.ts                  Client-side Supabase
│       └── server.ts                  Server-side Supabase
└── scripts/
    ├── 01-schema-setup.sql           ✅ Database schema
    ├── 02-seed-test-account.sql      ✅ Test data
    └── 03-assignment-system-migration.sql ✅ Assignment tables
\`\`\`

---

## 🎮 Available Features

### 1. AI Tutor Chat
- **File:** `components/tutor-interface.tsx`
- **API:** `/api/tutor/chat`
- **Features:**
  - Real-time chat with Gemini 2.0 Flash
  - Context-aware responses
  - Session tracking
  - Engagement scoring

### 2. Mini-Game Types
**File:** `components/assignment-games.tsx`

1. **Balloon Pop Math** 🎈
   - Click balloons with correct answers
   - Visual, interactive addition/subtraction

2. **Cat Counting** 🐱
   - Count adorable cats
   - Practice grouping and counting

3. **Number Story** 📖
   - Word problems with context
   - Real-world math application

4. **Math Race** 🏁
   - Speed-based multiple choice
   - Quick mental math practice

5. **Treasure Hunt** 🏴‍☠️
   - Solve clues to find treasure
   - Multi-step problem solving

6. **Quiz** 📝
   - Traditional quiz format
   - Concept understanding checks

### 3. Feedback Loop
**File:** `lib/agents/feedback-agent.ts`

- Analyzes tutor sessions
- Tracks concept mastery
- Identifies struggling areas
- Recommends difficulty adjustments
- Provides tutor guidance

### 4. Adaptive Learning
**File:** `lib/agents/assignment-agent-enhanced.ts`

- Personalized difficulty
- Focus on weak concepts
- Learning style adaptation
- Progressive difficulty

---

## 🔧 Common Issues & Solutions

### Issue: "Database connection failed"
**Solution:**
1. Check `.env.local` has correct Supabase credentials
2. Verify Supabase project is not paused
3. Check if RLS policies are enabled

### Issue: "AI responses not working"
**Solution:**
1. Verify `GOOGLE_GENERATIVE_AI_API_KEY` is set
2. Check API quota in Google AI Studio
3. Try test request:
\`\`\`typescript
// Test in browser console on dashboard
fetch('/api/tutor/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello' })
})
\`\`\`

### Issue: "Assignments not generating"
**Solution:**
1. Check if student profile exists (auto-created on first visit)
2. Verify assignment tables were created
3. Check browser console for errors
4. Try manual profile creation:
\`\`\`sql
INSERT INTO student_profiles (id, grade_level)
VALUES ('your-user-id', 5);
\`\`\`

### Issue: TypeScript errors
**Solution:**
\`\`\`powershell
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm dev
\`\`\`

---

## 📊 Database Schema Overview

### Core Tables

**student_profiles**
- Stores student information
- Learning preferences
- Performance averages

**tutor_sessions**
- Records each tutoring session
- Topics covered
- Engagement metrics
- Struggling/mastered areas

**assignments**
- Generated practice assignments
- Mini-game data
- Completion status
- Scores and feedback

**concept_mastery**
- Tracks mastery of individual concepts
- Practice counts
- Confidence levels
- Trend analysis

**feedback_history**
- Historical feedback snapshots
- Recommendations over time
- Adjustment tracking

---

## 🚢 Production Deployment

### Vercel Deployment

1. **Push code to GitHub**
\`\`\`powershell
git add .
git commit -m "Complete agentic AI tutor system"
git push origin main
\`\`\`

2. **Deploy to Vercel:**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Add environment variables from `.env.local`
   - Deploy

3. **Update Supabase URLs:**
   - In Supabase Dashboard > Authentication > URL Configuration
   - Add your Vercel production URL
   - Update redirect URLs

### Environment Variables for Production
Make sure to add ALL these in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `NEXT_PUBLIC_HUME_API_KEY` (if using voice)
- `NEXT_PUBLIC_HUME_SECRET_KEY` (if using voice)

---

## 📈 Monitoring & Analytics

### Built-in Analytics Views

\`\`\`sql
-- Student performance overview
SELECT * FROM student_performance_overview;

-- Concept mastery progress
SELECT * FROM concept_progress_analytics;
\`\`\`

### Check System Health
\`\`\`sql
-- Total assignments generated
SELECT COUNT(*) FROM assignments;

-- Average completion rate
SELECT 
  COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*) * 100 
FROM assignments;

-- Active students today
SELECT COUNT(DISTINCT student_id) 
FROM tutor_sessions 
WHERE created_at > NOW() - INTERVAL '1 day';
\`\`\`

---

## 🎓 Next Steps

### Enhancements to Consider

1. **Voice Integration (Hume AI)**
   - Add voice input to tutor chat
   - Emotion detection for engagement

2. **Progress Dashboard**
   - Visual charts of concept mastery
   - Streak tracking
   - Achievement badges

3. **Parent Portal**
   - View student progress
   - Get weekly reports
   - Adjust settings

4. **More Game Types**
   - Memory matching
   - Sorting games
   - Pattern recognition

5. **Curriculum Integration**
   - Map to Common Core standards
   - Grade-level progression
   - Custom learning paths

---

## 📞 Support & Documentation

- **System Architecture:** `SYSTEM_ARCHITECTURE.md`
- **Assignment Agent:** `ASSIGNMENT_AGENT_DOCUMENTATION.md`
- **Quick Implementation:** `QUICK_IMPLEMENTATION_GUIDE.md`
- **API Documentation:** Check individual route files

---

## ✅ Verification Checklist

Before considering the system "fully functional":

- [ ] Database migrations completed successfully
- [ ] All environment variables configured
- [ ] Test account can log in
- [ ] Tutor chat responds correctly
- [ ] Assignment generation works
- [ ] All 6 mini-game types render
- [ ] Assignment evaluation returns feedback
- [ ] Student profile auto-creates
- [ ] Session data persists to database
- [ ] Feedback loop triggers correctly

---

## 🎉 Success Criteria

Your system is fully functional when:

1. ✅ Students can chat with AI tutor
2. ✅ Sessions are automatically recorded
3. ✅ Assignments generate based on performance
4. ✅ All 6 game types are playable
5. ✅ Evaluations provide detailed feedback
6. ✅ Feedback improves next tutor session
7. ✅ Complete cycle: Learn → Practice → Evaluate → Improve

---

**Your agentic AI tutor system is now complete and operational!** 🚀

Run `pnpm dev` and visit `http://localhost:3000` to see it in action.
