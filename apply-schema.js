// apply-schema.js
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load the test environment variables
dotenv.config({ path: '.env.test' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchema() {
  try {
    console.log('Reading schema.sql...');
    const schema = fs.readFileSync('./supabase/schema.sql', 'utf8');
    
    // Split the schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim() !== '');
    
    console.log(`Found ${statements.length} SQL statements to execute.`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // Execute the SQL statement
      const { error } = await supabase.rpc('pgexec', { query: statement });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
      }
    }
    
    console.log('Schema applied successfully!');
  } catch (error) {
    console.error('Error applying schema:', error);
  }
}

applySchema(); 