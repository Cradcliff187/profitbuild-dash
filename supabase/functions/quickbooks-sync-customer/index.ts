import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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

interface SyncRequest {
  clientId: string;
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { clientId, dryRun = false }: SyncRequest = await req.json();

    console.log(`🚀 QuickBooks customer sync started - Client: ${clientId}, DryRun: ${dryRun}`);

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'clientId is required' }),
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

    // Fetch client data
    const { data: client, error: clientError } = await adminSupabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('❌ Client query error:', clientError);
      return new Response(
        JSON.stringify({ 
          error: 'Client not found',
          details: clientError?.message || 'No client data returned'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already synced
    if (client.quickbooks_customer_id && !dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Client already synced to QuickBooks',
          quickbooks_customer_id: client.quickbooks_customer_id,
          client_name: client.client_name
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // If dry run, return the payload without sending
    if (dryRun) {
      console.log('🔍 DRY RUN - Customer payload preview');
      return new Response(
        JSON.stringify({ 
          dryRun: true,
          payload: customerPayload,
          client: {
            id: client.id,
            name: client.client_name,
            company: client.company_name,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Customer in QuickBooks
    const baseUrl = getQuickBooksApiBaseUrl(config.environment);
    const createUrl = `${baseUrl}/v3/company/${realmId}/customer`;

    console.log(`📤 Creating customer in QuickBooks: ${client.client_name}`);

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
      console.error('❌ QuickBooks customer creation failed:', createResponseData);
      
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
          initiated_by: user.id,
          duration_ms: Date.now() - startTime,
          environment: config.environment,
        });

      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          details: createResponseData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer = createResponseData.Customer;
    console.log(`✅ Customer created in QuickBooks: ${customer.DisplayName} (ID: ${customer.Id})`);

    // Update local database with QuickBooks Customer ID
    await adminSupabase
      .from('clients')
      .update({
        quickbooks_customer_id: customer.Id,
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
        quickbooks_id: customer.Id,
        request_payload: customerPayload,
        response_payload: createResponseData,
        initiated_by: user.id,
        duration_ms: Date.now() - startTime,
        environment: config.environment,
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        quickbooks_customer_id: customer.Id,
        customer_name: customer.DisplayName,
        client: {
          id: client.id,
          name: client.client_name,
        },
        duration_ms: Date.now() - startTime,
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
