# How to Apply the Database Schema

Follow these steps to apply the database schema to your test Supabase project:

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your test project: kxhjdzrdnzlgomjrchhz
3. Go to the SQL Editor (left sidebar)
4. Click "New Query"
5. Copy the entire contents of the `supabase/schema.sql` file
6. Paste it into the SQL Editor
7. Click "Run" to execute the SQL statements

## Verify the Schema

To verify that the schema was applied correctly:
1. Go to the "Table Editor" in your Supabase dashboard
2. You should see the following tables:
   - users
   - games
   - transactions

If any of these tables are missing, check the SQL output for errors.

## Testing the App

After successfully applying the schema, run the app in test mode:

```bash
npm run dev:test
```

This will use your test environment configuration from `.env.test`.

## Common Issues

If you still see errors like "relation 'public.users' does not exist", try these troubleshooting steps:

1. Make sure you're using the test environment by running `npm run dev:test` instead of just `npm run dev`
2. Verify your `.env.test` file has the correct Supabase URL and anon key
3. Check the Supabase dashboard to confirm the tables were created
4. Try creating a basic user table manually through the Table Editor interface in Supabase 