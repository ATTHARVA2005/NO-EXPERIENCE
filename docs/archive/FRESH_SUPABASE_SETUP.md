# 🚀 FRESH SUPABASE SETUP GUIDE

## ✅ Step 1: Environment Variables (DONE!)

Your `.env.local` file has been updated with the new Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL="https://wmhnjrsqvqiregvojjpv.supabase.co"
```

---

## 🗄️ Step 2: Run Database Setup (DO THIS NOW!)

### **Go to Supabase:**
1. Open: https://wmhnjrsqvqiregvojjpv.supabase.co
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"

### **Copy & Paste:**
Open the file: `scripts/COMPLETE-FRESH-SETUP.sql`

Copy the **ENTIRE** file and paste it into the SQL Editor

### **Run:**
Click the green "Run" button (or press Ctrl+Enter / Cmd+Enter)

### **Wait:**
Should complete in ~30 seconds

### **Expected Result:**
You should see a success message:
```
✅ DATABASE SETUP COMPLETE!
11 Tables Created
45+ Indexes Created
30+ RLS Policies Applied
4 Views Created
1 Helper Function
7 Auto-Update Triggers
```

---

## 👤 Step 3: Enable Authentication

### **In Supabase Dashboard:**
1. Click "Authentication" in left sidebar
2. Click "Providers"
3. Find "Email" provider
4. Click to expand
5. Enable "Email provider"
6. Save

---

## 🧪 Step 4: Create Test User

### **Option A: Via Supabase UI**
1. Go to Authentication → Users
2. Click "Add User"
3. Enter email: `test@example.com`
4. Enter password: `Test123456!`
5. Click "Create User"

### **Option B: Via Your App**
1. Start your Next.js app: `npm run dev`
2. Go to signup page
3. Create account

---

## 📝 Step 5: Create Student Profile (IMPORTANT!)

After creating a user, run this in SQL Editor:

```sql
-- Replace the email with your test user's email
INSERT INTO student_profiles (id, name, grade_level)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@example.com'),
  'Test Student',
  9
);
```

---

## ✅ Step 6: Verify Everything Works

Run this query in SQL Editor:

```sql
-- Check all tables
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'student_profiles',
    'learning_sessions',
    'assessments',
    'assignments',
    'feedback_history',
    'tutor_sessions',
    'concept_mastery',
    'performance_analytics',
    'resources',
    'resource_recommendations',
    'activity_log'
  )
ORDER BY table_name;
```

**Expected:** 11 rows (all your tables)

---

## 🎯 Step 7: Start Your App!

```bash
# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

Visit: http://localhost:3000

---

## 📊 Database Structure Created

### **11 Tables:**
1. ✅ `student_profiles` - User profiles
2. ✅ `learning_sessions` - All learning activity
3. ✅ `assessments` - Tests and quizzes
4. ✅ `assignments` - Practice work
5. ✅ `feedback_history` - All feedback
6. ✅ `tutor_sessions` - Conversations
7. ✅ `concept_mastery` - Progress tracking
8. ✅ `performance_analytics` - Stats
9. ✅ `resources` - Learning materials
10. ✅ `resource_recommendations` - Personalized suggestions
11. ✅ `activity_log` - Audit trail

### **4 Views (for easy queries):**
- `student_dashboard` - Student overview
- `session_history` - Past sessions
- `assessment_performance` - Test results
- `learning_progress` - Concept mastery

### **Security:**
- ✅ Row Level Security (RLS) enabled
- ✅ Users can only see their own data
- ✅ 30+ policies protecting all tables

---

## 🔒 Security Notes

### **Safe for Client-Side:**
```typescript
// ✅ These are SAFE to use in browser
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### **Server-Side ONLY:**
```typescript
// ❌ NEVER expose these in client code
SUPABASE_SERVICE_ROLE_KEY  // Full admin access!
SUPABASE_JWT_SECRET
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `scripts/COMPLETE-FRESH-SETUP.sql` | Main database setup |
| `.env.local` | Environment variables (updated) |
| `lib/supabase-client.ts` | Client-side Supabase |
| `lib/supabase-server.ts` | Server-side Supabase |

---

## 🆘 Troubleshooting

### **"Error: relation does not exist"**
- You forgot to run `COMPLETE-FRESH-SETUP.sql`
- Run it now in Supabase SQL Editor

### **"Error: JWT expired"**
- Old credentials cached
- Clear browser cache
- Restart dev server

### **Can't login/signup**
- Check Authentication is enabled
- Check email provider is enabled
- Look in Supabase logs

### **"Permission denied"**
- User doesn't have student profile
- Run Step 5 to create profile

---

## ✅ Quick Checklist

- [ ] Ran `COMPLETE-FRESH-SETUP.sql` in Supabase
- [ ] Enabled Email authentication
- [ ] Created test user
- [ ] Created student profile for test user
- [ ] Verified 11 tables exist
- [ ] Started Next.js app
- [ ] Can login successfully

---

## 🎉 You're Ready!

Your fresh Supabase instance is fully configured with:
- ✅ Complete database schema
- ✅ User-centric design (all data under auth.users)
- ✅ Full history tracking
- ✅ Performance indexes
- ✅ Security policies
- ✅ Helper views

**Next:** Build your app features! 🚀
