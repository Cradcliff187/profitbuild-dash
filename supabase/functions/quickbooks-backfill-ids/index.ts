import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// QuickBooks API types
interface QuickBooksConnection {
  access_token: string;
  refresh_token: string;
  realm_id: string;
  token_expires_at: string;
}

interface QuickBooksTransaction {
  Id: string;
  TxnDate: string;
  TotalAmt: number;
  VendorRef?: { name: string; value: string };
  EntityRef?: { name: string; value: string };
  CustomerRef?: { name: string; value: string };
  DocNumber?: string;
  Line?: Array<{
    AccountBasedExpenseLineDetail?: {
      AccountRef?: { name: string; value: string };
      CustomerRef?: { name: string; value: string };
    };
  }>;
}

interface BackfillRequest {
  dryRun?: boolean;
}

interface MatchedExpense {
  dbId: string;
  qbId: string;
  date: string;
  amount: number;
  vendor: string;
  projectNumber?: string;
  confidence: 'exact' | 'fuzzy';
}

interface MatchedRevenue {
  dbId: string;
  qbId: string;
  date: string;
  amount: number;
  customer: string;
  projectNumber?: string;
  confidence: 'exact';
}

interface BackfillResponse {
  success: boolean;
  dryRun: boolean;
  expensesMatched: number;
  revenuesMatched: number;
  expensesUpdated: number;
  revenuesUpdated: number;
  unmatchedExpenses: number;
  unmatchedRevenues: number;
  matches: {
    expenses: MatchedExpense[];
    revenues: MatchedRevenue[];
  };
  errors: string[];
  durationMs: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fuzzy string matching (simple Levenshtein-based)
function similarityScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Simple character overlap ratio
  const set1 = new Set(s1.replace(/\s+/g, ''));
  const set2 = new Set(s2.replace(/\s+/g, ''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

async function refreshQuickBooksToken(
  supabase: any,
  connection: QuickBooksConnection
): Promise<QuickBooksConnection> {
  const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID');
  const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('QuickBooks credentials not configured');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: `grant_type=refresh_token&refresh_token=${connection.refresh_token}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  const updatedConnection = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    realm_id: connection.realm_id,
    token_expires_at: expiresAt,
  };

  await supabase
    .from('quickbooks_connections')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: expiresAt,
    })
    .eq('realm_id', connection.realm_id);

  return updatedConnection;
}

async function fetchQuickBooksTransactions(
  accessToken: string,
  realmId: string,
  type: 'Bill' | 'Purchase' | 'Invoice'
): Promise<QuickBooksTransaction[]> {
  const baseUrl = 'https://sandbox-quickbooks.api.intuit.com';
  const query = `SELECT * FROM ${type}`;
  const url = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${type}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.QueryResponse?.[type] || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request body
    const { dryRun = true }: BackfillRequest = await req.json();
    console.log(`Backfill started - DryRun: ${dryRun}`);

    // Use service role key directly since this is admin-only
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get QuickBooks connection
    const { data: connection, error: connError } = await adminSupabase
      .from('quickbooks_connections')
      .select('*')
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'QuickBooks not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    let qbConnection = connection as QuickBooksConnection;
    if (new Date(qbConnection.token_expires_at) <= new Date()) {
      console.log('🔄 Refreshing QuickBooks token...');
      qbConnection = await refreshQuickBooksToken(adminSupabase, qbConnection);
    }

    // Fetch ALL QuickBooks transactions (no date filter)
    console.log('📥 Fetching ALL QuickBooks transactions...');
    const [bills, purchases, invoices] = await Promise.all([
      fetchQuickBooksTransactions(qbConnection.access_token, qbConnection.realm_id, 'Bill'),
      fetchQuickBooksTransactions(qbConnection.access_token, qbConnection.realm_id, 'Purchase'),
      fetchQuickBooksTransactions(qbConnection.access_token, qbConnection.realm_id, 'Invoice'),
    ]);

    console.log(`✅ Fetched ${bills.length} bills, ${purchases.length} purchases, ${invoices.length} invoices`);

    // Fetch database expenses without QB IDs (exclude time entries)
    console.log('🔍 Fetching database expenses without QB IDs...');
    const { data: dbExpenses, error: expensesError } = await adminSupabase
      .from('expenses')
      .select('id, expense_date, amount, payee_id')
      .is('quickbooks_transaction_id', null)
      .is('start_time', null)
      .is('end_time', null);

    if (expensesError) {
      throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
    }

    console.log(`📊 Found ${dbExpenses?.length || 0} expenses without QB IDs`);

    // Fetch payees for vendor names
    const payeeIds = [...new Set(dbExpenses?.map(e => e.payee_id).filter(Boolean) || [])];
    const { data: payees, error: payeesError } = await adminSupabase
      .from('payees')
      .select('id, payee_name')
      .in('id', payeeIds);

    if (payeesError) {
      throw new Error(`Failed to fetch payees: ${payeesError.message}`);
    }

    const payeeMap = new Map(payees?.map(p => [p.id, p.payee_name]) || []);

    // Fetch database revenues without QB IDs
    console.log('🔍 Fetching database revenues without QB IDs...');
    const { data: dbRevenues, error: revenuesError } = await adminSupabase
      .from('project_revenues')
      .select('id, invoice_date, amount, description')
      .is('quickbooks_transaction_id', null);

    if (revenuesError) {
      throw new Error(`Failed to fetch revenues: ${revenuesError.message}`);
    }

    console.log(`📊 Found ${dbRevenues?.length || 0} revenues without QB IDs`);

    // Build QB expense lookup map (date + amount + vendor)
    const qbExpenseMap = new Map<string, { qbId: string; vendor: string }>();
    const expenseTransactions = [...bills, ...purchases];
    
    for (const txn of expenseTransactions) {
      const type = bills.find(b => b.Id === txn.Id) ? 'Bill' : 'Purchase';
      const qbId = `${type}-${txn.Id}`;
      
      let vendorName = '';
      if (txn.EntityRef) vendorName = txn.EntityRef.name || '';
      else if (txn.VendorRef) vendorName = txn.VendorRef.name || '';
      
      if (vendorName) {
        const date = txn.TxnDate;
        const amount = txn.TotalAmt;
        const key = `${date}|${amount.toFixed(2)}`;
        
        // Store all with this key (might be multiple)
        if (!qbExpenseMap.has(key)) {
          qbExpenseMap.set(key, { qbId, vendor: vendorName });
        }
      }
    }

    // Build QB revenue lookup map (date + amount)
    const qbRevenueMap = new Map<string, { qbId: string; customer: string }>();
    
    for (const txn of invoices) {
      const qbId = `Invoice-${txn.Id}`;
      const customerName = txn.CustomerRef?.name || txn.EntityRef?.name || '';
      
      if (customerName) {
        const date = txn.TxnDate;
        const amount = txn.TotalAmt;
        const key = `${date}|${amount.toFixed(2)}`;
        
        if (!qbRevenueMap.has(key)) {
          qbRevenueMap.set(key, { qbId, customer: customerName });
        }
      }
    }

    // Match expenses
    const matchedExpenses: MatchedExpense[] = [];
    const expenseUpdates: Array<{ id: string; qbId: string }> = [];
    const errors: string[] = [];

    for (const expense of dbExpenses || []) {
      const date = expense.expense_date;
      const amount = expense.amount;
      const vendorName = payeeMap.get(expense.payee_id) || '';
      
      if (!vendorName) continue;
      
      const key = `${date}|${parseFloat(amount).toFixed(2)}`;
      const qbMatch = qbExpenseMap.get(key);
      
      if (qbMatch) {
        // Check vendor name similarity
        const similarity = similarityScore(vendorName, qbMatch.vendor);
        
        if (similarity >= 0.8) {
          const confidence = similarity === 1.0 ? 'exact' : 'fuzzy';
          
          matchedExpenses.push({
            dbId: expense.id,
            qbId: qbMatch.qbId,
            date,
            amount: parseFloat(amount),
            vendor: vendorName,
            confidence,
          });
          
          expenseUpdates.push({
            id: expense.id,
            qbId: qbMatch.qbId,
          });
        }
      }
    }

    // Match revenues
    const matchedRevenues: MatchedRevenue[] = [];
    const revenueUpdates: Array<{ id: string; qbId: string }> = [];

    for (const revenue of dbRevenues || []) {
      const date = revenue.invoice_date;
      const amount = revenue.amount;
      const customerName = revenue.description?.replace('QB Import: ', '') || '';
      
      if (!customerName) continue;
      
      const key = `${date}|${parseFloat(amount).toFixed(2)}`;
      const qbMatch = qbRevenueMap.get(key);
      
      if (qbMatch) {
        // Check customer name similarity
        const similarity = similarityScore(customerName, qbMatch.customer);
        
        if (similarity >= 0.8) {
          matchedRevenues.push({
            dbId: revenue.id,
            qbId: qbMatch.qbId,
            date,
            amount: parseFloat(amount),
            customer: customerName,
            confidence: 'exact',
          });
          
          revenueUpdates.push({
            id: revenue.id,
            qbId: qbMatch.qbId,
          });
        }
      }
    }

    console.log(`✅ Matched ${matchedExpenses.length} expenses, ${matchedRevenues.length} revenues`);

    let expensesUpdated = 0;
    let revenuesUpdated = 0;

    // Update database if not dry run
    if (!dryRun) {
      console.log('💾 Updating database...');
      
      // Update expenses
      for (const update of expenseUpdates) {
        const { error: updateError } = await adminSupabase
          .from('expenses')
          .update({ quickbooks_transaction_id: update.qbId })
          .eq('id', update.id);
        
        if (updateError) {
          errors.push(`Failed to update expense ${update.id}: ${updateError.message}`);
        } else {
          expensesUpdated++;
        }
      }
      
      // Update revenues
      for (const update of revenueUpdates) {
        const { error: updateError } = await adminSupabase
          .from('project_revenues')
          .update({ quickbooks_transaction_id: update.qbId })
          .eq('id', update.id);
        
        if (updateError) {
          errors.push(`Failed to update revenue ${update.id}: ${updateError.message}`);
        } else {
          revenuesUpdated++;
        }
      }
      
      console.log(`✅ Updated ${expensesUpdated} expenses, ${revenuesUpdated} revenues`);
    }

    const response: BackfillResponse = {
      success: true,
      dryRun,
      expensesMatched: matchedExpenses.length,
      revenuesMatched: matchedRevenues.length,
      expensesUpdated,
      revenuesUpdated,
      unmatchedExpenses: (dbExpenses?.length || 0) - matchedExpenses.length,
      unmatchedRevenues: (dbRevenues?.length || 0) - matchedRevenues.length,
      matches: {
        expenses: dryRun ? matchedExpenses.slice(0, 20) : [],
        revenues: dryRun ? matchedRevenues.slice(0, 20) : [],
      },
      errors,
      durationMs: Date.now() - startTime,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Backfill error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
