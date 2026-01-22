/**
 * Execute bulk client sync to QuickBooks
 * This script calls the bulk sync Edge Function with service role authentication
 */

const SUPABASE_URL = 'https://clsjdxwbsjbhjibvlqbz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsc2pkeHdic2piaGppYnZscWJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk2NDU5NSwiZXhwIjoyMDczNTQwNTk1fQ.YBvvKLu8JEOpLa3gDnv5FeLCPBmk7PzqOGN5PXc5xq8';

async function executeBulkSync() {
  console.log('🚀 Starting bulk client sync to QuickBooks...\n');

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/quickbooks-bulk-sync-customers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // No clientIds = sync all unsynced clients
          dryRun: false,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Sync failed:', result);
      process.exit(1);
    }

    console.log('✅ Bulk sync completed!\n');
    console.log('Summary:');
    console.log(`  Total: ${result.summary.total}`);
    console.log(`  Successful: ${result.summary.successful}`);
    console.log(`  Failed: ${result.summary.failed}`);
    console.log(`  Skipped: ${result.summary.skipped}`);
    console.log(`  Duration: ${(result.summary.duration_ms / 1000).toFixed(2)}s\n`);

    if (result.results && result.results.length > 0) {
      console.log('First 10 results:');
      result.results.slice(0, 10).forEach((r: any) => {
        if (r.success) {
          console.log(`  ✅ ${r.clientName} - QB ID: ${r.qbCustomerId || 'already synced'}`);
        } else {
          console.log(`  ❌ ${r.clientName} - Error: ${r.error}`);
        }
      });
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error executing bulk sync:', error.message);
    process.exit(1);
  }
}

executeBulkSync();
