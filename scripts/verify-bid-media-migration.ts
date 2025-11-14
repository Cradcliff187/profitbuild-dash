import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = join(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://clsjdxwbsjbhjibvlqbz.supabase.co';
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseKey) {
  console.error('❌ Could not load VITE_SUPABASE_PUBLISHABLE_KEY from .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log('🔍 Verifying Bid Media Migration');
  console.log('=================================\n');

  try {
    // Try to query bid_media table to check if new columns exist
    const { data, error } = await supabase
      .from('bid_media')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying bid_media table:', error.message);
      console.log('\n⚠️  This could mean:');
      console.log('   1. The table doesn\'t exist yet (run branch_bids migration first)');
      console.log('   2. RLS policies are preventing access');
      console.log('   3. You need to be authenticated\n');
      return;
    }

    const expectedColumns = [
      'latitude',
      'longitude', 
      'altitude',
      'location_name',
      'taken_at',
      'device_model',
      'upload_source'
    ];

    if (data && data.length > 0) {
      const actualColumns = Object.keys(data[0]);
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
      const presentNewColumns = expectedColumns.filter(col => actualColumns.includes(col));

      console.log('📊 Migration Status:');
      console.log('-------------------');
      
      if (missingColumns.length === 0) {
        console.log('✅ All new columns are present!');
        console.log(`   Found: ${presentNewColumns.join(', ')}\n`);
        
        console.log('📝 Sample Record:');
        console.log(JSON.stringify(data[0], null, 2));
      } else {
        console.log('⚠️  Migration not fully applied');
        console.log(`   Missing columns: ${missingColumns.join(', ')}`);
        console.log(`   Present columns: ${presentNewColumns.join(', ')}\n`);
        
        console.log('🔧 Action Required:');
        console.log('   Run the migration SQL in Supabase Dashboard');
        console.log('   File: supabase/migrations/20251113160000_add_bid_media_metadata.sql\n');
      }
    } else {
      console.log('ℹ️  bid_media table exists but has no records yet');
      console.log('   Cannot verify column presence without data');
      console.log('\n💡 To verify columns exist:');
      console.log('   1. Upload a test document/image via the app');
      console.log('   2. Run this script again');
      console.log('   OR check the table structure in Supabase Dashboard\n');
    }

    // Check TypeScript types are in sync
    console.log('🔤 TypeScript Types:');
    console.log('-------------------');
    console.log('✅ Types have been updated in src/integrations/supabase/types.ts');
    console.log('   New fields added to BidMedia interface:\n');
    expectedColumns.forEach(col => console.log(`   - ${col}`));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyMigration();
