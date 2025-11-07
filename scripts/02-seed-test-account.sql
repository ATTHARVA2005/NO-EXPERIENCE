-- Insert test account with tamoceo@ceo.com and password tamoop
-- Note: Passwords are hashed in Supabase auth, this script creates the user via auth.users table
-- The actual user insertion will be done via a trigger from auth.users

-- This is a placeholder - the actual test account will be created during signup or via the auth API
-- For now, we'll ensure the students table has RLS policies that allow user to create their own record

-- Optional: Enable the students table to be populated when user signs up
-- This is handled by the trigger or app logic
