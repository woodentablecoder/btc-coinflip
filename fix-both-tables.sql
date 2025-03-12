-- Disable RLS on users table in all schemas
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Check for other schemas that might have a users table
SELECT 
  n.nspname as schema,
  c.relname as table_name,
  c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users'
  AND n.nspname != 'public';

-- If other schemas have users tables, disable RLS on them too
-- Replace 'auth' with whatever schema name is returned above, if any
-- ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users'; 