import { createClient } from "@supabase/supabase-js"
import { generateText, generateObject } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"

const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

// Create Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: GOOGLE_API_KEY,
})

const hasGenerativeAIKey = Boolean(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY,
)

interface LessonPlan {
  id: string
  title: string
  topic: string
  duration: number
  completed: boolean
  content: string
  subtopics?: Array<{
    id: string
    title: string
    completed: boolean
    order: number
  }>
  progressPercentage?: number
}

interface ResourceItem {
  id: string
  title: string
  type: string
  url: string
  duration?: number
}

interface AssignmentItem {
  id: string
  title: string
  description: string
  topic: string
  status: string
  dueDate?: string
}

/**
 * Structured Curriculum Graph Schema
 * Represents hierarchical learning structure: chapters → topics → concepts
 */
const CurriculumGraphSchema = z.object({
  chapters: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      order: z.number(),
      topics: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          order: z.number(),
          estimatedDuration: z.number(), // in minutes
          concepts: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              description: z.string(),
              prerequisites: z.array(z.string()).optional(),
              difficulty: z.enum(["beginner", "intermediate", "advanced"]),
            })
          ),
        })
      ),
    })
  ),
})

type CurriculumGraph = z.infer<typeof CurriculumGraphSchema>

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    // Remove markdown code blocks if present
    let cleaned = raw.trim()
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "")
    }
    
    // First attempt: try parsing as-is
    try {
      return JSON.parse(cleaned) as T
    } catch (e) {
      // If that fails, try to fix common issues
      console.log("[curriculum] First parse failed, attempting repairs...")
      
      // Remove trailing commas before closing braces/brackets
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')
      
      // Fix unquoted property names (but be careful not to break strings)
      // This regex looks for word characters followed by colon outside of quotes
      cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      
      // Try to fix single quotes (but be very careful)
      // Only replace if we're in a property value context
      cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"')
      
      // Remove any stray text before the opening bracket
      const firstBracket = cleaned.indexOf('[')
      const firstBrace = cleaned.indexOf('{')
      const firstValid = firstBracket === -1 ? firstBrace : (firstBrace === -1 ? firstBracket : Math.min(firstBracket, firstBrace))
      if (firstValid > 0) {
        cleaned = cleaned.substring(firstValid)
      }
      
      // Remove any text after the final closing bracket
      const lastBracket = cleaned.lastIndexOf(']')
      const lastBrace = cleaned.lastIndexOf('}')
      const lastValid = Math.max(lastBracket, lastBrace)
      if (lastValid !== -1 && lastValid < cleaned.length - 1) {
        cleaned = cleaned.substring(0, lastValid + 1)
      }
      
      return JSON.parse(cleaned) as T
    }
  } catch (error) {
    console.warn("[curriculum] Failed to parse model response after repairs, using fallback", error)
    console.log("[curriculum] Raw response (first 500 chars):", raw.substring(0, 500))
    console.log("[curriculum] Cleaned response (first 500 chars):", raw.trim().substring(0, 500))
    return fallback
  }
}

function buildFallbackLessons(topic: string): LessonPlan[] {
  return Array.from({ length: 5 }).map((_, index) => ({
    id: `lesson-${index + 1}`,
    title: `Lesson ${index + 1}: ${topic} Essentials`,
    topic,
    duration: 20,
    completed: false,
    content: `Introduce ${topic} concept ${index + 1} with examples, a quick check-for-understanding question, and an engaging activity.`,
    subtopics: [
      {
        id: `subtopic-${index + 1}-1`,
        title: "Introduction & Overview",
        completed: false,
        order: 1,
      },
      {
        id: `subtopic-${index + 1}-2`,
        title: "Core Concepts",
        completed: false,
        order: 2,
      },
      {
        id: `subtopic-${index + 1}-3`,
        title: "Practical Examples",
        completed: false,
        order: 3,
      },
      {
        id: `subtopic-${index + 1}-4`,
        title: "Practice & Application",
        completed: false,
        order: 4,
      },
    ],
    progressPercentage: 0,
  }))
}

function buildFallbackResources(topic: string): ResourceItem[] {
  return [
    {
      id: "resource-1",
      title: `${topic} overview video`,
      type: "video",
      url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(`${topic} for beginners`),
      duration: 15,
    },
    {
      id: "resource-2",
      title: `${topic} quick reference`,
      type: "article",
      url: "https://www.google.com/search?q=" + encodeURIComponent(`${topic} study guide`),
    },
  ]
}

function buildFallbackAssignments(topic: string): AssignmentItem[] {
  return [
    {
      id: "assignment-1",
      title: `Gamified practice: ${topic}`,
      description: `Complete an interactive challenge covering the core concepts of ${topic}.`,
      topic,
      status: "pending",
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    },
  ]
}

async function runModelPrompt(prompt: string) {
  if (!hasGenerativeAIKey) {
    return null
  }

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt,
    })
    return text
  } catch (error) {
    console.error("[curriculum] Model request failed", error)
    return null
  }
}

/**
 * Generate structured curriculum graph using Gemini
 * Creates a hierarchical learning structure optimized for the student's grade level
 */
async function generateCurriculumGraph(
  topic: string,
  gradeLevel: string,
  syllabusContent?: string
): Promise<CurriculumGraph | null> {
  if (!hasGenerativeAIKey) return null

  try {
    const prompt = `You are an expert curriculum architect. Create a comprehensive, structured curriculum graph for teaching "${topic}" to ${gradeLevel || "middle school"} students.

${syllabusContent ? `BASE YOUR CURRICULUM ON THIS SYLLABUS:\n${syllabusContent}\n` : ""}

Design a hierarchical structure with:
- 3-5 CHAPTERS (major units)
- Each chapter contains 3-6 TOPICS (sub-units)
- Each topic contains 3-8 CONCEPTS (specific learning points)

For each concept, identify:
- Clear, specific name
- Brief description (1-2 sentences)
- Prerequisites (concept IDs that must be learned first)
- Difficulty level

Ensure logical progression: concepts build on each other, topics progress naturally, chapters follow a learning arc.

Example structure:
Chapter 1: Foundations → Topic 1: Basic Principles → Concept 1: Definition and Importance

Make it comprehensive yet achievable for the target grade level.`

    const result = await generateObject({
      model: google("gemini-2.0-flash-exp"),
      schema: CurriculumGraphSchema,
      prompt,
    })

    return result.object
  } catch (error) {
    console.error("[curriculum] Failed to generate curriculum graph", error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { studentId, topic, gradeLevel, learningStyle, syllabus, learningGoals } = await request.json()

    if (!studentId || !topic) {
      return Response.json({ success: false, error: "studentId and topic are required" }, { status: 400 })
    }

    const activeLearningStyle = learningStyle || "visual"
    
    // Parse grade level to integer (handle "grade 5", "5", 5, etc.)
    let gradeLevelInt = 9 // default
    if (gradeLevel) {
      const match = String(gradeLevel).match(/\d+/)
      if (match) {
        gradeLevelInt = parseInt(match[0], 10)
      }
    }
    console.log("[curriculum] Grade level parsed:", gradeLevel, "→", gradeLevelInt)
    
    // Step 1: Generate structured curriculum graph
    console.log("[curriculum] Generating curriculum graph for:", topic)
    const curriculumGraph = await generateCurriculumGraph(topic, gradeLevel, syllabus)
    
    const lessonPrompt = `You are an expert curriculum designer and master educator with years of experience creating engaging, comprehensive lesson plans.

Create exactly 5 progressive, deeply explanatory lessons for teaching "${topic}" to a grade ${gradeLevel ?? "middle school"} student with a ${activeLearningStyle} learning style.

${syllabus ? `SYLLABUS TO FOLLOW:\n${syllabus}\n\nAlign all lessons with this syllabus while making content engaging.\n` : ""}

For each lesson, create a COMPREHENSIVE, DETAILED plan (minimum 300 words per lesson) with this structure:

1. **TITLE**: Creative, specific title (not generic "Lesson 1")

2. **HOOK** (2-3 sentences): 
   - Start with a fascinating real-world connection or surprising fact
   - Make students immediately curious about the topic
   - Relate to their everyday experiences

3. **LEARNING OBJECTIVES** (3-4 bullet points):
   - Clear, measurable goals ("Students will be able to...")
   - Cover knowledge, skills, and application
   - Grade-appropriate complexity

4. **CORE CONCEPTS** (3-4 main ideas):
   - Explain EACH concept in detail with:
     * Clear definition
     * 2-3 concrete examples
     * Analogies or metaphors for understanding
     * Common misconceptions to avoid
   - Build progressively from simple to complex
   - Use ${activeLearningStyle}-friendly explanations

5. **STEP-BY-STEP TEACHING SEQUENCE**:
   - Introduction (5 min): How to present the hook and preview
   - Concept 1 Instruction (10 min): Detailed teaching approach
   - Guided Practice (8 min): Example problems to work through together
   - Independent Practice (7 min): Activities students do alone
   - Include specific questions to ask and anticipated student responses

6. **HANDS-ON ACTIVITY**:
   - Detailed, engaging activity description
   - Required materials (if any)
   - Step-by-step instructions
   - What students should discover/create
   - Connection to core concepts

7. **DIFFERENTIATION STRATEGIES**:
   - For struggling learners: Scaffolding approach
   - For advanced learners: Extension challenges
   - For ${activeLearningStyle} learners: Specific accommodations

8. **ASSESSMENT & CHECKS**:
   - 2-3 formative assessment questions during lesson
   - Exit ticket question to verify understanding
   - Success criteria (how you'll know they got it)

9. **COMMON CHALLENGES**:
   - Typical student difficulties with this topic
   - Strategies to address misconceptions
   - Follow-up if understanding is weak

10. **CONNECTIONS**:
    - How this lesson builds on previous knowledge
    - How it prepares for next lesson
    - Real-world applications

Make each lesson RICH, DETAILED, and ACTIONABLE. A teacher should be able to teach directly from this plan.

IMPORTANT: For each lesson, also include 4-6 subtopics that break down the lesson into measurable checkpoints.
Each subtopic represents a concrete concept that can be checked off when the tutor has covered it.

CRITICAL JSON FORMATTING RULES:
1. ALL strings MUST use double quotes (") not single quotes (')
2. NO trailing commas before closing braces or brackets
3. ALL property names MUST be in double quotes
4. Escape special characters: \\" for quotes, \\n for newlines
5. NO comments in JSON
6. Ensure all brackets and braces are properly closed

Return ONLY valid JSON array (no markdown, no code blocks, no extra text):
[
  {
    "id": "lesson-1",
    "title": "Specific creative title",
    "topic": "${topic}",
    "duration": 30,
    "completed": false,
    "content": "Complete detailed lesson plan following the 10-point structure above. Minimum 300 words. Use clear section headers. Escape any quotes or special characters properly.",
    "subtopics": [
      {
        "id": "subtopic-1-1",
        "title": "Introduction to Key Concept",
        "completed": false,
        "order": 1
      },
      {
        "id": "subtopic-1-2",
        "title": "Understanding the Basics",
        "completed": false,
        "order": 2
      },
      {
        "id": "subtopic-1-3",
        "title": "Practical Applications",
        "completed": false,
        "order": 3
      },
      {
        "id": "subtopic-1-4",
        "title": "Advanced Techniques",
        "completed": false,
        "order": 4
      }
    ],
    "progressPercentage": 0
  }
]`

    const resourcePrompt = `Find 6 high-quality, REAL educational resources for "${topic}" (grade ${gradeLevel ?? "middle school"}).

Include exact mix:
- 3 video tutorials (YouTube educational channels like Khan Academy, Crash Course, 3Blue1Brown, etc.)
- 2 documentation/articles (Official docs, educational websites)
- 1 interactive practice platform (Khan Academy, Codecademy, etc.)

For EACH resource provide:
- SPECIFIC real title (not generic)
- Exact platform name
- Realistic, direct URL when possible
- 2-3 sentence description of what it teaches
- Duration for videos (estimate realistically)

CRITICAL JSON FORMATTING RULES:
1. Use double quotes (") for all strings
2. NO trailing commas
3. Escape quotes in strings: \\"
4. Ensure all brackets/braces match

Return ONLY valid JSON (no markdown, no code blocks):
[
  {
    "id": "resource-1",
    "title": "Exact resource title",
    "type": "video",
    "platform": "YouTube - Khan Academy",
    "url": "Direct URL or search link",
    "duration": "12:30",
    "description": "Detailed description of content and learning value"
  }
]`

    const assignmentPrompt = `Create 3 engaging, gamified assignments for "${topic}" (grade ${gradeLevel ?? "middle school"}).

Make them:
- Progressive difficulty (easy → medium → challenging)
- Different formats (quiz, project, exploration)
- Connected to real-world applications
- Fun and motivating

For EACH assignment:
- Creative, exciting title (not "Assignment 1")
- Detailed description (minimum 100 words) explaining:
  * What students will do
  * What they'll learn/practice
  * Why it matters
  * Success criteria
- Specific deliverable
- Estimated time to complete
- Points/difficulty indicator

CRITICAL JSON FORMATTING RULES:
1. Use double quotes (") only
2. NO trailing commas before } or ]
3. Escape special characters properly
4. Keep descriptions clear and properly escaped

Return ONLY valid JSON (no markdown, no code blocks):
[
  {
    "id": "assignment-1",
    "title": "Exciting game-like title",
    "description": "Detailed 100+ word description with clear instructions and learning goals",
    "topic": "${topic}",
    "status": "pending",
    "dueDate": "${new Date(Date.now() + 7 * 86400000).toISOString()}",
    "points": 100,
    "difficulty": "easy"
  }
]`

    const [lessonsText, resourcesText, assignmentsText] = await Promise.all([
      runModelPrompt(lessonPrompt),
      runModelPrompt(resourcePrompt),
      runModelPrompt(assignmentPrompt),
    ])

    const lessons = lessonsText
      ? safeJsonParse<LessonPlan[]>(lessonsText, buildFallbackLessons(topic))
      : buildFallbackLessons(topic)
    const resources = resourcesText
      ? safeJsonParse<ResourceItem[]>(resourcesText, buildFallbackResources(topic))
      : buildFallbackResources(topic)
    const assignments = assignmentsText
      ? safeJsonParse<AssignmentItem[]>(assignmentsText, buildFallbackAssignments(topic))
      : buildFallbackAssignments(topic)

    const usedFallback = !lessonsText || !resourcesText || !assignmentsText
    let sessionId: string | null = null

    // Save to database for teacher analysis
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
        
        // ✅ CHECK FOR EXISTING ACTIVE SESSION FOR THIS TOPIC
        const { data: existingSession } = await supabase
          .from("learning_sessions")
          .select("id, curriculum_plan, status")
          .eq("student_id", studentId)
          .eq("topic", topic)
          .in("status", ["active", "paused"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (existingSession) {
          // ✅ REUSE EXISTING SESSION - Don't create duplicate!
          sessionId = existingSession.id
          console.log("[curriculum] ♻️ Reusing existing session:", sessionId, "for topic:", topic)
          
          // Update the existing session with new curriculum (if regenerated)
          const curriculumPlan = {
            lessons,
            resources,
            assignments,
            curriculumGraph,
            learningGoals,
          }
          
          await supabase
            .from("learning_sessions")
            .update({
              curriculum_plan: curriculumPlan,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", sessionId)
          
          console.log("[curriculum] ✅ Updated existing session with new curriculum")
        } else {
          // ✅ CREATE NEW SESSION - Only if none exists
          const curriculumPlan = {
            lessons,
            resources,
            assignments,
            curriculumGraph, // Add structured graph
            learningGoals,
          }
          
          const { data: session, error: sessionError } = await supabase
            .from("learning_sessions")
            .insert([
              {
                student_id: studentId,
                topic,
                grade_level: gradeLevelInt,
                learning_style: activeLearningStyle,
                status: "active",
                curriculum_plan: curriculumPlan,
                learning_goals: learningGoals ? [learningGoals] : [],
              },
            ])
            .select()
            .single()

          if (sessionError) {
            console.error("[curriculum] ❌ Failed to create session:", sessionError)
          } else {
            sessionId = session?.id ?? null
            console.log("[curriculum] ✅ New session created:", sessionId)
          }
        }
        
        // Save curriculum graph separately for advanced analytics and navigation
        if (sessionId && curriculumGraph) {
          await supabase.from("curriculum_graphs").insert([
            {
              session_id: sessionId,
              student_id: studentId,
              topic,
              graph_data: curriculumGraph,
              created_at: new Date().toISOString(),
            },
          ])
        }
        
        // Save curriculum metadata for teacher dashboard
        if (sessionId) {
          await supabase.from("curriculum_analytics").insert([
            {
              session_id: sessionId,
              student_id: studentId,
              topic,
              lesson_count: lessons.length,
              resource_count: resources.length,
              assignment_count: assignments.length,
              created_at: new Date().toISOString(),
              curriculum_quality_score: usedFallback ? 0.5 : 0.9,
              ai_generated: !usedFallback,
              has_structured_graph: !!curriculumGraph,
            },
          ])
        }
      } else {
        console.warn("[curriculum] Supabase credentials missing; skipping session persistence")
      }
    } catch (dbError) {
      console.error("[curriculum] Failed to persist curriculum to Supabase", dbError)
    }

    return Response.json({
      success: true,
      lessons,
      resources,
      assignments,
      curriculumGraph, // Include structured graph in response
      usedFallback,
      sessionId,
    })
  } catch (error) {
    console.error("[curriculum] Error generating curriculum:", error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
