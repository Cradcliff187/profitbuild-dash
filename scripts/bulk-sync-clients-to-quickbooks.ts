/**
 * Bulk sync all clients to QuickBooks as Customers
 * This script will sync all clients that don't have a quickbooks_customer_id
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('   Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SyncResult {
  clientId: string;
  clientName: string;
  success: boolean;
  quickbooksCustomerId?: string;
  error?: string;
}

async function syncAllClients() {
  console.log('🚀 Starting bulk client sync to QuickBooks...\n');

  // Fetch all clients that need syncing
  const { data: clients, error: fetchError } = await supabase
    .from('clients')
    .select('id, client_name, quickbooks_customer_id')
    .order('client_name');

  if (fetchError) {
    console.error('❌ Failed to fetch clients:', fetchError);
    process.exit(1);
  }

  if (!clients || clients.length === 0) {
    console.log('⚠️  No clients found in database');
    return;
  }

  const needsSync = clients.filter(c => !c.quickbooks_customer_id);
  const alreadySynced = clients.length - needsSync.length;

  console.log(`📊 Client Summary:`);
  console.log(`   Total clients: ${clients.length}`);
  console.log(`   Already synced: ${alreadySynced}`);
  console.log(`   Need syncing: ${needsSync.length}\n`);

  if (needsSync.length === 0) {
    console.log('✅ All clients are already synced!');
    return;
  }

  // Get admin user session for API calls
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError || !users || users.length === 0) {
    console.error('❌ Failed to get admin user:', usersError);
    process.exit(1);
  }

  // Use first admin user
  const adminUser = users[0];
  console.log(`🔑 Using user: ${adminUser.email}\n`);

  // Create a session for the admin user
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: adminUser.email!,
  });

  if (sessionError) {
    console.error('❌ Failed to create session:', sessionError);
    process.exit(1);
  }

  // Get the access token from the generated link
  // For service role, we'll use the service key directly in the Edge Function call
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/quickbooks-sync-customer`;

  const results: SyncResult[] = [];
  let successCount = 0;
  let failCount = 0;

  console.log('🔄 Starting sync process...\n');
  console.log('━'.repeat(80));

  for (let i = 0; i < needsSync.length; i++) {
    const client = needsSync[i];
    const progress = `[${i + 1}/${needsSync.length}]`;

    console.log(`\n${progress} Syncing: "${client.client_name}"`);

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId: client.id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        successCount++;
        console.log(`   ✅ Success! QB Customer ID: ${result.quickbooks_customer_id}`);
        results.push({
          clientId: client.id,
          clientName: client.client_name,
          success: true,
          quickbooksCustomerId: result.quickbooks_customer_id,
        });
      } else {
        failCount++;
        const errorMsg = result.error || result.message || 'Unknown error';
        console.log(`   ❌ Failed: ${errorMsg}`);
        results.push({
          clientId: client.id,
          clientName: client.client_name,
          success: false,
          error: errorMsg,
        });
      }
    } catch (error: any) {
      failCount++;
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        clientId: client.id,
        clientName: client.client_name,
        success: false,
        error: error.message,
      });
    }

    // Small delay to avoid overwhelming the API
    if (i < needsSync.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('\n' + '━'.repeat(80));
  console.log('\n📊 SYNC COMPLETE!\n');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Success Rate: ${((successCount / needsSync.length) * 100).toFixed(1)}%`);

  // Show failures if any
  if (failCount > 0) {
    console.log('\n❌ Failed Clients:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   • ${r.clientName}: ${r.error}`);
      });
  }

  console.log('\n✅ Bulk sync complete!\n');
}

// Run the sync
syncAllClients()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
