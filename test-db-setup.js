// test-db-setup.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key in .env.test file');
  process.exit(1);
}

console.log('Connecting to test database...');
console.log(`URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestDatabase() {
  try {
    // Test connection by getting the current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error connecting to Supabase:', userError.message);
      return;
    }
    
    console.log('Connected to Supabase successfully!');
    
    // Check if users table exists by querying it
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError && usersError.message.includes('does not exist')) {
      console.log('Users table does not exist. Creating basic schema...');
      
      // Create users table
      const { error: createError } = await supabase.rpc('create_users_table');
      
      if (createError) {
        console.error('Error creating users table:', createError.message);
        console.log('Please follow the instructions in APPLY_SCHEMA_INSTRUCTIONS.md to set up your database schema manually.');
      } else {
        console.log('Users table created successfully!');
      }
    } else if (usersError) {
      console.error('Error querying users table:', usersError.message);
    } else {
      console.log('Users table exists!', usersData);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupTestDatabase(); 