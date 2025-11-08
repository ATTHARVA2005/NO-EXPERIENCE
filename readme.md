# 🎓 EduAgents: Agentic- AI-Powered Educational Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0.0-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)
![AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-Latest-000000?style=for-the-badge&logo=vercel)

*An intelligent tutoring platform that adapts to every student's learning journey*

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
- [Project Structure](#-project-structure)
- [Core Features](#-core-features)
  - [AI Tutor](#1-ai-tutor)
  - [Curriculum Generation](#2-curriculum-generation)
  - [Adaptive Assessments](#3-adaptive-assessments)
  - [Voice Learning](#4-voice-learning)
  - [Assignment Generation](#5-assignment-generation)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**EduAgents** is a next-generation educational platform powered by artificial intelligence that provides personalized learning experiences. The platform combines real-time AI tutoring, dynamic curriculum generation, adaptive assessments, and voice-enabled learning to create a comprehensive educational ecosystem.

### Why NO-EXPERIENCE?

- 🎯 **Personalized Learning**: AI adapts to each student's pace and learning style
- 🧠 **Intelligent Tutoring**: Real-time conversation with AI tutor powered by Google Gemini
- 📚 **Dynamic Curriculum**: Auto-generated lesson plans based on topics and grade levels
- 🎤 **Voice Learning**: Integrated voice interaction using Hume AI
- 📊 **Progress Tracking**: Comprehensive analytics and progress monitoring
- 🎮 **Gamified Assignments**: Interactive games and assessments to boost engagement
- 🔍 **Live Resources**: Real-time educational content fetched from trusted sources
- 🖼️ **Visual Learning**: Automatic image integration for better concept visualization

---

## 🚀 Key Features

### 1. **AI-Powered Tutor**
- Real-time conversational AI using Google Gemini 2.0
- Context-aware responses based on curriculum
- Automatic image fetching for visual concepts
- Live educational resource recommendations via Tavily API
- Session persistence and conversation history

### 2. **Smart Curriculum Builder**
- AI-generated structured lesson plans
- Grade-level appropriate content (K-12, College, Professional)
- Topic-specific subtopics and learning objectives
- Estimated durations for each lesson
- Progress tracking across curriculum

### 3. **Adaptive Assessment System**
- Dynamic question generation based on student performance
- Multiple assessment types (MCQ, Short Answer, Coding, etc.)
- Instant feedback and explanations
- Difficulty adjustment based on responses
- Comprehensive score analytics

### 4. **Voice-Enabled Learning**
- Hume AI voice integration for hands-free interaction
- Real-time speech-to-text and text-to-speech
- Emotional intelligence in voice responses
- Microphone controls and audio feedback

### 5. **Assignment & Game Engine**
- AI-generated practice problems
- Interactive mini-games (Quiz, Matching, Fill-in-the-blank)
- Adaptive difficulty based on performance
- Real-time feedback and hints
- Gamification elements (points, streaks, achievements)

### 6. **Progress Dashboard**
- Real-time session monitoring
- Study streak tracking
- Performance analytics and visualizations
- Recent sessions overview
- Personalized recommendations

### 7. **Modern UI/UX**
- Neobrutalist design system with bold borders and vibrant colors
- Fully responsive across all devices
- Dark mode support
- Smooth animations and transitions
- Accessible and intuitive interface

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.0 (App Router)
- **UI Library**: React 19.2
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 4.1
- **Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion (via Tailwind Animate)

### Backend & APIs
- **AI/LLM**: Google Gemini 2.0 Flash Exp (via Vercel AI SDK)
- **Voice AI**: Hume AI Voice SDK
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Caching**: Upstash Redis
- **Search API**: Tavily (Educational Resources)
- **Image Search**: Google Custom Search API

### Development Tools
- **Package Manager**: npm/pnpm
- **Linting**: ESLint
- **Type Checking**: TypeScript strict mode
- **Version Control**: Git
- **Deployment**: Vercel (recommended)

---

## 🎬 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17 or later
- **npm** or **pnpm** (pnpm recommended)
- **Git**
- A **Supabase** account
- API keys for:
  - Google Generative AI (Gemini)
  - Hume AI (for voice features)
  - Tavily API (for educational resources)
  - Google Custom Search (for image search)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ATTHARVA2005/NO-EXPERIENCE.git
   cd NO-EXPERIENCE
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local  # if you have an example file
   # or create manually
   ```

### Environment Setup

Add the following environment variables to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# Hume AI (Voice Features)
NEXT_PUBLIC_HUME_API_KEY=your_hume_api_key
NEXT_PUBLIC_HUME_CONFIG_ID=your_hume_config_id

# Tavily API (Educational Resources)
TAVILY_API_KEY=your_tavily_api_key

# Google Custom Search (Image Search)
GOOGLE_CUSTOM_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id

# Upstash Redis (Optional - for caching)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### Database Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database migrations** (SQL files in `supabase/` folder if available, or use Supabase dashboard)

3. **Create the following tables**:
   - `student_profiles` - User profile information
   - `learning_sessions` - Active and past learning sessions
   - `conversation_history` - Chat history with AI tutor
   - `assessments` - Assessment metadata
   - `assessment_responses` - Student answers and scores
   - `curriculum_plans` - Generated curriculums
   - `assignments` - Generated assignments

   *Refer to the [Database Schema](#-database-schema) section for detailed table structures.*

### Running the Application

**Development Mode**
```bash
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:3000`

**Production Build**
```bash
npm run build
npm run start
```

**Linting**
```bash
npm run lint
```

---

## 📁 Project Structure

```
NO-EXPERIENCE/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/
│   │   ├── signup/
│   │   └── reset-password/
│   ├── api/                      # API Routes
│   │   ├── agents/               # AI agent endpoints
│   │   │   ├── tutor/            # Main tutor agent
│   │   │   ├── curriculum/       # Curriculum generator
│   │   │   └── assessment/       # Assessment generator
│   │   ├── tutor/                # Tutor chat endpoints
│   │   ├── resources/            # Resource fetching
│   │   └── images/               # Image search
│   ├── dashboard/                # Main dashboard
│   │   ├── overview/             # Dashboard home
│   │   ├── learn/                # Learning interface
│   │   ├── assessments/          # Assessment pages
│   │   ├── assignments/          # Assignment pages
│   │   ├── profile/              # User profile
│   │   └── new-session/          # Session creation
│   ├── setup/                    # Onboarding flow
│   └── layout.tsx                # Root layout
│
├── components/                   # React Components
│   ├── ui/                       # shadcn/ui components
│   ├── tutor-interface.tsx       # Main tutor chat UI
│   ├── assessment-modal.tsx      # Assessment UI
│   ├── assignment-games.tsx      # Game components
│   ├── image-placeholder.tsx     # Image display component
│   └── ...                       # Other components
│
├── lib/                          # Utility Libraries
│   ├── agents/                   # AI Agent Logic
│   │   ├── tutor-agent.ts        # Tutor prompt & logic
│   │   ├── curriculum-agent.ts   # Curriculum generation
│   │   └── assessment-agent.ts   # Assessment generation
│   ├── images/                   # Image utilities
│   │   └── google-image-search.ts
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Auth middleware
│   ├── tavily-client.ts          # Tavily API wrapper
│   ├── hume-client.ts            # Hume AI integration
│   ├── rag-engine.ts             # RAG system
│   └── ...                       # Other utilities
│
├── types/                        # TypeScript type definitions
├── hooks/                        # Custom React hooks
├── styles/                       # Global styles
├── public/                       # Static assets
│   └── placeholder.jpg           # Default placeholder image
│
├── middleware.ts                 # Next.js middleware (auth)
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies
└── README.md                     # This file
```

---

## 💡 Core Features

### 1. AI Tutor

The AI tutor is powered by Google Gemini 2.0 and provides:

**Location**: `app/api/agents/tutor/route.ts`

**Features**:
- Context-aware conversations based on curriculum
- Automatic image fetching for visual concepts
- Live educational resource recommendations
- Progress tracking and key takeaways
- Session persistence

**How it works**:
1. Student sends a message through the chat interface
2. System builds context from curriculum, conversation history, and learning goals
3. Gemini generates a personalized response
4. System checks if visual aids are needed and fetches images
5. Fetches live educational resources from Tavily
6. Analyzes progress and updates session state

**Example API Call**:
```typescript
POST /api/agents/tutor
{
  "sessionId": "uuid",
  "studentId": "uuid",
  "message": "Explain photosynthesis",
  "topic": "Biology",
  "gradeLevel": "9",
  "currentLesson": { ... }
}
```

### 2. Curriculum Generation

**Location**: `app/api/agents/curriculum/route.ts`

The curriculum generator creates structured lesson plans:

**Features**:
- AI-generated lessons based on topic and grade level
- Subtopics with learning objectives
- Estimated durations
- Progressive difficulty
- Aligned with educational standards

**Generated Structure**:
```typescript
{
  "lessons": [
    {
      "id": "1",
      "title": "Introduction to Photosynthesis",
      "content": "...",
      "duration": 45,
      "subtopics": [
        { "id": "1.1", "title": "What is Photosynthesis?", "order": 1 },
        { "id": "1.2", "title": "Key Components", "order": 2 }
      ]
    }
  ]
}
```

### 3. Adaptive Assessments

**Location**: `app/dashboard/assessments/`

**Features**:
- Multiple question types (MCQ, short answer, coding)
- Difficulty adaptation based on performance
- Instant feedback with explanations
- Comprehensive scoring
- Progress analytics

**Assessment Flow**:
1. System generates questions based on curriculum
2. Student answers questions
3. System provides instant feedback
4. Difficulty adjusts based on performance
5. Final score and analytics displayed

### 4. Voice Learning

**Location**: `app/dashboard/learn/page.tsx` (Hume Voice Integration)

**Features**:
- Hands-free voice interaction
- Real-time speech recognition
- Natural voice responses with emotional intelligence
- Microphone controls
- Voice/text hybrid mode

**Implementation**:
```typescript
import { VoiceProvider, useVoice } from '@humeai/voice-react'

// Voice control hooks
const { connect, disconnect, sendUserInput, isMuted } = useVoice()
```

### 5. Assignment Generation

**Location**: `app/dashboard/assignments/`

**Features**:
- AI-generated practice problems
- Multiple game types (Quiz, Matching, Fill-in)
- Adaptive difficulty
- Real-time hints and feedback
- Gamification (points, streaks)

---

## 🔌 API Documentation

### Tutor Agent API

**Endpoint**: `POST /api/agents/tutor`

**Request Body**:
```json
{
  "sessionId": "string",
  "studentId": "string",
  "studentName": "string",
  "message": "string",
  "topic": "string",
  "gradeLevel": "string",
  "learningGoals": "string",
  "currentLesson": {
    "title": "string",
    "content": "string",
    "subtopics": ["string"]
  },
  "curriculum": { ... },
  "conversationHistory": [
    { "role": "user" | "assistant", "content": "string" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "string",
  "imageUrl": "string | undefined",
  "liveResources": [
    {
      "title": "string",
      "url": "string",
      "type": "video | article | documentation",
      "thumbnail": "string"
    }
  ],
  "progressUpdate": {
    "completion": 0-100,
    "masteredTopics": ["string"],
    "needsReview": ["string"]
  },
  "keyTakeaways": ["string"],
  "nextFocus": ["string"],
  "lessonComplete": boolean
}
```

### Curriculum Generator API

**Endpoint**: `POST /api/agents/curriculum`

**Request**:
```json
{
  "topic": "string",
  "gradeLevel": "string",
  "learningGoals": "string",
  "duration": number
}
```

**Response**:
```json
{
  "curriculum": {
    "overview": "string",
    "lessons": [
      {
        "id": "string",
        "title": "string",
        "content": "string",
        "duration": number,
        "subtopics": [
          {
            "id": "string",
            "title": "string",
            "order": number
          }
        ]
      }
    ],
    "resources": [...]
  }
}
```

### Image Search API

**Endpoint**: `GET /api/images/search?query=string&topic=string`

**Response**:
```json
{
  "images": [
    {
      "url": "string",
      "thumbnail": "string",
      "title": "string",
      "source": "string"
    }
  ]
}
```

---

## 🗄️ Database Schema

### Core Tables

#### `student_profiles`
```sql
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  grade_level TEXT,
  learning_preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `learning_sessions`
```sql
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES student_profiles(id),
  topic TEXT NOT NULL,
  grade_level TEXT,
  learning_goals TEXT,
  curriculum_plan JSONB,
  current_lesson_index INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `conversation_history`
```sql
CREATE TABLE conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES learning_sessions(id),
  role TEXT NOT NULL, -- 'tutor' or 'student'
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `assessments`
```sql
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES student_profiles(id),
  topic TEXT NOT NULL,
  questions JSONB NOT NULL,
  total_score INTEGER,
  achieved_score INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push your code to GitHub**

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   - Add all environment variables from `.env.local`
   - Vercel > Project Settings > Environment Variables

4. **Deploy**
   - Vercel will automatically deploy on push to main branch

### Deploy to Other Platforms

The app can be deployed to any platform that supports Next.js:
- **Netlify**: Use `npm run build` and deploy `/.next` folder
- **Railway**: Configure with `next start`
- **AWS Amplify**: Follow Next.js SSR guide
- **Self-hosted**: Use `npm run build && npm run start`

---

## 🐛 Troubleshooting

### Common Issues

**1. Images not loading**
- Check Google Custom Search API key and Engine ID
- Verify Tavily API key is valid
- Check browser console for CORS errors

**2. Voice features not working**
- Ensure Hume API key and Config ID are correct
- Check microphone permissions in browser
- Verify HTTPS connection (required for microphone)

**3. Supabase connection errors**
- Verify Supabase URL and keys
- Check if Supabase project is active
- Ensure database tables are created

**4. AI responses failing**
- Check Google Generative AI API key
- Verify API quota limits
- Check network connectivity

**5. Build errors**
- Clear `.next` folder: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run lint`

### Debug Mode

Enable detailed logging by adding to `.env.local`:
```env
NEXT_PUBLIC_DEBUG=true
```

Check browser console and terminal for detailed logs.

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit with clear messages**
   ```bash
   git commit -m "Add: Amazing new feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Code Style

- Follow the existing code style
- Use TypeScript for type safety
- Write clear comments for complex logic
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

### Testing

- Test your changes locally
- Ensure no TypeScript errors: `npm run lint`
- Test on multiple browsers
- Check mobile responsiveness

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Next.js** team for the amazing framework
- **Vercel** for the AI SDK and deployment platform
- **Supabase** for the backend infrastructure
- **Google** for Gemini AI
- **Hume AI** for voice intelligence
- **Tavily** for educational search API
- **shadcn** for the beautiful UI components

---

## 📧 Contact & Support

- **Repository**: [github.com/ATTHARVA2005/NO-EXPERIENCE](https://github.com/ATTHARVA2005/NO-EXPERIENCE)
- **Issues**: [GitHub Issues](https://github.com/ATTHARVA2005/NO-EXPERIENCE/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ATTHARVA2005/NO-EXPERIENCE/discussions)

---

<div align="center">

**Made with ❤️ for students everywhere**

⭐ Star us on GitHub — it motivates us a lot!

</div>
