import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  try {
    console.log('Setting up storage bucket...');

    // Creating a storage bucket
    const { data: bucketData, error: bucketError } = await supabase
      .storage
      .createBucket('user-avatars', {
        public: true,
        fileSizeLimit: 1024 * 1024 * 2, // 2MB file size limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('Storage bucket already exists. Proceeding with policy setup.');
      } else {
        console.error('Error creating storage bucket:', bucketError);
        return false;
      }
    } else {
      console.log('Storage bucket created successfully:', bucketData);
    }

    console.log('Storage setup completed!');
    console.log('\nNext Steps:');
    console.log('1. Go to the Supabase dashboard at:', supabaseUrl);
    console.log('2. Navigate to Storage > Buckets');
    console.log('3. Verify that the "user-avatars" bucket exists');
    console.log('4. Set up the following policies manually:');
    console.log('   - Allow public read access (SELECT)');
    console.log('   - Allow authenticated users to upload their own avatars (INSERT)');
    console.log('   - Allow users to update their own avatars (UPDATE)');
    console.log('\nPolicy expressions:');
    console.log('- For INSERT and UPDATE: auth.uid()::text = (storage.foldername(name))[1]');
    console.log('- For SELECT: true (allow public read)');

    return true;
  } catch (error) {
    console.error('Error setting up storage:', error);
    return false;
  }
}

// Run the setup
setupStorage().then((success) => {
  if (success) {
    console.log('Storage setup process completed.');
  } else {
    console.error('Storage setup failed.');
  }
}).catch(console.error); 