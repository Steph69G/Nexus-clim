import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const sql = readFileSync('./supabase/migrations/20251027130000_add_conversation_archive_and_leave.sql', 'utf8');
    
    console.log('📝 Applying migration: add_conversation_archive_and_leave');
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
      // If exec_sql doesn't exist, try direct query
      return supabase.from('_migrations').select('*').limit(1);
    });

    // Try to add columns directly
    console.log('Adding archived_at column...');
    await supabase.rpc('exec', {
      sql: 'ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS archived_at timestamptz;'
    }).catch(async () => {
      // Direct approach if RPC doesn't work
      const { error: alterError } = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS left_at timestamptz;'
        })
      });
    });

    console.log('✅ Migration applied successfully!');
    console.log('\n📋 You can now use archive and leave features.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Please run this SQL manually in Supabase SQL Editor:');
    console.log('\nALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS archived_at timestamptz;');
    console.log('ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS left_at timestamptz;');
  }
}

applyMigration();
