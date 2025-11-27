// Verify Supabase database connection and tables
import { supabase } from './api/supabaseClient.js';

async function verifyDatabase() {
  console.log('🔍 Verifying Supabase database connection...\n');

  const tables = [
    'workspaces',
    'projects',
    'tasks',
    'documents',
    'users',
    'assignments',
    'workspace_members',
    'document_versions',
    'comments',
    'tags'
  ];

  console.log('Testing connection to each table:\n');

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${table}: Table does not exist`);
        } else {
          console.log(`⚠️  ${table}: ${error.message} (${error.code})`);
        }
      } else {
        console.log(`✅ ${table}: Connected (${count || 0} records)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n🔍 Testing authentication...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.log(`⚠️  Auth: No user logged in (${error.message})`);
    } else if (user) {
      console.log(`✅ Auth: User logged in - ${user.email}`);
    } else {
      console.log(`⚠️  Auth: No active session`);
    }
  } catch (err) {
    console.log(`❌ Auth: ${err.message}`);
  }

  console.log('\n✨ Database verification complete!\n');
}

verifyDatabase();
