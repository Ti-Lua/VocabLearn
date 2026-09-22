import path from 'node:path';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=')[1]?.trim() || '';
    } else if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseKey = trimmed.split('=')[1]?.trim() || '';
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncUsersToSupabaseAuth() {
  const usersFile = path.join(process.cwd(), 'data', 'users.json');
  if (!fs.existsSync(usersFile)) {
    console.log('users.json not found');
    return;
  }
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  console.log(`Found ${users.length} users to sync to Supabase Auth...`);

  const { data: existingAuth } = await supabase.auth.admin.listUsers();
  const existingEmails = new Set(existingAuth?.users?.map(u => u.email?.toLowerCase()) || []);

  for (const u of users) {
    const email = (u.email && u.email.includes('@')) ? u.email.toLowerCase() : `${u.username.toLowerCase()}@learnvocab.local`;
    if (existingEmails.has(email)) {
      console.log(`User ${u.username} (${email}) already exists in Supabase Auth.`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      id: u.id.length === 36 ? u.id : undefined, // only pass if valid UUID
      email,
      password: 'User@' + Math.random().toString(36).slice(-8) + '!', // temp or default password if not known
      email_confirm: true,
      user_metadata: {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        display_name: u.display_name || u.full_name,
        password_hash: u.password_hash,
        avatar_url: u.avatar_url,
        created_at: u.created_at,
      }
    });

    if (error) {
      console.warn(`Error creating user ${u.username}:`, error.message);
    } else if (data?.user) {
      console.log(`Synced user ${u.username} -> Supabase Auth ID: ${data.user.id}`);
      // Init user_stats
      await supabase.from('user_stats').upsert({
        user_id: data.user.id,
        updated_at: new Date().toISOString()
      });
    }
  }

  const { data: finalAuth } = await supabase.auth.admin.listUsers();
  console.log(`Total users in Supabase Auth now: ${finalAuth?.users?.length}`);
}

syncUsersToSupabaseAuth().catch(console.error);
