/**
 * QuickBooks Receipt Sync Function - V17 Enhanced
 * 
 * Features:
 * - User-selected QuickBooks account (expense category)
 * - User-selected payment type (Cash, Check, CreditCard, DebitCard)
 * - Auto-find payment source account based on payment type
 * - Vendor ID mapping with fuzzy matching
 * - Custom field support for "Project/Wo#"
 * - Comprehensive error handling and logging
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ===== SHARED QUICKBOOKS UTILITIES (INLINED) =====

interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  x_refresh_token_expires_in: number;
}

interface QuickBooksConfig {
  client_id: string;
  client_secret: string;
  environment: 'sandbox' | 'production';
  redirect_uri: string;
}

function getQuickBooksConfig(): QuickBooksConfig {
  return {
    client_id: Deno.env.get('QUICKBOOKS_CLIENT_ID') || '',
    client_secret: Deno.env.get('QUICKBOOKS_CLIENT_SECRET') || '',
    environment: (Deno.env.get('QUICKBOOKS_ENVIRONMENT') || 'sandbox') as 'sandbox' | 'production',
    redirect_uri: Deno.env.get('QUICKBOOKS_REDIRECT_URI') || '',
  };
}

function getQuickBooksApiBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

function getQuickBooksTokenUrl(): string {
  return 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
}

async function refreshQuickBooksToken(
  refreshToken: string,
  config: QuickBooksConfig
): Promise<QuickBooksTokens> {
  const credentials = btoa(`${config.client_id}:${config.client_secret}`);
  
  const response = await fetch(getQuickBooksTokenUrl(), {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return await response.json();
}

// ===== END SHARED UTILITIES =====

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  receiptId: string;
  dryRun?: boolean;
  accountId?: string;      // User-selected expense account ID
  paymentType?: string;    // Cash, Check, CreditCard, DebitCard
}

// Normalize string for fuzzy matching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Calculate similarity between two strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(s1, s2);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance algorithm
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Find best matching vendor in QuickBooks
function findBestVendorMatch(payeeName: string, qbVendors: any[]): any | null {
  let bestMatch: any = null;
  let bestScore = 0;
  const threshold = 0.8; // 80% similarity required
  
  for (const vendor of qbVendors) {
    const score = calculateSimilarity(payeeName, vendor.DisplayName || '');
    
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = vendor;
    }
  }
  
  console.log(`🔍 Best vendor match for "${payeeName}": ${bestMatch?.DisplayName || 'none'} (score: ${bestScore})`);
  return bestMatch;
}

// Get custom field definition for "Project/Wo#"
async function getCustomFieldDefinition(
  fieldName: string,
  realmId: string,
  accessToken: string,
  config: QuickBooksConfig
): Promise<string | null> {
  console.log(`🔍 Looking for custom field: "${fieldName}"`);
  
  const baseUrl = getQuickBooksApiBaseUrl(config.environment);
  
  // Try multiple approaches to find the DefinitionId
  
  // Approach 1: Query Preferences for custom field definitions
  try {
    const prefUrl = `${baseUrl}/v3/company/${realmId}/preferences`;
    const prefResponse = await fetch(prefUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (prefResponse.ok) {
      const prefData = await prefResponse.json();
      console.log('📋 Preferences data retrieved');
      
      // Look for custom field definitions in preferences
      const customFields = prefData?.Preferences?.SalesFormsPrefs?.CustomField;
      if (customFields && Array.isArray(customFields)) {
        const field = customFields.find((f: any) => 
          f.Name?.toLowerCase() === fieldName.toLowerCase()
        );
        if (field?.CustomField?.[0]?.DefinitionId) {
          console.log(`✅ Found DefinitionId in Preferences: ${field.CustomField[0].DefinitionId}`);
          return field.CustomField[0].DefinitionId;
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Could not query Preferences:', error.message);
  }
  
  // Approach 2: Query recent Purchase transactions to find the field
  try {
    const queryUrl = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(
      "SELECT * FROM Purchase WHERE CustomField IS NOT NULL MAXRESULTS 10"
    )}`;
    
    const queryResponse = await fetch(queryUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (queryResponse.ok) {
      const queryData = await queryResponse.json();
      const purchases = queryData?.QueryResponse?.Purchase || [];
      
      console.log(`📦 Checking ${purchases.length} recent purchases for custom fields`);
      
      for (const purchase of purchases) {
        if (purchase.CustomField && Array.isArray(purchase.CustomField)) {
          const field = purchase.CustomField.find((f: any) => 
            f.Name?.toLowerCase() === fieldName.toLowerCase()
          );
          if (field?.DefinitionId) {
            console.log(`✅ Found DefinitionId in Purchase: ${field.DefinitionId}`);
            return field.DefinitionId;
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Could not query Purchases:', error.message);
  }
  
  // Approach 3: Try common fallback IDs (1, 2, 3)
  console.log('⚠️ Custom field not found in QB data, trying fallback IDs');
  return '1'; // Most common DefinitionId
}

// Sync vendor with QuickBooks (lookup or create)
async function syncVendorWithQuickBooks(
  receipt: any,
  payeeData: any,
  adminSupabase: any,
  realmId: string,
  accessToken: string,
  config: QuickBooksConfig
): Promise<{ value: string; name: string }> {
  const payeeName = payeeData?.payee_name || 'Unknown Vendor';
  const payeeId = receipt.payee_id;
  
  console.log(`🏢 Syncing vendor: "${payeeName}"`);
  
  // STEP 1: Check if we already have a QuickBooks vendor ID stored locally
  if (payeeData?.quickbooks_vendor_id) {
    console.log(`✅ Using cached QB vendor ID: ${payeeData.quickbooks_vendor_id}`);
    return {
      value: payeeData.quickbooks_vendor_id,
      name: payeeData.quickbooks_vendor_name || payeeName,
    };
  }
  
  // STEP 2: Query QuickBooks for existing vendors
  const baseUrl = getQuickBooksApiBaseUrl(config.environment);
  const queryUrl = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(
    `SELECT * FROM Vendor WHERE Active = true MAXRESULTS 1000`
  )}`;
  
  const vendorResponse = await fetch(queryUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  
  if (!vendorResponse.ok) {
    console.error('❌ Failed to query vendors from QuickBooks');
    // Fallback: use name only
    return { value: '', name: payeeName };
  }
  
  const vendorData = await vendorResponse.json();
  const qbVendors = vendorData?.QueryResponse?.Vendor || [];
  
  console.log(`📋 Found ${qbVendors.length} vendors in QuickBooks`);
  
  // STEP 3: Try fuzzy matching
  const bestMatch = findBestVendorMatch(payeeName, qbVendors);
  
  let qbVendor = bestMatch;
  
  // STEP 4: If no match, create new vendor in QuickBooks
  if (!qbVendor) {
    console.log(`➕ Creating new vendor in QuickBooks: "${payeeName}"`);
    
    const createVendorUrl = `${baseUrl}/v3/company/${realmId}/vendor`;
    const createVendorResponse = await fetch(createVendorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        DisplayName: payeeName,
        Active: true,
      }),
    });
    
    if (createVendorResponse.ok) {
      const createVendorData = await createVendorResponse.json();
      qbVendor = createVendorData.Vendor;
      console.log(`✅ Created vendor with ID: ${qbVendor.Id}`);
    } else {
      const errorData = await createVendorResponse.json();
      console.error('❌ Failed to create vendor:', errorData);
      // Fallback: use name only
      return { value: '', name: payeeName };
    }
  }
  
  // STEP 5: Update local payees table with QB details
  if (qbVendor && payeeId) {
    await adminSupabase
      .from('payees')
      .update({
        quickbooks_vendor_id: qbVendor.Id,
        quickbooks_vendor_name: qbVendor.DisplayName,
        quickbooks_synced_at: new Date().toISOString(),
        quickbooks_sync_status: 'synced',
      })
      .eq('id', payeeId);
    
    console.log(`💾 Updated local payee with QB vendor ID: ${qbVendor.Id}`);
  }
  
  return {
    value: qbVendor.Id,
    name: qbVendor.DisplayName,
  };
}

// Auto-find payment source account based on payment type
async function findPaymentSourceAccount(
  paymentType: string,
  realmId: string,
  accessToken: string,
  config: QuickBooksConfig
): Promise<{ value: string; name: string } | null> {
  const baseUrl = getQuickBooksApiBaseUrl(config.environment);
  
  // Map payment type to account type
  const accountTypeMap: Record<string, string> = {
    'CreditCard': 'Credit Card',
    'DebitCard': 'Bank',
    'Check': 'Bank',
    'Cash': 'Bank',
  };
  
  const accountType = accountTypeMap[paymentType] || 'Bank';
  
  console.log(`🔍 Finding ${accountType} account for payment type: ${paymentType}`);
  
  const queryUrl = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(
    `SELECT * FROM Account WHERE AccountType = '${accountType}' AND Active = true MAXRESULTS 100`
  )}`;
  
  const response = await fetch(queryUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error('❌ Failed to query accounts');
    return null;
  }
  
  const data = await response.json();
  const accounts = data?.QueryResponse?.Account || [];
  
  if (accounts.length === 0) {
    console.error(`❌ No ${accountType} accounts found`);
    return null;
  }
  
  // Prefer accounts with specific keywords
  const keywords = paymentType === 'CreditCard' 
    ? ['credit', 'card', 'visa', 'mastercard', 'amex']
    : ['checking', 'operating', 'main'];
  
  let selectedAccount = accounts.find((acc: any) =>
    keywords.some(keyword => acc.Name?.toLowerCase().includes(keyword))
  );
  
  // Fallback to first account
  if (!selectedAccount) {
    selectedAccount = accounts[0];
  }
  
  console.log(`✅ Selected payment account: ${selectedAccount.Name} (ID: ${selectedAccount.Id})`);
  
  return {
    value: selectedAccount.Id,
    name: selectedAccount.Name,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { receiptId, dryRun = false, accountId, paymentType = 'Cash' }: SyncRequest = await req.json();

    console.log(`🚀 QuickBooks sync started - Receipt: ${receiptId}, PaymentType: ${paymentType}, Account: ${accountId || 'auto'}`);

    if (!receiptId) {
      return new Response(
        JSON.stringify({ error: 'receiptId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRoles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check feature flag
    const { data: featureFlag } = await supabase
      .from('feature_flags')
      .select('enabled, config')
      .eq('flag_name', 'quickbooks_integration')
      .single();

    if (!featureFlag?.enabled) {
      return new Response(
        JSON.stringify({ error: 'QuickBooks integration is not enabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for data operations
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch receipt with related data (no profiles join - not needed for QB sync)
    const { data: receipt, error: receiptError } = await adminSupabase
      .from('receipts')
      .select(`
        *,
        projects:project_id (
          id,
          project_number,
          project_name,
          client_name
        ),
        payees:payee_id (
          id,
          payee_name,
          payee_type,
          quickbooks_vendor_id,
          quickbooks_vendor_name
        )
      `)
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      console.error('❌ Receipt query error:', receiptError);
      console.error('Receipt ID:', receiptId);
      console.error('Receipt data:', receipt);
      return new Response(
        JSON.stringify({ 
          error: 'Receipt not found',
          details: receiptError?.message || 'No receipt data returned',
          receiptId: receiptId
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate receipt is approved
    if (receipt.approval_status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Receipt must be approved before syncing to QuickBooks' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already synced
    if (receipt.quickbooks_transaction_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Receipt already synced to QuickBooks',
          quickbooks_transaction_id: receipt.quickbooks_transaction_id 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active QuickBooks connection
    const config = getQuickBooksConfig();
    const { data: connection, error: connectionError } = await adminSupabase
      .from('quickbooks_connections')
      .select('*')
      .eq('environment', config.environment)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active QuickBooks connection found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh token if expired (or close to expiring)
    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (tokenExpiry < fiveMinutesFromNow) {
      try {
        const newTokens = await refreshQuickBooksToken(connection.refresh_token, config);
        accessToken = newTokens.access_token;
        
        // Update stored tokens
        await adminSupabase
          .from('quickbooks_connections')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);
        
        console.log('🔄 Access token refreshed');
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        return new Response(
          JSON.stringify({ error: 'QuickBooks authentication expired. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const realmId = connection.realm_id;

    // Sync vendor with QuickBooks
    const vendorRef = await syncVendorWithQuickBooks(
      receipt,
      receipt.payees,
      adminSupabase,
      realmId,
      accessToken,
      config
    );

    // Find payment source account
    const paymentAccountRef = await findPaymentSourceAccount(
      paymentType,
      realmId,
      accessToken,
      config
    );

    if (!paymentAccountRef) {
      return new Response(
        JSON.stringify({ error: `Could not find a ${paymentType} account in QuickBooks` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get expense account details
    let expenseAccountRef: { value: string; name: string };
    
    if (accountId) {
      // User selected specific account - fetch details
      const baseUrl = getQuickBooksApiBaseUrl(config.environment);
      const accountUrl = `${baseUrl}/v3/company/${realmId}/account/${accountId}`;
      
      const accountResponse = await fetch(accountUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      
      if (!accountResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Selected account not found in QuickBooks' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const accountData = await accountResponse.json();
      expenseAccountRef = {
        value: accountData.Account.Id,
        name: accountData.Account.Name,
      };
      
      console.log(`✅ Using user-selected expense account: ${expenseAccountRef.name}`);
    } else {
      // Default to Cost of Goods Sold
      expenseAccountRef = { value: '', name: 'Cost of Goods Sold' };
      console.log('⚠️ No expense account selected, using default: Cost of Goods Sold');
    }

    // Get custom field definition for "Project/Wo#"
    const projectWoFieldId = await getCustomFieldDefinition(
      'Project/Wo#',
      realmId,
      accessToken,
      config
    );

    // Build QuickBooks Purchase payload
    const purchasePayload: any = {
      PaymentType: paymentType,
      AccountRef: {
        value: paymentAccountRef.value,
        name: paymentAccountRef.name,
      },
      TotalAmt: receipt.amount,
      TxnDate: receipt.captured_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      PrivateNote: `RCG Work Receipt ID: ${receipt.id}`,
      Line: [
        {
          Amount: receipt.amount,
          DetailType: 'AccountBasedExpenseLineDetail',
          AccountBasedExpenseLineDetail: {
            AccountRef: expenseAccountRef.value 
              ? { value: expenseAccountRef.value, name: expenseAccountRef.name }
              : { name: expenseAccountRef.name },
          },
          Description: receipt.description || `Receipt from ${receipt.payees?.payee_name || 'Unknown'}`,
        },
      ],
      Memo: receipt.projects 
        ? `${receipt.projects.project_number} - ${receipt.projects.project_name}`
        : 'Unassigned Project',
    };

    // Add vendor if we have vendor info
    if (vendorRef.value) {
      purchasePayload.EntityRef = {
        value: vendorRef.value,
        name: vendorRef.name,
        type: 'Vendor',
      };
    } else if (vendorRef.name) {
      purchasePayload.EntityRef = {
        name: vendorRef.name,
        type: 'Vendor',
      };
    }

    // Add custom field for Project/Wo#
    if (projectWoFieldId && receipt.projects?.project_number) {
      purchasePayload.CustomField = [
        {
          DefinitionId: projectWoFieldId,
          Name: 'Project/Wo#',
          Type: 'StringType',
          StringValue: receipt.projects.project_number,
        },
      ];
      console.log(`📝 Added custom field "Project/Wo#": ${receipt.projects.project_number}`);
    }

    // If dry run, return the payload without sending + fetch all available accounts
    if (dryRun) {
      console.log('🔍 DRY RUN - Payload preview');
      
      // Fetch all active accounts from QuickBooks for the dropdown
      // Don't filter by type - let all expense-related accounts through
      const baseUrl = getQuickBooksApiBaseUrl(config.environment);
      const accountsQuery = `SELECT * FROM Account WHERE Active = true MAXRESULTS 1000`;
      const accountsUrl = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(accountsQuery)}`;
      
      let availableAccounts: any[] = [];
      
      try {
        console.log('🔍 Querying QuickBooks accounts with query:', accountsQuery);
        const accountsResponse = await fetch(accountsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
        
        console.log('📥 QuickBooks accounts response status:', accountsResponse.status);
        
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          console.log('📦 Raw QB response:', JSON.stringify(accountsData, null, 2));
          const qbAccounts = accountsData?.QueryResponse?.Account || [];
          
          console.log(`📊 Found ${qbAccounts.length} total accounts in QB response`);
          
          // Filter to expense-related accounts (more flexible than QuickBooks query language)
          const expenseAccounts = qbAccounts.filter((acc: any) => {
            const type = acc.AccountType || '';
            const subType = acc.AccountSubType || '';
            // Include Expense, COGS, Other Expense, and common expense sub-types
            return type.includes('Expense') || 
                   type.includes('Cost of Goods Sold') ||
                   subType.includes('Expense') ||
                   subType.includes('Cost') ||
                   type === 'Expense' ||
                   type === 'Other Expense' ||
                   type === 'Cost of Goods Sold';
          });
          
          console.log(`🔍 Filtered to ${expenseAccounts.length} expense accounts`);
          
          // Format accounts for frontend dropdown
          availableAccounts = expenseAccounts.map((acc: any) => ({
            id: acc.Id,
            name: acc.Name,
            type: acc.AccountType,
            subType: acc.AccountSubType || null,
            subAccount: !!acc.ParentRef,
            parentName: acc.ParentRef?.name || null,
          }));
          
          console.log(`✅ Fetched ${availableAccounts.length} expense accounts from QuickBooks`);
        } else {
          const errorBody = await accountsResponse.text();
          console.error('❌ Failed to fetch accounts from QuickBooks:', accountsResponse.status, errorBody);
        }
      } catch (error) {
        console.error('❌ Error fetching accounts:', error);
      }
      
      return new Response(
        JSON.stringify({ 
          dryRun: true,
          payload: purchasePayload,
          availableAccounts: availableAccounts,
          selectedAccount: expenseAccountRef,
          projectNumber: receipt.projects?.project_number || null,
          receipt: {
            id: receipt.id,
            amount: receipt.amount,
            payee: receipt.payees?.payee_name,
            project: receipt.projects?.project_name,
            date: receipt.captured_at,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark receipt as pending sync
    await adminSupabase
      .from('receipts')
      .update({
        quickbooks_sync_status: 'pending',
        quickbooks_request_payload: purchasePayload,
      })
      .eq('id', receiptId);

    // Send to QuickBooks
    const apiUrl = `${getQuickBooksApiBaseUrl(config.environment)}/v3/company/${realmId}/purchase`;
    
    console.log(`📤 Sending to QuickBooks: ${apiUrl}`);
    
    const qbResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(purchasePayload),
    });

    const duration = Date.now() - startTime;
    const responseBody = await qbResponse.json();

    console.log(`📥 QuickBooks response (${qbResponse.status}):`, JSON.stringify(responseBody, null, 2));

    // Log the sync attempt
    await adminSupabase
      .from('quickbooks_sync_log')
      .insert({
        entity_type: 'receipt',
        entity_id: receiptId,
        sync_type: 'export',
        status: qbResponse.ok ? 'success' : 'failed',
        quickbooks_id: responseBody.Purchase?.Id || null,
        request_payload: purchasePayload,
        response_payload: responseBody,
        error_message: qbResponse.ok ? null : JSON.stringify(responseBody),
        initiated_by: user.id,
        duration_ms: duration,
        environment: config.environment,
      });

    if (!qbResponse.ok) {
      // Extract error message
      const errorMessage = responseBody?.Fault?.Error?.[0]?.Message || 
                          responseBody?.Fault?.Error?.[0]?.Detail ||
                          'QuickBooks API error';
      
      console.error('❌ QuickBooks sync failed:', errorMessage);
      
      // Update receipt with failure
      await adminSupabase
        .from('receipts')
        .update({
          quickbooks_sync_status: 'failed',
          quickbooks_error_message: errorMessage,
          quickbooks_response_payload: responseBody,
        })
        .eq('id', receiptId);

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: responseBody 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update receipt with success
    await adminSupabase
      .from('receipts')
      .update({
        quickbooks_transaction_id: responseBody.Purchase.Id,
        quickbooks_sync_status: 'success',
        quickbooks_synced_at: new Date().toISOString(),
        quickbooks_synced_by: user.id,
        quickbooks_response_payload: responseBody,
        quickbooks_error_message: null,
      })
      .eq('id', receiptId);

    console.log(`✅ Successfully synced to QuickBooks - Transaction ID: ${responseBody.Purchase.Id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Receipt synced to QuickBooks successfully',
        quickbooks_transaction_id: responseBody.Purchase.Id,
        purchase: responseBody.Purchase,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 QuickBooks sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
