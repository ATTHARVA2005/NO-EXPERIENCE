# Testing Guide - All 12 Features

## 🧪 How to Test Each Feature

### Prerequisites
1. **CRITICAL**: Run SQL migration first:
   - Go to https://supabase.com/dashboard/project/fnzpgunxsluvscfrgjmy
   - Click "SQL Editor"
   - Copy contents of `scripts/07-fix-learning-sessions.sql`
   - Paste and click "Run"

2. Start the dev server:
   ```bash
   pnpm dev
   ```

3. Navigate to `http://localhost:3000`

---

## Feature Testing Checklist

### ✅ 1. Teacher AI Responding
**Test Steps:**
1. Log in and start a new learning session
2. Choose a topic (e.g., "Artificial Intelligence")
3. Click "Start Learning Session"
4. Type a question in the chat: "Explain what AI is"
5. Click Send or press Enter

**Expected Result:**
- Teacher responds with AI-generated explanation
- No 401 or quota errors in console
- Response appears in chat within 3-5 seconds

**If it fails:**
- Check console for API errors
- Verify API key in `.env.local`: `GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDR5QeyQprPkFkpiLOKff4VTrwrpJyBSqw"`
- Restart dev server after changing `.env.local`

---

### ✅ 2. Leave Session Button
**Test Steps:**
1. In an active learning session, click "Leave Session" button (top right)
2. Wait for toast notification
3. Verify redirect to dashboard

**Expected Result:**
- Toast shows: "Session saved - You can resume this session anytime from the dashboard"
- Redirects to `/dashboard/overview`
- Session appears in "Recent Sessions" with progress

**How to verify data was saved:**
- Go back to dashboard
- Click "Continue Session" on the saved session
- Your chat history and progress should be restored

---

### ✅ 3. Profile Popup UI
**Test Steps:**
1. In any page with header, click "Profile" button
2. View profile dialog
3. Check all sections
4. Close dialog

**Expected Result:**
- Beautiful modal dialog opens
- Shows: Avatar, name, grade level, learning style
- Displays: Total points, completed lessons
- Shows: Recent achievements
- Session statistics (time, assignments, topic)
- Purple-themed design

---

### ✅ 4. Lesson Locking System
**Test Steps:**
1. Start a new learning session with multiple lessons
2. Try clicking "L2" button before completing lesson 1

**Expected Result:**
- L1 button is clickable (unlocked)
- L2, L3+ buttons show lock icon 🔒
- Clicking locked lesson shows toast: "Lesson Locked - Complete the previous lesson's assessment to unlock"
- Button is grayed out and disabled
- After completing L1 assessment, L2 unlocks

**Visual States:**
- Current lesson: Purple background
- Locked lesson: Gray with lock icon
- Completed lesson: Green border with checkmark ✓

---

### ✅ 5. Automatic Feedback Every 2 Minutes
**Test Steps:**
1. Start a learning session
2. Wait 2 minutes (120 seconds)
3. Continue interacting with teacher

**Expected Result:**
- After 2 minutes, feedback dialog automatically appears
- Shows: "Quick Check-In - How are you feeling about the lesson so far?"
- Three emoji buttons: 😊 Going well, 😐 It's okay, 😕 Need help
- Clicking any option shows encouraging toast
- Dialog closes and timer resets

**Note:** Timer checks every 10 seconds, so feedback may appear at 2:00-2:10 minutes

---

### ✅ 6. Multimedia Content
**Test Steps:**
1. In learning session, ask teacher: "Show me a video about this topic"
2. Look in the left sidebar "Resources & progress"
3. Check for images/videos in chat

**Expected Result:**
- YouTube videos embed in sidebar (muted by default)
- Images display with proper sizing
- Video cards show preview
- External link icon for external resources

**To test YouTube specifically:**
- Teacher message with YouTube link should auto-embed
- Format: `https://www.youtube.com/watch?v=VIDEO_ID`
- Video plays muted in iframe

---

### ✅ 7. Resources Section with Reviews
**Test Steps:**
1. Start learning session
2. Scroll in left sidebar to "Learning Resources"
3. Check each resource card

**Expected Result:**
- Each resource shows:
  - Icon based on type (video/article/documentation)
  - Title and duration
  - Type badge
  - 5-star rating (⭐⭐⭐⭐⭐)
  - Review text: "Excellent resource for understanding..."
- Hover effects on cards
- External link icon
- Scrollable if many resources

---

### ✅ 8. Improved Assignment UI
**Test Steps:**
1. Check right sidebar - NO "Assignments" button in header
2. Look at assignment cards in right sidebar
3. Click "Start" on an assignment

**Expected Result:**
- Header has NO assignments button (removed ✓)
- Assignment cards show:
  - Title and description
  - Trophy icon with points
  - Status badge with color
  - Due date with clock icon
  - Hover border animation
- Clicking "Start" opens enhanced dialog with:
  - Points and status cards
  - Mini games list
  - "Start Assignment" button

---

### ✅ 9. Sign Out Button
**Test Steps:**
1. Click "Sign out" button in header
2. Wait for redirect

**Expected Result:**
- Toast notification: "Signed out successfully"
- Redirects to `/login` page
- Session cleared
- No errors in console

**If it fails:**
- Check console for auth errors
- Should show error toast with message
- Still redirects to login even on error

---

### ✅ 10. Delete Button on Sessions
**Test Steps:**
1. Go to dashboard overview
2. Find a session in "Recent Sessions"
3. Click trash icon (🗑️) on session card
4. View confirmation dialog

**Expected Result:**
- Trash icon appears on each session card
- Clicking opens red-themed alert dialog
- Dialog shows:
  - "Delete Session?" title with trash icon
  - Session name being deleted
  - Warning: "This action cannot be undone"
  - Cancel and Delete buttons
- Clicking Delete:
  - Removes session from list
  - Shows toast: "Session deleted"
  - Updates metrics automatically

---

### ✅ 11. Session History
**Test Steps:**
1. Create 2-3 learning sessions
2. Go to dashboard overview
3. Check "Recent Sessions" card

**Expected Result:**
- Shows up to 5 most recent sessions
- Each session displays:
  - Topic/title
  - Date AND time (e.g., "11/6/2025 • 2:30 PM")
  - Status badge (active/completed/paused)
  - Progress bar with percentage
  - "Continue Session" button
  - Delete button (trash icon)
- Sorted by most recent first
- Empty state shows "Start your first session" button

---

### ✅ 12. Assignment Reattempt
**Test Steps:**
1. Complete an assignment (mark as complete or finish it)
2. Look at completed assignment card
3. Click "Reattempt" button

**Expected Result:**
- Completed assignments show two buttons:
  - ✅ "Completed" (disabled, green)
  - 🔄 "Reattempt" (clickable, purple)
- Clicking "Reattempt":
  - Shows toast: "Assignment reset - You can now reattempt this assignment!"
  - Status changes to "in-progress"
  - Score is cleared
  - Can now redo the assignment
  - "Start" button appears again

---

## 🐛 Common Issues & Solutions

### Issue: Teacher not responding
**Solution:**
- Check API key is correct in `.env.local`
- Restart dev server
- Check console for quota errors
- If quota exceeded, wait 24 hours or use different API key

### Issue: Leave session doesn't save
**Solution:**
- Ensure SQL migration is run
- Check Supabase connection
- Look in console for database errors
- Verify sessionId is not null

### Issue: Lessons don't lock/unlock
**Solution:**
- Create an assignment for the lesson
- Complete the assignment
- Lock system checks assignment completion status
- Refresh page if needed

### Issue: Feedback dialog doesn't appear
**Solution:**
- Wait full 2 minutes
- Ensure messages exist in chat
- Check console for timer errors
- Timer resets after showing feedback

### Issue: Delete confirmation doesn't work
**Solution:**
- Check AlertDialog component is imported
- Verify Supabase delete permissions
- Check console for database errors

---

## 🎯 Full Integration Test Flow

**Complete User Journey:**

1. **Login** → Redirects to dashboard
2. **Create Session** → Choose topic, generate curriculum
3. **Learn** → Ask questions, teacher responds
4. **View Multimedia** → Teacher shows videos/images
5. **Check Resources** → See ratings and reviews
6. **Wait 2 mins** → Feedback dialog appears
7. **Complete Assignment** → Unlock next lesson
8. **Try Locked Lesson** → See lock icon and error
9. **Complete More** → See checkmarks on completed lessons
10. **Reattempt Assignment** → Reset and redo
11. **View Profile** → Check stats and achievements
12. **Leave Session** → Auto-save with toast
13. **Dashboard** → See session in history
14. **Delete Old Session** → Confirm and remove
15. **Sign Out** → Return to login

---

## 📊 Performance Checks

### Loading Times
- Dashboard load: < 2 seconds
- Teacher response: 3-5 seconds
- Session save: < 1 second
- Delete operation: < 1 second

### Visual Smoothness
- Hover animations: 200ms transition
- Dialog open/close: Smooth fade
- Progress bars: Animated fill
- No layout shifts

### Browser Console
- No red errors (except quota if exceeded)
- No memory leaks
- API calls complete successfully
- WebSocket connections stable (if using)

---

## ✅ Final Checklist

Before marking as complete, verify:

- [ ] SQL migration executed
- [ ] Dev server running without errors
- [ ] All 12 features tested individually
- [ ] Full integration test passed
- [ ] No console errors (except known quota)
- [ ] UI looks good on desktop
- [ ] Animations are smooth
- [ ] Data persists across sessions
- [ ] Sign out works
- [ ] Can create multiple sessions

---

## 🚀 Ready for Production

Once all tests pass:
1. Run production build: `pnpm build`
2. Test production mode: `pnpm start`
3. Check all features still work
4. Deploy to Vercel/hosting
5. Test on live URL
6. Monitor error logs

Your AI-powered learning platform is complete! 🎉
