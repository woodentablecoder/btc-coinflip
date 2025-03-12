// setup-test-env.js
import fs from 'fs';
import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Create the test environment file if it doesn't exist
if (!fs.existsSync('.env.test')) {
  fs.writeFileSync('.env.test', `# Test environment variables
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
`);
}

console.log('Setting up test environment for btc-coinflip');
console.log('You will need to create a new Supabase project for testing.');
console.log('Visit https://app.supabase.com/project/_/editor/table');

rl.question('Enter your test Supabase project URL: ', (url) => {
  rl.question('Enter your test Supabase anon key: ', (key) => {
    // Update the .env.test file
    const envContent = `# Test environment variables
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ANON_KEY=${key}
`;
    fs.writeFileSync('.env.test', envContent);
    
    console.log('.env.test file updated successfully.');
    console.log('To push the schema to your test database, run:');
    console.log('npx supabase db push --project-ref <your-test-project-ref>');
    console.log('To run the app in test mode, use:');
    console.log('npm run dev:test');
    
    rl.close();
  });
}); 