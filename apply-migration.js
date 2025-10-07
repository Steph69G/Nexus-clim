import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrationSql = readFileSync('./supabase/migrations/20251003100534_add_geolocation_preferences.sql', 'utf-8');

// Extract just the SQL commands (remove comments)
const sqlCommands = migrationSql
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('/*') && !line.trim().startsWith('*'))
  .join('\n');

console.log('Applying migration...');
console.log(sqlCommands);

const { data, error } = await supabase.rpc('exec_sql', { sql: sqlCommands });

if (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}

console.log('Migration applied successfully!');
