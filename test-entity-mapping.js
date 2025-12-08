// Test entity mapping fix
import { db } from './api/db.js';
import { readFileSync } from 'fs';

// Read environment variables
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

// Override import.meta.env for Node.js
global.importMetaEnv = {
  VITE_SUPABASE_URL: envVars.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: envVars.VITE_SUPABASE_ANON_KEY,
};

async function testMapping() {
  console.log('Testing entity name to table name mapping...\n');

  try {
    // Test Workspace entity
    console.log('Testing Workspace entity...');
    const workspaces = await db.entities.Workspace.list();
    console.log('✅ Workspace query successful! Found', workspaces.length, 'workspace(s)');

    // Test Project entity
    console.log('Testing Project entity...');
    const projects = await db.entities.Project.list();
    console.log('✅ Project query successful! Found', projects.length, 'project(s)');

    // Test Task entity
    console.log('Testing Task entity...');
    const tasks = await db.entities.Task.list();
    console.log('✅ Task query successful! Found', tasks.length, 'task(s)');

    console.log('\n🎉 All entity mappings working correctly!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  }
}

testMapping();
