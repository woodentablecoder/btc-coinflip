import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to execute SQL directly
async function executeDirect(sql) {
  try {
    console.log('Executing SQL directly...');
    
    // Get authentication token
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Authentication error:', authError);
      return false;
    }
    
    if (!session) {
      console.error('No authenticated session. Please login first.');
      return false;
    }
    
    // Make a direct REST API call to Supabase REST endpoint
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseKey
    };
    
    // Execute the first migration (add columns)
    console.log('Adding columns...');
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: sql })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error executing SQL:', result);
      return false;
    }
    
    console.log('SQL executed successfully');
    return true;
  } catch (error) {
    console.error('Error executing SQL:', error);
    return false;
  }
}

// Alternative approach: Add columns directly via Supabase ORM
async function addColumnsDirectly() {
  try {
    console.log('Checking username column...');
    
    // Try to query the username column
    const { data: columnCheck, error: columnError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (columnError) {
      console.error('Error checking users table:', columnError);
      return false;
    }
    
    // Check if we have access to run the migrations
    console.log('Checking if we have access to the users table...');
    console.log('Users table accessible, columns can be added via the Supabase dashboard');
    
    // Since we found we can access the table, we should print out the SQL that needs to be run
    console.log('\nMIGRATION SQL TO RUN IN SUPABASE SQL EDITOR:');
    console.log('------------------------------------------------');
    console.log(`
-- Add username and avatar_url columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE public.users ADD COLUMN username TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
    END IF;
END
$$;

-- Create a storage bucket for user avatars if it doesn't exist
DO $$
BEGIN
    -- Check if bucket exists first to avoid errors
    IF NOT EXISTS (
        SELECT FROM storage.buckets 
        WHERE name = 'user-avatars'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('user-avatars', 'user-avatars', true);
    END IF;
END
$$;

-- Set up security policies for the user-avatars bucket
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Allow public read access to avatars
    SELECT EXISTS (
        SELECT FROM storage.policies 
        WHERE name = 'Allow public read access' AND bucket_id = 'user-avatars'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        INSERT INTO storage.policies (name, bucket_id, operation, definition)
        VALUES ('Allow public read access', 'user-avatars', 'SELECT', 'true');
    END IF;
    
    -- Allow users to upload their own avatars
    SELECT EXISTS (
        SELECT FROM storage.policies 
        WHERE name = 'Allow users to upload their own avatars' AND bucket_id = 'user-avatars'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        INSERT INTO storage.policies (name, bucket_id, operation, definition)
        VALUES (
            'Allow users to upload their own avatars', 
            'user-avatars', 
            'INSERT', 
            'auth.uid()::text = (storage.foldername(name))[1]'
        );
    END IF;
    
    -- Allow users to update their own avatars
    SELECT EXISTS (
        SELECT FROM storage.policies 
        WHERE name = 'Allow users to update their own avatars' AND bucket_id = 'user-avatars'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        INSERT INTO storage.policies (name, bucket_id, operation, definition)
        VALUES (
            'Allow users to update their own avatars', 
            'user-avatars', 
            'UPDATE', 
            'auth.uid()::text = (storage.foldername(name))[1]'
        );
    END IF;
END
$$;
`);
    
    return true;
  } catch (error) {
    console.error('Error in direct migration:', error);
    return false;
  }
}

// Execute migrations
async function runMigrations() {
  console.log('Starting migration check...');
  
  const success = await addColumnsDirectly();
  
  if (success) {
    console.log('\nMIGRATION INSTRUCTIONS:');
    console.log('------------------------');
    console.log('1. Go to the Supabase dashboard at:', supabaseUrl);
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the SQL shown above');
    console.log('4. Run the SQL to add the needed columns and storage bucket');
    console.log('\nAlternatively, you can manually:');
    console.log('1. Add "username" and "avatar_url" TEXT columns to the users table');
    console.log('2. Create a storage bucket named "user-avatars" with public access');
    console.log('3. Create the appropriate storage policies for user uploads');
  } else {
    console.error('Migration check failed');
  }
}

// Run migrations
runMigrations().catch(console.error); 