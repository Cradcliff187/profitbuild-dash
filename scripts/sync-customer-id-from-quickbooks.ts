/**
 * Script to fetch and sync customer IDs from QuickBooks to local database
 * Run this after manually adding a customer in QuickBooks
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncCustomerId(clientName: string) {
  console.log(`🔍 Searching for "${clientName}" in QuickBooks...`);

  // Get active QuickBooks connection
  const { data: connection, error: connError } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('is_active', true)
    .single();

  if (connError || !connection) {
    console.error('❌ No active QuickBooks connection found');
    return;
  }

  const { realm_id, access_token, environment } = connection;
  const baseUrl = environment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';

  // Query QuickBooks for customer by name
  const queryUrl = `${baseUrl}/v3/company/${realm_id}/query?query=${encodeURIComponent(
    `SELECT * FROM Customer WHERE DisplayName = '${clientName}' OR CompanyName = '${clientName}'`
  )}`;

  const response = await fetch(queryUrl, {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('❌ Failed to query QuickBooks:', await response.text());
    return;
  }

  const data = await response.json();
  const customers = data?.QueryResponse?.Customer || [];

  if (customers.length === 0) {
    console.log(`⚠️  Customer "${clientName}" not found in QuickBooks`);
    console.log('💡 Make sure you added it with the exact name');
    return;
  }

  const customer = customers[0];
  console.log(`✅ Found customer in QuickBooks:`);
  console.log(`   ID: ${customer.Id}`);
  console.log(`   Name: ${customer.DisplayName}`);

  // Update local database
  const { data: localClient, error: clientError } = await supabase
    .from('clients')
    .select('id, client_name')
    .ilike('client_name', clientName)
    .single();

  if (clientError || !localClient) {
    console.error('❌ Client not found in local database:', clientName);
    return;
  }

  const { error: updateError } = await supabase
    .from('clients')
    .update({
      quickbooks_customer_id: customer.Id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', localClient.id);

  if (updateError) {
    console.error('❌ Failed to update local database:', updateError);
    return;
  }

  console.log(`✅ Updated local database for "${localClient.client_name}"`);
  console.log(`   Client ID: ${localClient.id}`);
  console.log(`   QuickBooks Customer ID: ${customer.Id}`);
}

// Run for UC Health
syncCustomerId('UC Health')
  .then(() => console.log('\n✅ Done!'))
  .catch(err => console.error('❌ Error:', err));
