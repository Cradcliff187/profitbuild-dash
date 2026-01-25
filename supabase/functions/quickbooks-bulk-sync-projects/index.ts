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

interface BulkSyncRequest {
  projectIds?: string[];
  dryRun?: boolean;
}

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

async function syncSingleProject(
  project: any,
  accessToken: string,
  realmId: string,
  baseUrl: string,
  adminSupabase: any,
  dryRun: boolean
): Promise<{ success: boolean; projectId: string; projectNumber: string; qbJobId?: string; error?: string }>
{
  const startTime = Date.now();

  try {
    if (project.quickbooks_job_id && !dryRun) {
      return {
        success: true,
        projectId: project.id,
        projectNumber: project.project_number,
        qbJobId: project.quickbooks_job_id,
      };
    }

    const parentCustomerId = project.clients?.quickbooks_customer_id;

    if (!parentCustomerId) {
      return {
        success: false,
        projectId: project.id,
        projectNumber: project.project_number,
        error: 'Parent customer not synced',
      };
    }

    const customerPayload: any = {
      DisplayName: `${project.project_number} - ${project.project_name}`,
      CompanyName: project.project_name,
      Notes: `RCG Work Project ID: ${project.id}`,
      Active: project.status !== 'cancelled',
      Job: true,
      ParentRef: { value: parentCustomerId },
    };

    if (project.address) {
      customerPayload.BillAddr = {
        Line1: project.address.split('\n')[0] || project.address,
      };
    }

    Object.keys(customerPayload).forEach((key) =>
      customerPayload[key] === undefined && delete customerPayload[key]
    );

    if (dryRun) {
      return {
        success: true,
        projectId: project.id,
        projectNumber: project.project_number,
      };
    }

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
      const errorMessage = createResponseData?.Fault?.Error?.[0]?.Message || 'Failed to create project in QuickBooks';

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
          duration_ms: Date.now() - startTime,
          environment: getQuickBooksConfig().environment,
        });

      return {
        success: false,
        projectId: project.id,
        projectNumber: project.project_number,
        error: errorMessage,
      };
    }

    const customer = createResponseData.Customer;
    const qbJobId = customer.Id;

    await adminSupabase
      .from('projects')
      .update({
        quickbooks_job_id: qbJobId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    await adminSupabase
      .from('quickbooks_sync_log')
      .insert({
        entity_type: 'project',
        entity_id: project.id,
        sync_type: 'export',
        status: 'success',
        quickbooks_id: qbJobId,
        request_payload: customerPayload,
        response_payload: createResponseData,
        duration_ms: Date.now() - startTime,
        environment: getQuickBooksConfig().environment,
      });

    return {
      success: true,
      projectId: project.id,
      projectNumber: project.project_number,
      qbJobId: qbJobId,
    };
  } catch (error) {
    return {
      success: false,
      projectId: project.id,
      projectNumber: project.project_number,
      error: (error as Error).message,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const overallStartTime = Date.now();

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Service role key not configured in Edge Function environment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      if (token !== serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: 'Invalid service role key' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { projectIds, dryRun = false }: BulkSyncRequest = await req.json();

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    let projectsQuery = adminSupabase
      .from('projects')
      .select(`
        *,
        clients:client_id (
          id,
          client_name,
          quickbooks_customer_id
        )
      `)
      .order('project_number');

    if (projectIds && projectIds.length > 0) {
      projectsQuery = projectsQuery.in('id', projectIds);
    } else {
      projectsQuery = projectsQuery
        .is('quickbooks_job_id', null)
        .or('category.is.null,category.eq.construction');
    }

    const { data: projects, error: projectsError } = await projectsQuery;

    if (projectsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch projects', details: projectsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!projects || projects.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No projects to sync',
          summary: { total: 0, successful: 0, failed: 0, skipped: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (tokenExpiry < fiveMinutesFromNow) {
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
    }

    const realmId = connection.realm_id;
    const baseUrl = getQuickBooksApiBaseUrl(config.environment);

    const results = [] as Array<any>;
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];

      if (!project.clients?.quickbooks_customer_id) {
        skippedCount++;
        results.push({
          success: false,
          projectId: project.id,
          projectNumber: project.project_number,
          error: 'Parent customer not synced',
        });
        continue;
      }

      const result = await syncSingleProject(
        project,
        accessToken,
        realmId,
        baseUrl,
        adminSupabase,
        dryRun
      );

      results.push(result);

      if (result.success) {
        if (result.qbJobId) {
          successCount++;
        } else {
          skippedCount++;
        }
      } else {
        failCount++;
      }

      if (i < projects.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const summary = {
      total: projects.length,
      successful: successCount,
      failed: failCount,
      skipped: skippedCount,
      duration_ms: Date.now() - overallStartTime,
    };

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary,
        results: results.slice(0, 100),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
