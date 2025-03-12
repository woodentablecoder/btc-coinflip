// apply-admin-role.js
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Check for missing environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error("\x1b[31mError: Missing Supabase environment variables\x1b[0m");
  console.log("\nPlease ensure your .env file contains:");
  console.log("  VITE_SUPABASE_URL=<your-supabase-url>");
  console.log("  VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>");
  console.log("\nYou can find these values in your Supabase project settings.");
  process.exit(1);
}

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyAdminRoleMigration() {
  try {
    console.log("Reading admin role migration...");
    const migration = fs.readFileSync(
      "./supabase/migrations/create_admin_role.sql",
      "utf8"
    );

    // Split the migration into individual statements
    const statements = migration
      .split(";")
      .filter((stmt) => stmt.trim() !== "");

    console.log(`Found ${statements.length} SQL statements to execute.`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ";";
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      // Execute the SQL statement
      const { error } = await supabase.rpc("pgexec", { query: statement });

      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
      }
    }

    console.log("\x1b[32mAdmin role migration applied successfully!\x1b[0m");
  } catch (error) {
    console.error("\x1b[31mError applying admin role migration:\x1b[0m", error);
    process.exit(1);
  }
}

applyAdminRoleMigration();
