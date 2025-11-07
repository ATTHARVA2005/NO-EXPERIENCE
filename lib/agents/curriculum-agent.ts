import { generateText } from "ai"

export interface CurriculumTopic {
  id: string
  name: string
  difficulty: "easy" | "medium" | "hard"
  timeMins: number
  prerequisites: string[]
  learningOutcomes: string[]
  exampleQuestions: string[]
  subtopics?: CurriculumTopic[]
}

export interface CurriculumJSON {
  subject: string
  grade: number
  topics: CurriculumTopic[]
  version: string
  generatedAt: string
  explainability: string
}

export interface StudentProfile {
  id: string
  name: string
  grade: number
  knownTopics?: string[]
}

export async function generateCurriculumFromGrade(
  studentProfile: StudentProfile,
  subject: string,
  depth: "beginner" | "intermediate" | "advanced" = "intermediate",
): Promise<CurriculumJSON> {
  const prompt = `You are an expert curriculum designer. Generate a comprehensive, grade-appropriate learning curriculum for:

Student Grade: ${studentProfile.grade}
Subject: ${subject}
Depth Level: ${depth}
${studentProfile.knownTopics ? `Student's Known Topics: ${studentProfile.knownTopics.join(", ")}` : ""}

Create a structured curriculum with topics ordered by:
1. Prerequisites first
2. Foundation concepts before advanced ones
3. Logical learning progression
4. Estimated difficulty and time

For each topic, provide:
- Name
- Difficulty (easy/medium/hard)
- Estimated time in minutes (40-120 range)
- Prerequisites (list of topic IDs or names)
- Learning outcomes (3-4 specific goals)
- Example questions (2-3 questions students might encounter)

Return a valid JSON object with this exact structure:
{
  "subject": "${subject}",
  "grade": ${studentProfile.grade},
  "topics": [
    {
      "id": "t1",
      "name": "Topic Name",
      "difficulty": "easy",
      "timeMins": 60,
      "prerequisites": [],
      "learningOutcomes": ["Outcome 1", "Outcome 2"],
      "exampleQuestions": ["Question 1", "Question 2"]
    }
  ],
  "version": "v1",
  "generatedAt": "${new Date().toISOString()}",
  "explainability": "Brief explanation of why topics are ordered this way"
}

Generate 8-12 comprehensive topics for this ${subject} curriculum at grade ${studentProfile.grade}.`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      temperature: 0.7,
    })

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to parse curriculum JSON")
    }

    const curriculum = JSON.parse(jsonMatch[0]) as CurriculumJSON
    return curriculum
  } catch (error) {
    console.error("Error generating curriculum:", error)
    // Return a fallback curriculum
    return getFallbackCurriculum(subject, studentProfile.grade)
  }
}

export async function parseSyllabusToCurriculum(
  syllabusPdf: Buffer | string,
  studentProfile: StudentProfile,
): Promise<CurriculumJSON> {
  // In a production app, you'd use a PDF parsing library like pdfjs
  // For now, we'll assume text content is provided
  const syllabusText = typeof syllabusPdf === "string" ? syllabusPdf : syllabusPdf.toString("utf-8")

  const prompt = `You are an expert curriculum designer. Parse the following syllabus and create a structured learning curriculum:

Syllabus Content:
${syllabusText.substring(0, 5000)}

Student Grade: ${studentProfile.grade}

Extract and organize the topics from this syllabus into a logical learning progression. Identify:
1. Main topics and subtopics
2. Learning objectives for each topic
3. Difficulty levels based on progression
4. Estimated time for each topic (40-120 minutes)
5. Prerequisites between topics

Return a valid JSON object with this exact structure:
{
  "subject": "Subject name from syllabus",
  "grade": ${studentProfile.grade},
  "topics": [
    {
      "id": "t1",
      "name": "Topic Name",
      "difficulty": "easy",
      "timeMins": 60,
      "prerequisites": [],
      "learningOutcomes": ["Outcome from syllabus"],
      "exampleQuestions": ["Question type from syllabus"]
    }
  ],
  "version": "v1",
  "generatedAt": "${new Date().toISOString()}",
  "explainability": "Explanation of how topics are sequenced based on the syllabus"
}`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      temperature: 0.7,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to parse curriculum from syllabus")
    }

    return JSON.parse(jsonMatch[0]) as CurriculumJSON
  } catch (error) {
    console.error("Error parsing syllabus:", error)
    throw error
  }
}

function getFallbackCurriculum(subject: string, grade: number): CurriculumJSON {
  const curricula: Record<string, CurriculumJSON> = {
    math: {
      subject: "Mathematics",
      grade,
      topics: [
        {
          id: "t1",
          name: "Number Systems & Place Value",
          difficulty: "easy",
          timeMins: 45,
          prerequisites: [],
          learningOutcomes: ["Understand place value", "Read and write numbers"],
          exampleQuestions: ["What is the place value of 7 in 2,735?"],
        },
        {
          id: "t2",
          name: "Basic Operations",
          difficulty: "easy",
          timeMins: 60,
          prerequisites: ["t1"],
          learningOutcomes: ["Add, subtract, multiply, divide", "Solve word problems"],
          exampleQuestions: ["If you have 25 apples and give away 8, how many remain?"],
        },
        {
          id: "t3",
          name: "Fractions & Decimals",
          difficulty: "medium",
          timeMins: 75,
          prerequisites: ["t2"],
          learningOutcomes: ["Compare fractions", "Convert decimals to fractions"],
          exampleQuestions: ["Which is larger: 3/4 or 0.7?"],
        },
        {
          id: "t4",
          name: "Ratios & Proportions",
          difficulty: "medium",
          timeMins: 60,
          prerequisites: ["t3"],
          learningOutcomes: ["Understand ratios", "Solve proportion problems"],
          exampleQuestions: ["If 3 apples cost $2, how much do 6 apples cost?"],
        },
        {
          id: "t5",
          name: "Geometry Basics",
          difficulty: "medium",
          timeMins: 90,
          prerequisites: [],
          learningOutcomes: ["Identify shapes", "Calculate area and perimeter"],
          exampleQuestions: ["What is the area of a rectangle with length 5 and width 3?"],
        },
      ],
      version: "v1",
      generatedAt: new Date().toISOString(),
      explainability: "Fallback curriculum ordered from foundational concepts to more complex ones",
    },
    science: {
      subject: "Science",
      grade,
      topics: [
        {
          id: "s1",
          name: "Scientific Method",
          difficulty: "easy",
          timeMins: 45,
          prerequisites: [],
          learningOutcomes: ["Understand hypothesis", "Design experiments"],
          exampleQuestions: ["What are the steps of the scientific method?"],
        },
        {
          id: "s2",
          name: "Matter & States",
          difficulty: "easy",
          timeMins: 60,
          prerequisites: ["s1"],
          learningOutcomes: ["Identify states of matter", "Understand phase changes"],
          exampleQuestions: ["What happens to ice when heated?"],
        },
        {
          id: "s3",
          name: "Energy & Forces",
          difficulty: "medium",
          timeMins: 75,
          prerequisites: ["s2"],
          learningOutcomes: ["Understand energy types", "Apply Newton's laws"],
          exampleQuestions: ["What is kinetic energy?"],
        },
      ],
      version: "v1",
      generatedAt: new Date().toISOString(),
      explainability: "Fallback science curriculum with foundational topics",
    },
  }

  return curricula[subject.toLowerCase()] || curricula["math"]
}

// Save curriculum to Supabase for persistence
export async function saveCurriculum(studentId: string, curriculum: CurriculumJSON, supabase: any) {
  try {
    const { error } = await supabase.from("curricula").insert({
      student_id: studentId,
      subject: curriculum.subject,
      curriculum_json: curriculum,
      version: curriculum.version,
      created_at: new Date().toISOString(),
    })

    if (error) throw error
  } catch (error) {
    console.error("Error saving curriculum:", error)
    throw error
  }
}

// Retrieve curriculum from Supabase
export async function getCurriculum(studentId: string, subject: string, supabase: any): Promise<CurriculumJSON | null> {
  try {
    const { data, error } = await supabase
      .from("curricula")
      .select("curriculum_json")
      .eq("student_id", studentId)
      .eq("subject", subject)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error) return null
    return data.curriculum_json
  } catch (error) {
    console.error("Error retrieving curriculum:", error)
    return null
  }
}
