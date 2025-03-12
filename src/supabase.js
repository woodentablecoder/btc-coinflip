import { createClient } from '@supabase/supabase-js';

// Get environment variables from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Default is true; the session is persisted in local storage
    detectSessionInUrl: true, // Default is true; detects OAuth session params in URL
    autoRefreshToken: true, // Default is true; automatically refreshes token
  },
});

// Add debug listener for auth events
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth event:', event, session ? 'User authenticated' : 'No user');
});

// Export initialized client
export default supabase; 