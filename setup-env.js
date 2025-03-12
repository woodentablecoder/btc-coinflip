// setup-env.js
import fs from "fs";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("\n\x1b[1mBTC Coinflip - Environment Setup\x1b[0m");
console.log(
  "This script will help you set up your environment variables for the project.\n"
);

let supabaseUrl = "";
let supabaseKey = "";
const envContent = "# Supabase environment variables\n";
const testEnvContent = "# Supabase test environment variables\n";

rl.question("\x1b[36mEnter your Supabase URL:\x1b[0m ", (url) => {
  if (!url) {
    console.log("\x1b[31mSupabase URL is required. Exiting setup.\x1b[0m");
    rl.close();
    return;
  }

  supabaseUrl = url;

  rl.question("\x1b[36mEnter your Supabase Anon Key:\x1b[0m ", (key) => {
    if (!key) {
      console.log(
        "\x1b[31mSupabase Anon Key is required. Exiting setup.\x1b[0m"
      );
      rl.close();
      return;
    }

    supabaseKey = key;

    // Save to .env file
    fs.writeFileSync(
      ".env",
      envContent +
        `VITE_SUPABASE_URL=${supabaseUrl}\n` +
        `VITE_SUPABASE_ANON_KEY=${supabaseKey}\n`
    );

    // Save to .env.test file
    fs.writeFileSync(
      ".env.test",
      testEnvContent +
        `VITE_SUPABASE_URL=${supabaseUrl}\n` +
        `VITE_SUPABASE_ANON_KEY=${supabaseKey}\n`
    );

    console.log(
      "\n\x1b[32mEnvironment variables have been saved to .env and .env.test files!\x1b[0m"
    );
    console.log("You can now run the application with:");
    console.log("  npm run dev");
    console.log("Or run with test environment:");
    console.log("  npm run dev:test\n");

    rl.close();
  });
});
