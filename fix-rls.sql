-- Drop the existing policy that's causing issues
DROP POLICY IF EXISTS "Users can view their own data" ON users;

-- Add appropriate policies
-- Allow users to view their own data
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow new user registration
CREATE POLICY "Allow registration" ON users
  FOR INSERT
  WITH CHECK (true);
  
-- Allow service roles to manage users
CREATE POLICY "Service role can manage users" ON users
  USING (auth.jwt() -> 'role' = 'service_role');

-- Make sure auth is working correctly
-- By default service roles bypass RLS, make sure app is using the correct role
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'authenticated';
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'anon';
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'service_role'; 