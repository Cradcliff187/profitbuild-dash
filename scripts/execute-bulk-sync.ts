/**
 * Execute bulk client sync to QuickBooks directly
 * Uses Supabase MCP service role for authentication
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://clsjdxwbsjbhjibvlqbz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Please set it with: $env:SUPABASE_SERVICE_ROLE_KEY = "your-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAllClients() {
  console.log('🚀 Starting bulk client sync to QuickBooks...\n');

  // Fetch all clients that need syncing
  const { data: clients, error: fetchError } = await supabase
    .from('clients')
    .select('id, client_name, quickbooks_customer_id')
    .is('quickbooks_customer_id', null)
    .order('client_name');

  if (fetchError) {
    console.error('❌ Failed to fetch clients:', fetchError);
    process.exit(1);
  }

  if (!clients || clients.length === 0) {
    console.log('✅ All clients are already synced!');
    return;
  }

  console.log(`📊 Found ${clients.length} clients to sync\n`);
  console.log('━'.repeat(80));

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const progress = `[${i + 1}/${clients.length}]`;

    console.log(`\n${progress} Syncing: "${client.client_name}"`);

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/quickbooks-sync-customer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clientId: client.id }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        successCount++;
        console.log(`   ✅ Success! QB Customer ID: ${result.quickbooks_customer_id}`);
      } else {
        failCount++;
        const errorMsg = result.error || result.message || 'Unknown error';
        console.log(`   ❌ Failed: ${errorMsg}`);
      }
    } catch (error: any) {
      failCount++;
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Small delay to avoid overwhelming the API
    if (i < clients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('\n' + '━'.repeat(80));
  console.log('\n📊 SYNC COMPLETE!\n');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Success Rate: ${((successCount / clients.length) * 100).toFixed(1)}%\n`);
}

syncAllClients().catch(console.error);
