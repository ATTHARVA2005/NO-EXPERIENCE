# EduAgent Authentication System Documentation

## Overview
This application uses **Supabase Auth** for authentication with email/password login and user management.

## Database Structure

### Auth Schema (Managed by Supabase)
- **auth.users** - Core user authentication table
  - `id` (uuid, primary key)
  - `email` (varchar)
  - `encrypted_password` (varchar)
  - `created_at`, `updated_at`, `last_sign_in_at`
  - Currently has **1 user**

### Public Schema (Application Data)
- **public.students** - Extended user profiles
  - `id` (uuid, primary key, auto-generated)
  - `user_id` (uuid, foreign key → auth.users.id)
  - `name` (text)
  - `email` (text, unique)
  - `grade` (integer)
  - `learning_style` (text, default: 'visual')
  - `preferences` (jsonb)
  - `created_at`, `updated_at`

## Authentication Flow

### 1. Sign Up
**File:** `app/(auth)/login/page.tsx`

\`\`\`typescript
// User submits email, password, name, and grade
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name, grade },
    emailRedirectTo: `${origin}/api/auth/callback`
  }
})

// Create student profile linked to auth user
await supabase.from("students").insert({
  user_id: data.user.id,  // Links to auth.users
  email,
  name,
  grade
})
\`\`\`

**Process:**
1. User fills signup form with email, password, name, grade
2. Supabase creates user in `auth.users`
3. App creates student profile in `public.students` with `user_id` foreign key
4. Confirmation email sent to user
5. User clicks email link → redirects to callback

### 2. Email Confirmation Callback
**File:** `app/api/auth/callback/route.ts`

\`\`\`typescript
// Exchange auth code for session
await supabase.auth.exchangeCodeForSession(code)
// Redirect to dashboard
\`\`\`

**Process:**
1. User clicks confirmation link in email
2. Callback route receives auth code
3. Code exchanged for session tokens
4. Cookies set with session
5. User redirected to `/dashboard`

### 3. Sign In
**File:** `app/(auth)/login/page.tsx`

\`\`\`typescript
await supabase.auth.signInWithPassword({
  email,
  password
})
// Redirect to /dashboard
\`\`\`

### 4. Protected Routes - Middleware
**File:** `middleware.ts` and `lib/supabase/middleware.ts`

\`\`\`typescript
// Check user session
const { data: { user } } = await supabase.auth.getUser()

// Redirect to login if not authenticated
if (!user && !publicRoute) {
  return NextResponse.redirect('/login')
}
\`\`\`

**Protected Paths:**
- All routes EXCEPT: `/login`, `/api/*`, `/_next/*`, static files

### 5. Server-Side Auth
**File:** `lib/supabase-server.ts`

\`\`\`typescript
// Create server client with cookie handling
export async function getSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { ... } }
  )
}
\`\`\`

**Used in:**
- `app/(dashboard)/layout.tsx` - Check auth before rendering
- API routes - Verify user identity

### 6. Client-Side Auth
**File:** `lib/supabase-client.ts`

\`\`\`typescript
// Singleton browser client
export function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
\`\`\`

**Used in:**
- `app/(auth)/login/page.tsx` - Login/signup forms
- `components/sidebar.tsx` - Logout functionality

### 7. Logout
**Files:** `app/api/auth/logout/route.ts` and `components/sidebar.tsx`

\`\`\`typescript
// Client-side logout
await supabase.auth.signOut()
router.push("/login")
\`\`\`

## API Routes

### GET /api/auth/user
Returns current user + student profile
\`\`\`typescript
const { user, student } = await fetch('/api/auth/user').then(r => r.json())
\`\`\`

### POST /api/auth/logout
Signs out user and clears session
\`\`\`typescript
await fetch('/api/auth/logout', { method: 'POST' })
\`\`\`

### GET /api/auth/callback
Handles email confirmation redirects

## Environment Variables

### Required (.env.local)
\`\`\`bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://ykhldyxpmrqplumbuoqm.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."  # For admin operations only
\`\`\`

## Security Features

### ✅ Implemented
- Email/password authentication
- Session-based auth with cookies
- Server-side session validation
- Protected routes via middleware
- Row Level Security (RLS) on auth tables
- Foreign key constraints (students.user_id → auth.users.id)

### 🔒 Best Practices
1. **Never use service role key on client** - Only anon key
2. **Always validate user on server** - Use `getSupabaseServer()`
3. **Middleware checks all routes** - Except public paths
4. **Cookies are httpOnly** - Managed by Supabase
5. **Passwords are encrypted** - Handled by Supabase Auth

## Testing the Auth Flow

### 1. Test Signup
\`\`\`bash
1. Go to http://localhost:3000/login
2. Click "Sign Up"
3. Fill form: name, grade, email, password
4. Submit → Check email for confirmation
5. Click link in email
6. Redirected to /dashboard
\`\`\`

### 2. Test Login
\`\`\`bash
1. Go to http://localhost:3000/login
2. Enter email + password
3. Click "Sign In"
4. Redirected to /dashboard
\`\`\`

### 3. Test Protected Routes
\`\`\`bash
1. Open http://localhost:3000/dashboard (not logged in)
2. Should redirect to /login
3. Login → Can access /dashboard
\`\`\`

### 4. Test Logout
\`\`\`bash
1. Login to dashboard
2. Click "Logout" in sidebar
3. Redirected to /login
4. Try accessing /dashboard → redirected to /login
\`\`\`

## Common Issues & Solutions

### Issue: "Not authenticated" on API calls
**Solution:** Ensure cookies are being sent with requests

### Issue: Redirect loop between /login and /dashboard
**Solution:** Check middleware logic, ensure /login is excluded from auth check

### Issue: Student profile not created on signup
**Solution:** Verify foreign key relationship: `user_id` → `auth.users.id`

### Issue: Email confirmation not working
**Solution:** Check callback URL in Supabase dashboard matches `/api/auth/callback`

## File Structure
\`\`\`
app/
├── (auth)/
│   └── login/page.tsx              # Login/Signup form
├── (dashboard)/
│   └── layout.tsx                  # Protected layout with auth check
├── api/
│   └── auth/
│       ├── callback/route.ts       # Email confirmation handler
│       ├── logout/route.ts         # Logout endpoint
│       └── user/route.ts           # Get current user
lib/
├── supabase-client.ts              # Browser client
├── supabase-server.ts              # Server client
└── supabase/
    └── middleware.ts               # Auth middleware
middleware.ts                        # Route protection
components/
└── sidebar.tsx                      # Includes logout button
\`\`\`

## Next Steps
1. ✅ Email/password auth working
2. 🔄 Add password reset flow
3. 🔄 Add OAuth providers (Google, GitHub)
4. 🔄 Add email change functionality
5. 🔄 Add profile update endpoint
6. 🔄 Enable RLS policies on public.students table
