import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  redirectUri: string;
}

interface BulkSyncRequest {
  clientIds?: string[]; // Optional: specific client IDs to sync, or sync all if not provided
  dryRun?: boolean;
}

// Inline QuickBooks utility functions
function getQuickBooksConfig(): QuickBooksConfig {
  return {
    clientId: Deno.env.get('QUICKBOOKS_CLIENT_ID') || '',
    clientSecret: Deno.env.get('QUICKBOOKS_CLIENT_SECRET') || '',
    environment: (Deno.env.get('QUICKBOOKS_ENVIRONMENT') as 'sandbox' | 'production') || 'sandbox',
    redirectUri: Deno.env.get('QUICKBOOKS_REDIRECT_URI') || '',
  };
}

function getQuickBooksApiBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';
}

async function refreshQuickBooksToken(refreshToken: string, config: QuickBooksConfig): Promise<any> {
  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  const auth = btoa(`${config.clientId}:${config.clientSecret}`);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh QuickBooks token');
  }

  return await response.json();
}

async function syncSingleClient(
  client: any,
  accessToken: string,
  realmId: string,
  baseUrl: string,
  adminSupabase: any,
  dryRun: boolean
): Promise<{ success: boolean; clientId: string; clientName: string; qbCustomerId?: string; error?: string }> {
  const startTime = Date.now();

  try {
    // Check if already synced
    if (client.quickbooks_customer_id && !dryRun) {
      return {
        success: true,
        clientId: client.id,
        clientName: client.client_name,
        qbCustomerId: client.quickbooks_customer_id,
      };
    }

    // Build QuickBooks Customer payload
    const customerPayload: any = {
      DisplayName: client.client_name,
      CompanyName: client.company_name || client.client_name,
      PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
      PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
      BillAddr: client.billing_address ? {
        Line1: client.billing_address.split('\n')[0] || client.billing_address,
      } : undefined,
      Notes: `RCG Work Client ID: ${client.id}`,
      Active: client.is_active !== false,
    };

    // Remove undefined fields
    Object.keys(customerPayload).forEach(key => 
      customerPayload[key] === undefined && delete customerPayload[key]
    );

    if (dryRun) {
      return {
        success: true,
        clientId: client.id,
        clientName: client.client_name,
      };
    }

    // Create Customer in QuickBooks
    const createUrl = `${baseUrl}/v3/company/${realmId}/customer`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(customerPayload),
    });

    const createResponseData = await createResponse.json();

    if (!createResponse.ok) {
      const errorMessage = createResponseData?.Fault?.Error?.[0]?.Message || 'Failed to create customer in QuickBooks';
      
      // Log the error
      await adminSupabase
        .from('quickbooks_sync_log')
        .insert({
          entity_type: 'client',
          entity_id: client.id,
          sync_type: 'export',
          status: 'failed',
          error_message: errorMessage,
          request_payload: customerPayload,
          response_payload: createResponseData,
          duration_ms: Date.now() - startTime,
          environment: getQuickBooksConfig().environment,
        });

      return {
        success: false,
        clientId: client.id,
        clientName: client.client_name,
        error: errorMessage,
      };
    }

    const customer = createResponseData.Customer;
    const qbCustomerId = customer.Id;

    // Update local database with QuickBooks Customer ID
    await adminSupabase
      .from('clients')
      .update({
        quickbooks_customer_id: qbCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id);

    // Log successful sync
    await adminSupabase
      .from('quickbooks_sync_log')
      .insert({
        entity_type: 'client',
        entity_id: client.id,
        sync_type: 'export',
        status: 'success',
        quickbooks_id: qbCustomerId,
        request_payload: customerPayload,
        response_payload: createResponseData,
        duration_ms: Date.now() - startTime,
        environment: getQuickBooksConfig().environment,
      });

    return {
      success: true,
      clientId: client.id,
      clientName: client.client_name,
      qbCustomerId: qbCustomerId,
    };
  } catch (error) {
    return {
      success: false,
      clientId: client.id,
      clientName: client.client_name,
      error: (error as Error).message,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const overallStartTime = Date.now();

  try {
    // Use service role key from environment (already configured in Edge Function secrets)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Service role key not configured in Edge Function environment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Optional: Verify Authorization header if provided (for additional security)
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      // Validate token matches service role key if provided
      if (token !== serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: 'Invalid service role key' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Parse request
    const { clientIds, dryRun = false }: BulkSyncRequest = await req.json();

    console.log(`🚀 Bulk QuickBooks customer sync started - DryRun: ${dryRun}, ClientIds: ${clientIds ? clientIds.length : 'all'}`);

    // Use service role for data operations
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    // Fetch clients to sync
    let clientsQuery = adminSupabase
      .from('clients')
      .select('*')
      .order('client_name');

    if (clientIds && clientIds.length > 0) {
      clientsQuery = clientsQuery.in('id', clientIds);
    } else {
      // Sync all clients without quickbooks_customer_id
      clientsQuery = clientsQuery.is('quickbooks_customer_id', null);
    }

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      console.error('❌ Clients query error:', clientsError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch clients',
          details: clientsError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No clients to sync',
          summary: {
            total: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${clients.length} clients to sync`);

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

    // Refresh token if expired
    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (tokenExpiry < fiveMinutesFromNow) {
      try {
        const newTokens = await refreshQuickBooksToken(connection.refresh_token, config);
        accessToken = newTokens.access_token;
        
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
    const baseUrl = getQuickBooksApiBaseUrl(config.environment);

    // Sync all clients
    const results = [];
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      console.log(`[${i + 1}/${clients.length}] Syncing: ${client.client_name}`);

      const result = await syncSingleClient(
        client,
        accessToken,
        realmId,
        baseUrl,
        adminSupabase,
        dryRun
      );

      results.push(result);

      if (result.success) {
        if (result.qbCustomerId) {
          successCount++;
        } else {
          skippedCount++;
        }
      } else {
        failCount++;
      }

      // Small delay to avoid rate limiting
      if (i < clients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const summary = {
      total: clients.length,
      successful: successCount,
      failed: failCount,
      skipped: skippedCount,
      duration_ms: Date.now() - overallStartTime,
    };

    console.log(`✅ Bulk sync complete: ${successCount} successful, ${failCount} failed, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary,
        results: results.slice(0, 100), // Limit results to first 100 for response size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
