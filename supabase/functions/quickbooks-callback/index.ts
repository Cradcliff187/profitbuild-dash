/**
 * QuickBooks OAuth Callback Handler
 * 
 * Handles the callback from Intuit after user authorizes the connection.
 * Exchanges auth code for tokens and stores them.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  getQuickBooksConfig,
  getQuickBooksApiBaseUrl,
  exchangeCodeForTokens 
} from '../_shared/quickbooks.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const realmId = url.searchParams.get('realmId');
    const error = url.searchParams.get('error');

    // Handle error from QuickBooks
    if (error) {
      const errorDescription = url.searchParams.get('error_description') || 'Unknown error';
      return new Response(
        `<html><body><h1>Connection Failed</h1><p>${errorDescription}</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state || !realmId) {
      return new Response(
        '<html><body><h1>Invalid Request</h1><p>Missing required parameters.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Create admin client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify state to prevent CSRF
    const { data: oauthState, error: stateError } = await supabase
      .from('quickbooks_oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .single();

    if (stateError || !oauthState) {
      return new Response(
        '<html><body><h1>Invalid State</h1><p>OAuth state verification failed.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Check if state expired
    if (new Date(oauthState.expires_at) < new Date()) {
      return new Response(
        '<html><body><h1>Expired</h1><p>OAuth state has expired. Please try again.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Delete used state
    await supabase
      .from('quickbooks_oauth_states')
      .delete()
      .eq('state', state);

    // Exchange code for tokens
    const config = getQuickBooksConfig();
    const tokens = await exchangeCodeForTokens(code, config);

    // Get company info from QuickBooks
    const companyInfoUrl = `${getQuickBooksApiBaseUrl(config.environment)}/v3/company/${realmId}/companyinfo/${realmId}`;
    const companyResponse = await fetch(companyInfoUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
      },
    });

    let companyName = 'Unknown Company';
    if (companyResponse.ok) {
      const companyData = await companyResponse.json();
      companyName = companyData.CompanyInfo?.CompanyName || 'Unknown Company';
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store connection in database
    const { error: upsertError } = await supabase
      .from('quickbooks_connections')
      .upsert({
        realm_id: realmId,
        company_name: companyName,
        environment: config.environment,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        is_active: true,
        connected_by: oauthState.user_id,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'realm_id',
      });

    if (upsertError) {
      console.error('Failed to store connection:', upsertError);
      return new Response(
        '<html><body><h1>Storage Error</h1><p>Failed to store connection.</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Log successful connection
    await supabase
      .from('quickbooks_sync_log')
      .insert({
        entity_type: 'connection',
        entity_id: realmId,
        sync_type: 'export',
        status: 'success',
        quickbooks_id: realmId,
        initiated_by: oauthState.user_id,
        environment: config.environment,
      });

    // Return success page that closes the popup
    return new Response(
      `<html>
        <body>
          <h1>Connected Successfully!</h1>
          <p>Connected to: ${companyName}</p>
          <p>This window will close automatically...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'quickbooks_connected', realmId: '${realmId}', companyName: '${companyName}' }, '*');
            }
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('QuickBooks callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      `<html><body><h1>Error</h1><p>${errorMessage}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
});
