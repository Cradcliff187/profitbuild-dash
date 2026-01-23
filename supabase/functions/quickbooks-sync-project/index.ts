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

interface SyncRequest {
  projectId: string;
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
    const { projectId, dryRun = false }: SyncRequest = await req.json();

    console.log(`🚀 QuickBooks project sync started - Project: ${projectId}, DryRun: ${dryRun}`);

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
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

    // Fetch project data with client info
    const { data: project, error: projectError } = await adminSupabase
      .from('projects')
      .select(`
        *,
        clients:client_id (
          id,
          client_name,
          quickbooks_customer_id
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('❌ Project query error:', projectError);
      return new Response(
        JSON.stringify({ 
          error: 'Project not found',
          details: projectError?.message || 'No project data returned'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already synced
    if (project.quickbooks_job_id && !dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Project already synced to QuickBooks',
          quickbooks_job_id: project.quickbooks_job_id,
          project_number: project.project_number
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
    const baseUrl = getQuickBooksApiBaseUrl(config.environment);

    // Check if parent customer exists (and sync if needed)
    let parentCustomerId = project.clients?.quickbooks_customer_id;

    if (!parentCustomerId && project.client_id) {
      // Parent customer not synced yet - need to sync it first
      return new Response(
        JSON.stringify({ 
          error: 'Parent customer not synced',
          message: 'Please sync the client to QuickBooks first before syncing the project',
          client_id: project.client_id,
          client_name: project.clients?.client_name
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build QuickBooks Customer payload (sub-customer)
    const customerPayload: any = {
      DisplayName: `${project.project_number} - ${project.project_name}`,
      CompanyName: project.project_name,
      Notes: `RCG Work Project ID: ${project.id}`,
      Active: project.status !== 'cancelled',
      Job: true,
    };

    // Add ParentRef if we have a parent customer
    if (parentCustomerId) {
      customerPayload.ParentRef = {
        value: parentCustomerId,
      };
    }

    // Add billing address if available
    if (project.address) {
      customerPayload.BillAddr = {
        Line1: project.address.split('\n')[0] || project.address,
      };
    }

    // Remove undefined fields
    Object.keys(customerPayload).forEach(key => 
      customerPayload[key] === undefined && delete customerPayload[key]
    );

    // If dry run, return the payload without sending
    if (dryRun) {
      console.log('🔍 DRY RUN - Project (sub-customer) payload preview');
      return new Response(
        JSON.stringify({ 
          dryRun: true,
          payload: customerPayload,
          project: {
            id: project.id,
            number: project.project_number,
            name: project.project_name,
            parent_customer_id: parentCustomerId,
            parent_customer_name: project.clients?.client_name,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Sub-Customer (Project) in QuickBooks
    const createUrl = `${baseUrl}/v3/company/${realmId}/customer`;

    console.log(`📤 Creating project as sub-customer in QuickBooks: ${project.project_number}`);

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
      const errorMessage = createResponseData?.Fault?.Error?.[0]?.Message || 'Failed to create project in QuickBooks';
      console.error('❌ QuickBooks project creation failed:', createResponseData);
      
      // Log the error
      await adminSupabase
        .from('quickbooks_sync_log')
        .insert({
          entity_type: 'project',
          entity_id: project.id,
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
    console.log(`✅ Project created as sub-customer in QuickBooks: ${customer.DisplayName} (ID: ${customer.Id})`);

    // Update local database with QuickBooks Job ID (sub-customer ID)
    await adminSupabase
      .from('projects')
      .update({
        quickbooks_job_id: customer.Id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    // Log successful sync
    await adminSupabase
      .from('quickbooks_sync_log')
      .insert({
        entity_type: 'project',
        entity_id: project.id,
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
        quickbooks_job_id: customer.Id,
        customer_name: customer.DisplayName,
        parent_customer_id: parentCustomerId,
        project: {
          id: project.id,
          number: project.project_number,
          name: project.project_name,
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
