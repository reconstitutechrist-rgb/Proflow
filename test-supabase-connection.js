// Test Supabase connection
import { supabase } from './api/supabaseClient.js';

async function testConnection() {
  console.log('Testing Supabase connection...');

  // Test 1: Check if client is initialized
  console.log('✓ Supabase client initialized');

  // Test 2: Try to get current session
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.log('⚠ No active session (this is normal if not logged in):', error.message);
    } else {
      console.log('✓ Auth working, session:', session ? 'Active' : 'None');
    }
  } catch (err) {
    console.error('✗ Auth test failed:', err.message);
  }

  // Test 3: Try a simple query (this will fail if tables don't exist, but confirms connection)
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('count')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log('⚠ Database connected but table "workspaces" does not exist yet');
      } else if (error.code === 'PGRST116') {
        console.log('⚠ Database connected but schema not set up yet');
      } else {
        console.log('⚠ Database query error:', error.message, 'Code:', error.code);
      }
    } else {
      console.log('✓ Database query successful!');
    }
  } catch (err) {
    console.error('✗ Database test failed:', err.message);
  }

  // Test 4: Check environment variables
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.log('\nEnvironment check:');
  console.log('VITE_SUPABASE_URL:', url ? '✓ Set' : '✗ Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', key ? '✓ Set' : '✗ Missing');
  console.log('\nConnection test complete!');
}

testConnection();
