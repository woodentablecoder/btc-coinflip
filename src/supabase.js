import { createClient } from '@supabase/supabase-js';

// Get environment variables from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

// Supabase client options with improved real-time support
const options = {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeat: {
      // Send a heartbeat every 5 seconds (reduced from 10)
      interval: 5000
    },
    logger: (log) => {
      console.log(`SUPABASE REALTIME LOG: ${log.message}`, log);
    }
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'btc-coinflip-web-app'
    }
  }
};

// Initialize Supabase client with options
const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

// Add debug listener for auth events
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth event:', event, session ? 'User authenticated' : 'No user');
});

// Test and log realtime connection status
const testRealtimeConnection = async () => {
  try {
    // Access the realtime client instance
    const { realtime } = supabase;

    // Log current state
    console.log('Realtime initial state:', {
      isConnected: realtime?.isConnected() || false,
      channels: realtime?.channels || []
    });

    // Setup a listener for connection open
    const openHandler = () => {
      console.log('🟢 Realtime connection established');
    };

    // Setup a listener for connection close
    const closeHandler = () => {
      console.log('🔴 Realtime connection closed');
    };

    // Setup a listener for connection error
    const errorHandler = (event) => {
      console.error('❌ Realtime connection error:', event);
    };

    // Add event listeners
    if (realtime) {
      realtime.getSocket().onopen = openHandler;
      realtime.getSocket().onclose = closeHandler;
      realtime.getSocket().onerror = errorHandler;
    }
  } catch (error) {
    console.error('Error testing realtime connection:', error);
  }
};

// Run connection test
testRealtimeConnection();

// Export initialized client
export default supabase; 