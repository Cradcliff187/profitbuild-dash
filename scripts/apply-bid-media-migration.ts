import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://clsjdxwbsjbhjibvlqbz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nTo apply this migration, you need the service role key from Supabase dashboard:');
  console.log('1. Go to https://supabase.com/dashboard/project/clsjdxwbsjbhjibvlqbz/settings/api');
  console.log('2. Copy the "service_role" secret key');
  console.log('3. Run: SUPABASE_SERVICE_ROLE_KEY=your_key_here npm run apply-migration');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🔄 Applying bid_media metadata migration...');
    
    // Read the migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20251113160000_add_bid_media_metadata.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('\n📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n');
    
    // Execute the migration using raw SQL
    // Note: Supabase JS client doesn't directly support raw DDL execution
    // You'll need to use the Supabase SQL Editor or CLI for this
    
    console.log('⚠️  This migration needs to be applied via Supabase Dashboard SQL Editor');
    console.log('    OR using the Supabase CLI with proper authentication');
    console.log('\nOption 1: Supabase Dashboard (RECOMMENDED)');
    console.log('1. Go to: https://supabase.com/dashboard/project/clsjdxwbsjbhjibvlqbz/sql/new');
    console.log('2. Copy the SQL from: supabase/migrations/20251113160000_add_bid_media_metadata.sql');
    console.log('3. Paste and run in SQL Editor');
    console.log('\nOption 2: Supabase CLI');
    console.log('1. Run: supabase login');
    console.log('2. Run: supabase link --project-ref clsjdxwbsjbhjibvlqbz');
    console.log('3. Run: supabase db push');
    
    // Verify current bid_media table structure
    console.log('\n🔍 Checking current bid_media table structure...');
    const { data, error } = await supabase
      .from('bid_media')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('   Table check result:', error.message);
    } else {
      console.log('   ✅ bid_media table is accessible');
      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        const newColumns = ['latitude', 'longitude', 'altitude', 'location_name', 'taken_at', 'device_model', 'upload_source'];
        const hasNewColumns = newColumns.every(col => columns.includes(col));
        
        if (hasNewColumns) {
          console.log('   ✅ Migration appears to be already applied!');
          console.log('   New columns found:', newColumns.filter(col => columns.includes(col)).join(', '));
        } else {
          console.log('   ⚠️  Migration not yet applied');
          console.log('   Missing columns:', newColumns.filter(col => !columns.includes(col)).join(', '));
        }
      } else {
        console.log('   ℹ️  No records in bid_media table yet');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

applyMigration();
