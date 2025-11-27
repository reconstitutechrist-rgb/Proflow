// Verify Supabase database connection (Node.js version)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables from .env file
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  console.log('🔍 Verifying Supabase database connection...\n');
  console.log(`📍 URL: ${supabaseUrl}\n`);

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

  console.log('Testing connection to tables:\n');

  let connectedCount = 0;
  let missingCount = 0;

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${table.padEnd(20)}: Table does not exist`);
          missingCount++;
        } else if (error.code === 'PGRST116') {
          console.log(`❌ ${table.padEnd(20)}: Schema not configured`);
          missingCount++;
        } else {
          console.log(`⚠️  ${table.padEnd(20)}: ${error.message}`);
        }
      } else {
        console.log(`✅ ${table.padEnd(20)}: Connected (${count || 0} records)`);
        connectedCount++;
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(20)}: ${err.message}`);
      missingCount++;
    }
  }

  console.log('\n🔍 Testing authentication...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.log(`⚠️  Auth: No user logged in`);
    } else if (user) {
      console.log(`✅ Auth: User logged in - ${user.email}`);
    } else {
      console.log(`⚠️  Auth: No active session (this is normal)`);
    }
  } catch (err) {
    console.log(`❌ Auth: ${err.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Connected tables: ${connectedCount}`);
  console.log(`❌ Missing tables: ${missingCount}`);
  console.log('='.repeat(50));

  if (connectedCount > 0) {
    console.log('\n🎉 Database connection successful!\n');
  } else {
    console.log('\n⚠️  No tables found. Database may need schema setup.\n');
  }
}

verifyDatabase().catch(console.error);
