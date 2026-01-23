import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBackfill() {
  console.log('Getting session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('Not authenticated:', sessionError);
    console.log('\n⚠️  Please login first in your browser, then run this script again.');
    process.exit(1);
  }
  
  console.log('✅ Authenticated as:', session.user.email);
  console.log('\nCalling backfill function with dry run...\n');
  
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/quickbooks-backfill-ids`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: true }),
      }
    );
    
    console.log('Response status:', response.status);
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', result);
      process.exit(1);
    }
    
    console.log('\n✅ Success!\n');
    console.log('📊 Results:');
    console.log(`  - Expenses Matched: ${result.expensesMatched}`);
    console.log(`  - Revenues Matched: ${result.revenuesMatched}`);
    console.log(`  - Unmatched Expenses: ${result.unmatchedExpenses}`);
    console.log(`  - Unmatched Revenues: ${result.unmatchedRevenues}`);
    console.log(`  - Duration: ${result.durationMs}ms`);
    
    if (result.matches.expenses.length > 0) {
      console.log('\n📝 Sample Expense Matches:');
      result.matches.expenses.slice(0, 5).forEach((match: any) => {
        console.log(`  - ${match.date} | ${match.vendor} | $${match.amount.toFixed(2)} | ${match.confidence}`);
      });
    }
    
    if (result.matches.revenues.length > 0) {
      console.log('\n💰 Sample Revenue Matches:');
      result.matches.revenues.slice(0, 5).forEach((match: any) => {
        console.log(`  - ${match.date} | ${match.customer} | $${match.amount.toFixed(2)} | ${match.confidence}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testBackfill();
