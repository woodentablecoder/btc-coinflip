import { createClient } from '@supabase/supabase-js';

// Get environment variables from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

// Enhanced Supabase client options to reduce connection noise
const options = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 1, // Limit events rate 
    },
    // Increase timeout to reduce reconnection attempts
    timeout: 30000,
    // Add heartbeat parameters to reduce missed heartbeat failures
    heartbeatIntervalMs: 60000, // 60 seconds between heartbeats
    // Increase retry timeouts
    retryAfterMs: (attempts) => Math.min((2 ** attempts) * 1000, 60000), // Exponential backoff with 60s cap
  },
  // Configure global fetch parameters
  global: {
    fetch: (url, options) => {
      options.cache = 'no-cache'; // Disable caching for fetch requests
      return fetch(url, options);
    },
  },
  db: {
    schema: 'public',
  },
};

// Initialize Supabase client with enhanced options to reduce noise
const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

// Export initialized client
export default supabase; 