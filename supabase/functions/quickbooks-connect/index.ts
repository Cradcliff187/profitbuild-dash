/**
 * QuickBooks OAuth Connection Initiation
 * 
 * Generates the OAuth URL for connecting to QuickBooks.
 * User is redirected to Intuit to authorize the connection.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// QuickBooks shared utilities (inlined for deployment)
interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  redirectUri: string;
}

function getQuickBooksConfig(): QuickBooksConfig {
  return {
    clientId: Deno.env.get('QUICKBOOKS_CLIENT_ID') || '',
    clientSecret: Deno.env.get('QUICKBOOKS_CLIENT_SECRET') || '',
    environment: (Deno.env.get('QUICKBOOKS_ENVIRONMENT') || 'sandbox') as 'sandbox' | 'production',
    redirectUri: Deno.env.get('QUICKBOOKS_REDIRECT_URI') || '',
  };
}

function getQuickBooksAuthBaseUrl(): string {
  return 'https://appcenter.intuit.com/connect/oauth2';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('QuickBooks connect called');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    // Verify user is authenticated and is admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader || '' },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User:', user?.id, 'Auth error:', authError?.message);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    console.log('User roles:', userRoles, 'Roles error:', rolesError?.message);

    if (!userRoles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check feature flag
    const { data: featureFlag, error: flagError } = await supabase
      .from('feature_flags')
      .select('enabled, config')
      .eq('flag_name', 'quickbooks_integration')
      .maybeSingle();
    
    console.log('Feature flag:', featureFlag, 'Flag error:', flagError?.message);

    if (!featureFlag?.enabled) {
      return new Response(
        JSON.stringify({ error: 'QuickBooks integration is not enabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate OAuth URL
    const config = getQuickBooksConfig();
    console.log('QB Config loaded. Client ID present:', !!config.clientId, 'Redirect URI:', config.redirectUri);
    
    const state = crypto.randomUUID(); // For CSRF protection
    console.log('Generated state:', state);
    
    // Store state in database for verification during callback
    console.log('Attempting to store OAuth state for user:', user.id);
    const { data: upsertData, error: stateError } = await supabase
      .from('quickbooks_oauth_states')
      .upsert({
        state,
        user_id: user.id,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      })
      .select();

    console.log('Upsert result:', upsertData, 'Error:', stateError?.message, 'Error code:', stateError?.code);

    if (stateError) {
      console.error('Failed to store OAuth state:', JSON.stringify(stateError));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store OAuth state', 
          details: stateError.message,
          code: stateError.code 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUrl = new URL(getQuickBooksAuthBaseUrl());
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('state', state);

    console.log('Returning auth URL');
    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('QuickBooks connect error:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
