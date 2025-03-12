-- Temporarily disable RLS on the users table
-- This is for testing purposes only and should be re-enabled in production
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Note: After testing is complete, you can re-enable RLS with:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY; 