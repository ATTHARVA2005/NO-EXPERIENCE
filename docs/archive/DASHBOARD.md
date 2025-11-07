# EduAgent Dashboard Documentation

## Overview
The EduAgent dashboard provides a comprehensive view of student learning progress, including tutoring sessions, assessments, and personalized resources.

## Features

### 1. **Personalized Welcome**
- Displays student name and grade level
- Contextual greeting based on user data

### 2. **Stats Overview (4 Cards)**
- **Total Sessions**: Count of completed tutoring sessions
- **Assessments**: Number of assessments taken
- **Average Accuracy**: Overall performance percentage across all completed assessments
- **Resources**: Total learning materials available

### 3. **Quick Actions**
Three prominent action buttons:
- **Start Tutor Session**: Launch AI tutoring interface
- **Take Assessment**: Begin a new quiz/assessment
- **Browse Resources**: View recommended learning materials

### 4. **Learning Progress Chart**
- Visual line chart showing assessment performance over time
- X-axis: Sequential assessments
- Y-axis: Accuracy percentage (0-100%)
- Empty state when no assessments exist

### 5. **Recent Sessions Panel**
Displays last 5 tutoring sessions with:
- Topic name
- Session duration (calculated from start/end times)
- Confidence score percentage
- Session status badge
- Empty state with CTA to start first session

### 6. **Recent Assessments Panel**
Shows last 5 assessments with:
- Topic name
- Status badge (in_progress, completed)
- Total points scored
- Accuracy percentage with award icon
- Empty state with CTA to take first assessment

### 7. **Recommended Resources**
Grid of up to 4 learning resources showing:
- Resource type icon (video, article, book, etc.)
- Title and description
- Duration and difficulty level
- External link to access material
- Empty state when no resources available

## Data Flow

### Authentication & User Profile
\`\`\`typescript
// 1. Get authenticated user from Supabase Auth
const { data: { user } } = await supabase.auth.getUser()

// 2. Fetch student profile using user_id foreign key
const { data: studentData } = await supabase
  .from("students")
  .select("*")
  .eq("user_id", user.id)
  .single()
\`\`\`

### Loading Dashboard Data
All queries use the student's ID (not auth user ID):

\`\`\`typescript
// Tutoring Sessions
await supabase
  .from("tutoring_sessions")
  .select("*")
  .eq("student_id", studentData.id)
  .order("started_at", { ascending: false })
  .limit(5)

// Assessments
await supabase
  .from("assessments")
  .select("*")
  .eq("student_id", studentData.id)
  .order("started_at", { ascending: false })
  .limit(10)

// Resources (global, not student-specific)
await supabase
  .from("resources")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(6)
\`\`\`

### Stats Calculation
\`\`\`typescript
// Average accuracy from completed assessments only
const completedAssessments = assessments.filter(a => a.status === "completed")
const avgAccuracy = completedAssessments.reduce((sum, a) => sum + a.accuracy, 0) 
                    / completedAssessments.length
\`\`\`

## Database Schema Reference

### students
- `id` (uuid) - Primary key
- `user_id` (uuid) - Foreign key to auth.users
- `name` (text)
- `email` (text)
- `grade` (integer)
- `learning_style` (text)
- `preferences` (jsonb)

### tutoring_sessions
- `id` (uuid)
- `student_id` (uuid) → students.id
- `topic_id` (text)
- `started_at` (timestamp)
- `ended_at` (timestamp, nullable)
- `confidence_score` (float, 0-1)
- `status` (text: 'active', 'completed')
- `transcript` (jsonb)
- `key_points` (jsonb)

### assessments
- `id` (uuid)
- `student_id` (uuid) → students.id
- `topic_id` (text)
- `started_at` (timestamp)
- `completed_at` (timestamp, nullable)
- `total_score` (float)
- `accuracy` (float, 0-1)
- `status` (text: 'in_progress', 'completed')
- `questions` (jsonb)

### resources
- `id` (uuid)
- `title` (text)
- `type` (text: 'video', 'article', 'book', etc.)
- `url` (text)
- `duration` (text, nullable)
- `difficulty` (text, nullable)
- `description` (text, nullable)
- `source` (text)
- `tags` (jsonb)

## Components

### Main Dashboard Component
**File:** `app/(dashboard)/page.tsx`
- Client component ("use client")
- Manages state for student, sessions, assessments, resources, stats
- Uses `useEffect` to load data on mount
- Shows loading spinner while fetching data

### ProgressChart
**File:** `components/progress-chart.tsx`
- Displays line chart using recharts library
- Props: `{ assessments: Assessment[] }`
- Maps assessments to chart data points
- Shows empty state when no data

### ResourceCard
**File:** `components/resource-card.tsx`
- Displays individual resource with icon, title, description
- Props: `{ resource: Resource }`
- Shows type-specific icons (Video, Book, Article)
- External link button with proper accessibility
- Difficulty and duration badges

## Loading States

### Initial Load
\`\`\`tsx
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}
\`\`\`

### Empty States
Each section has contextual empty states with:
- Relevant icon (dimmed)
- Helpful message
- Call-to-action button to get started

## Styling

### Layout
- Full-width container with padding: `p-8`
- Responsive grid layouts using Tailwind CSS
- Cards from shadcn/ui component library

### Colors & Theme
- Uses CSS variables for theming (--primary, --muted, etc.)
- Dark/light mode support via theme-provider
- Consistent spacing with Tailwind's spacing scale

### Icons
Uses lucide-react icons:
- Brain (sessions)
- Target (assessments)
- TrendingUp (accuracy)
- BookOpen (resources)
- Clock (duration)
- Award (achievements)

## Performance Considerations

1. **Data Fetching**: All queries run in parallel using `Promise.all()`
2. **Limits**: Reasonable query limits to prevent large data transfers
   - Sessions: 5
   - Assessments: 10 (5 displayed)
   - Resources: 6 (4 displayed)
3. **Client-Side Only**: No server-side rendering for dashboard data (could be optimized)

## Future Enhancements

### Potential Improvements
- [ ] Server-side data fetching for better SEO and initial load
- [ ] Real-time updates using Supabase subscriptions
- [ ] Filters for date ranges on charts
- [ ] Drill-down into individual sessions/assessments
- [ ] Achievement badges and streaks
- [ ] Study time tracking
- [ ] Weekly/monthly progress reports
- [ ] Comparison with class averages
- [ ] Goal setting and tracking
- [ ] Personalized study recommendations

### Optimization Ideas
- [ ] Cache dashboard data in React Query/SWR
- [ ] Implement infinite scroll for sessions/assessments
- [ ] Add skeleton loading states
- [ ] Prefetch linked pages (tutor, assessment, resources)
- [ ] Add error boundaries for resilience

## Testing Dashboard

### 1. Empty State (New User)
\`\`\`bash
1. Create new account
2. Login → Dashboard shows empty states for all sections
3. Verify all CTA buttons work
\`\`\`

### 2. With Data
\`\`\`bash
# Add test data via SQL
INSERT INTO tutoring_sessions (student_id, topic_id, confidence_score, status)
VALUES ('[student_id]', 'Mathematics', 0.85, 'completed');

INSERT INTO assessments (student_id, topic_id, accuracy, total_score, status)
VALUES ('[student_id]', 'Science', 0.92, 95, 'completed');

# Verify dashboard shows:
- Updated stat cards
- Sessions in recent sessions panel
- Assessments in recent assessments panel
- Chart with data points
\`\`\`

### 3. Stats Calculation
\`\`\`bash
# Create multiple assessments with different accuracy
# Verify average accuracy calculates correctly
# Formula: sum(accuracy) / count(completed assessments)
\`\`\`

## Error Handling

Currently logs errors to console:
\`\`\`typescript
catch (error) {
  console.error("Error loading dashboard:", error)
}
\`\`\`

**Recommendation**: Add user-facing error messages using toast notifications or error boundaries.

## Accessibility

✅ **Implemented:**
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly empty states

❌ **To Do:**
- Add skip links
- Improve focus management
- Test with screen readers
- Add ARIA live regions for dynamic updates

## File Structure
\`\`\`
app/(dashboard)/
├── page.tsx                    # Main dashboard page
└── layout.tsx                  # Protected layout with auth

components/
├── progress-chart.tsx          # Line chart for assessments
└── resource-card.tsx           # Resource display card

lib/
└── supabase-client.ts          # Browser Supabase client
\`\`\`
