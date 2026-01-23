# QuickBooks Integration Implementation Spec

## Project: RCG Work - QuickBooks Online Integration

**Version:** 1.0
**Date:** January 12, 2026
**Status:** Ready for Implementation

---

## Executive Summary

This document provides complete implementation instructions for integrating QuickBooks Online with the RCG Work construction management application. The integration allows approved receipts to be sent to QuickBooks as expenses/bills with full audit trail and safety controls.

### Key Principles
1. **Feature-flagged** - All QuickBooks features gated behind feature flags
2. **Sandbox first** - Test in sandbox before production
3. **Manual trigger only** - No auto-sync; user must explicitly send each item
4. **Confirmation required** - User confirms before every sync action
5. **Full audit trail** - Every sync attempt logged with complete payloads

---

## QuickBooks Credentials (Sandbox)

```
Client ID:      ABI3ODzfO41PDVRdWt4L7lV8IRxankvubtWzjpLK03vEnrkAMv
Client Secret:  4XjP42ozAYbAEQ2UihNxyQVA8u4Efh2Uv3ltIvmu
Realm ID:       9341456092071018
App ID:         a2e2c675-1529-4ba5-99f8-b82d7a6353ed
Environment:    Sandbox
```

**Note:** These are SANDBOX credentials. Production credentials will be different.

---

## Phase 1: Database Infrastructure

### 1.1 Feature Flags Table

Create migration: `supabase/migrations/[timestamp]_create_feature_flags.sql`

```sql
-- ============================================================================
-- Feature Flags Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Create index for fast lookups
CREATE INDEX idx_feature_flags_name ON feature_flags(flag_name);

-- Insert QuickBooks feature flag (DISABLED by default)
INSERT INTO feature_flags (flag_name, enabled, description, config) VALUES (
  'quickbooks_integration',
  false,
  'Enable QuickBooks Online integration for syncing receipts and expenses',
  '{
    "environment": "sandbox",
    "allowConnection": true,
    "allowReceiptSync": true,
    "allowExpenseSync": false,
    "requireConfirmation": true,
    "showDryRunPreview": true,
    "allowedUserIds": []
  }'::jsonb
) ON CONFLICT (flag_name) DO NOTHING;

-- RLS Policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read feature flags
CREATE POLICY "feature_flags_read_policy" ON feature_flags
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can update feature flags
CREATE POLICY "feature_flags_update_policy" ON feature_flags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();
```

### 1.2 QuickBooks Connection Table

Create migration: `supabase/migrations/[timestamp]_create_quickbooks_connection.sql`

```sql
-- ============================================================================
-- QuickBooks Connection Table
-- Stores OAuth tokens and connection state per company
-- ============================================================================

CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Connection identity
  realm_id TEXT UNIQUE NOT NULL,  -- QuickBooks Company ID
  company_name TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox', -- 'sandbox' or 'production'
  
  -- OAuth tokens (encrypted at rest by Supabase)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Connection state
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Audit fields
  connected_by UUID REFERENCES profiles(id),
  connected_at TIMESTAMPTZ DEFAULT now(),
  disconnected_at TIMESTAMPTZ,
  disconnected_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_qb_connections_realm ON quickbooks_connections(realm_id);
CREATE INDEX idx_qb_connections_active ON quickbooks_connections(is_active);
CREATE INDEX idx_qb_connections_environment ON quickbooks_connections(environment);

-- RLS Policies
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage connections
CREATE POLICY "qb_connections_admin_only" ON quickbooks_connections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Update trigger
CREATE TRIGGER quickbooks_connections_updated_at
  BEFORE UPDATE ON quickbooks_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();
```

### 1.3 Add QuickBooks Fields to Receipts Table

Create migration: `supabase/migrations/[timestamp]_add_quickbooks_to_receipts.sql`

```sql
-- ============================================================================
-- Add QuickBooks sync fields to receipts table
-- ============================================================================

-- Add columns for QuickBooks sync tracking
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS quickbooks_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS quickbooks_sync_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quickbooks_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS quickbooks_synced_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS quickbooks_error_message TEXT,
ADD COLUMN IF NOT EXISTS quickbooks_request_payload JSONB,
ADD COLUMN IF NOT EXISTS quickbooks_response_payload JSONB;

-- Add constraint for sync status values
ALTER TABLE receipts 
ADD CONSTRAINT receipts_qb_sync_status_check 
CHECK (quickbooks_sync_status IN (NULL, 'pending', 'success', 'failed', 'skipped'));

-- Index for finding unsynced approved receipts
CREATE INDEX IF NOT EXISTS idx_receipts_qb_sync_status 
ON receipts(quickbooks_sync_status) 
WHERE approval_status = 'approved';

-- Index for QuickBooks transaction lookup
CREATE INDEX IF NOT EXISTS idx_receipts_qb_transaction_id 
ON receipts(quickbooks_transaction_id) 
WHERE quickbooks_transaction_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN receipts.quickbooks_sync_status IS 
'QuickBooks sync status: NULL (not attempted), pending, success, failed, skipped';
```

### 1.4 Enhanced QuickBooks Sync Log

Create migration: `supabase/migrations/[timestamp]_enhance_quickbooks_sync_log.sql`

```sql
-- ============================================================================
-- Enhance QuickBooks Sync Log for detailed audit trail
-- ============================================================================

-- Add columns if they don't exist (table already exists in schema)
ALTER TABLE quickbooks_sync_log
ADD COLUMN IF NOT EXISTS request_payload JSONB,
ADD COLUMN IF NOT EXISTS response_payload JSONB,
ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'sandbox';

-- Index for querying by entity
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_entity 
ON quickbooks_sync_log(entity_type, entity_id);

-- Index for querying by status and date
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_status_date 
ON quickbooks_sync_log(status, created_at DESC);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_user 
ON quickbooks_sync_log(initiated_by);
```

---

## Phase 2: Supabase Secrets Configuration

### 2.1 Add Secrets via Supabase Dashboard

Go to your Supabase project → Settings → Edge Functions → Secrets

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `QUICKBOOKS_CLIENT_ID` | `ABI3ODzfO41PDVRdWt4L7lV8IRxankvubtWzjpLK03vEnrkAMv` |
| `QUICKBOOKS_CLIENT_SECRET` | `4XjP42ozAYbAEQ2UihNxyQVA8u4Efh2Uv3ltIvmu` |
| `QUICKBOOKS_ENVIRONMENT` | `sandbox` |
| `QUICKBOOKS_REDIRECT_URI` | `https://[YOUR-PROJECT].supabase.co/functions/v1/quickbooks-callback` |

**Replace `[YOUR-PROJECT]` with your actual Supabase project ID.**

### 2.2 Alternative: Add via CLI

```bash
supabase secrets set QUICKBOOKS_CLIENT_ID=ABI3ODzfO41PDVRdWt4L7lV8IRxankvubtWzjpLK03vEnrkAMv
supabase secrets set QUICKBOOKS_CLIENT_SECRET=4XjP42ozAYbAEQ2UihNxyQVA8u4Efh2Uv3ltIvmu
supabase secrets set QUICKBOOKS_ENVIRONMENT=sandbox
supabase secrets set QUICKBOOKS_REDIRECT_URI=https://[YOUR-PROJECT].supabase.co/functions/v1/quickbooks-callback
```

---

## Phase 3: Edge Functions

### 3.1 Shared QuickBooks Utilities

Create file: `supabase/functions/_shared/quickbooks.ts`

```typescript
/**
 * Shared QuickBooks utilities for Edge Functions
 */

export interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  x_refresh_token_expires_in: number;
}

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  redirectUri: string;
}

export function getQuickBooksConfig(): QuickBooksConfig {
  return {
    clientId: Deno.env.get('QUICKBOOKS_CLIENT_ID') || '',
    clientSecret: Deno.env.get('QUICKBOOKS_CLIENT_SECRET') || '',
    environment: (Deno.env.get('QUICKBOOKS_ENVIRONMENT') || 'sandbox') as 'sandbox' | 'production',
    redirectUri: Deno.env.get('QUICKBOOKS_REDIRECT_URI') || '',
  };
}

export function getQuickBooksApiBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

export function getQuickBooksAuthBaseUrl(): string {
  return 'https://appcenter.intuit.com/connect/oauth2';
}

export function getQuickBooksTokenUrl(): string {
  return 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
}

/**
 * Refresh QuickBooks access token using refresh token
 */
export async function refreshQuickBooksToken(
  refreshToken: string,
  config: QuickBooksConfig
): Promise<QuickBooksTokens> {
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  
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

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  authCode: string,
  config: QuickBooksConfig
): Promise<QuickBooksTokens> {
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  
  const response = await fetch(getQuickBooksTokenUrl(), {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Map RCG Work expense category to QuickBooks account
 */
export function mapCategoryToQuickBooksAccount(category: string): string {
  const categoryMap: Record<string, string> = {
    'materials': 'Job Materials',
    'labor_internal': 'Labor',
    'subcontractors': 'Subcontractors',
    'equipment': 'Equipment Rental',
    'permits': 'Permits & Fees',
    'management': 'Management',
    'office_expenses': 'Office Expenses',
    'vehicle_expenses': 'Auto',
    'gas': 'Auto:Fuel',
    'meals': 'Meals and Entertainment',
    'tools': 'Tools and Small Equipment',
    'software': 'Software',
    'vehicle_maintenance': 'Auto:Repair and Maintenance',
    'other': 'Miscellaneous',
  };
  
  return categoryMap[category] || 'Miscellaneous';
}
```

### 3.2 OAuth Initiation Function

Create file: `supabase/functions/quickbooks-connect/index.ts`

```typescript
/**
 * QuickBooks OAuth Connection Initiation
 * 
 * Generates the OAuth URL for connecting to QuickBooks.
 * User is redirected to Intuit to authorize the connection.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  getQuickBooksConfig, 
  getQuickBooksAuthBaseUrl 
} from '../_shared/quickbooks.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated and is admin
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

    // Check if user is admin
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

    // Generate OAuth URL
    const config = getQuickBooksConfig();
    const state = crypto.randomUUID(); // For CSRF protection
    
    // Store state in database for verification during callback
    await supabase
      .from('quickbooks_oauth_states')
      .upsert({
        state,
        user_id: user.id,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    const authUrl = new URL(getQuickBooksAuthBaseUrl());
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('state', state);

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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.3 OAuth Callback Function

Create file: `supabase/functions/quickbooks-callback/index.ts`

```typescript
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
    return new Response(
      `<html><body><h1>Error</h1><p>${error.message}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
});
```

### 3.4 Receipt Sync Function

Create file: `supabase/functions/quickbooks-sync-receipt/index.ts`

```typescript
/**
 * QuickBooks Receipt Sync Function
 * 
 * Syncs an approved receipt to QuickBooks as a Purchase/Expense.
 * Requires explicit user action - no auto-sync.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  getQuickBooksConfig,
  getQuickBooksApiBaseUrl,
  refreshQuickBooksToken,
  mapCategoryToQuickBooksAccount
} from '../_shared/quickbooks.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  receiptId: string;
  dryRun?: boolean;  // If true, just return what WOULD be sent
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { receiptId, dryRun = false }: SyncRequest = await req.json();

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

    // Fetch receipt with related data
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
          payee_type
        ),
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      return new Response(
        JSON.stringify({ error: 'Receipt not found' }),
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
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return new Response(
          JSON.stringify({ error: 'QuickBooks authentication expired. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Build QuickBooks Purchase payload
    const purchasePayload = {
      PaymentType: 'Cash',  // Can be: Cash, Check, CreditCard
      TotalAmt: receipt.amount,
      TxnDate: receipt.captured_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      PrivateNote: `RCG Work Receipt ID: ${receipt.id}`,
      Line: [
        {
          Amount: receipt.amount,
          DetailType: 'AccountBasedExpenseLineDetail',
          AccountBasedExpenseLineDetail: {
            AccountRef: {
              name: mapCategoryToQuickBooksAccount('materials'), // Default to materials, can be enhanced
            },
          },
          Description: receipt.description || `Receipt from ${receipt.payees?.payee_name || 'Unknown'}`,
        },
      ],
      // Add vendor if we have payee info
      ...(receipt.payees?.payee_name && {
        EntityRef: {
          name: receipt.payees.payee_name,
          type: 'Vendor',
        },
      }),
      // Add memo with project info
      Memo: receipt.projects 
        ? `${receipt.projects.project_number} - ${receipt.projects.project_name}`
        : 'Unassigned Project',
    };

    // If dry run, return the payload without sending
    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          dryRun: true,
          payload: purchasePayload,
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
    const apiUrl = `${getQuickBooksApiBaseUrl(config.environment)}/v3/company/${connection.realm_id}/purchase`;
    
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
      // Update receipt with failure
      await adminSupabase
        .from('receipts')
        .update({
          quickbooks_sync_status: 'failed',
          quickbooks_error_message: JSON.stringify(responseBody),
          quickbooks_response_payload: responseBody,
        })
        .eq('id', receiptId);

      return new Response(
        JSON.stringify({ 
          error: 'QuickBooks API error',
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

    return new Response(
      JSON.stringify({ 
        success: true,
        quickbooks_transaction_id: responseBody.Purchase.Id,
        purchase: responseBody.Purchase,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('QuickBooks sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.5 OAuth State Table Migration

Create migration: `supabase/migrations/[timestamp]_create_quickbooks_oauth_states.sql`

```sql
-- ============================================================================
-- OAuth State Table for CSRF Protection
-- ============================================================================

CREATE TABLE IF NOT EXISTS quickbooks_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cleanup
CREATE INDEX idx_qb_oauth_states_expires ON quickbooks_oauth_states(expires_at);

-- RLS - Service role only
ALTER TABLE quickbooks_oauth_states ENABLE ROW LEVEL SECURITY;

-- Cleanup function for expired states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM quickbooks_oauth_states WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 4: Frontend Components

### 4.1 Feature Flag Hook

Create file: `src/hooks/useFeatureFlag.ts`

```typescript
/**
 * Hook for checking feature flags
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlagConfig {
  environment?: 'sandbox' | 'production';
  allowConnection?: boolean;
  allowReceiptSync?: boolean;
  allowExpenseSync?: boolean;
  requireConfirmation?: boolean;
  showDryRunPreview?: boolean;
  allowedUserIds?: string[];
}

interface FeatureFlag {
  flag_name: string;
  enabled: boolean;
  config: FeatureFlagConfig;
}

export function useFeatureFlag(flagName: string) {
  return useQuery({
    queryKey: ['feature-flag', flagName],
    queryFn: async (): Promise<FeatureFlag | null> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('flag_name, enabled, config')
        .eq('flag_name', flagName)
        .single();

      if (error) {
        console.error('Error fetching feature flag:', error);
        return null;
      }

      return data as FeatureFlag;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useQuickBooksFeatureFlag() {
  return useFeatureFlag('quickbooks_integration');
}
```

### 4.2 QuickBooks Connection Hook

Create file: `src/hooks/useQuickBooksConnection.ts`

```typescript
/**
 * Hook for managing QuickBooks connection
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickBooksConnection {
  id: string;
  realm_id: string;
  company_name: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  connected_at: string;
  last_sync_at: string | null;
}

export function useQuickBooksConnection() {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch current connection
  const {
    data: connection,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['quickbooks-connection'],
    queryFn: async (): Promise<QuickBooksConnection | null> => {
      const { data, error } = await supabase
        .from('quickbooks_connections')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    },
  });

  // Initiate connection
  const initiateConnection = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('quickbooks-connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { authUrl } = response.data;

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        'quickbooks-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for completion message
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'quickbooks_connected') {
          toast.success(`Connected to ${event.data.companyName}`);
          queryClient.invalidateQueries({ queryKey: ['quickbooks-connection'] });
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed without completing
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to connect to QuickBooks');
      setIsConnecting(false);
    }
  };

  // Disconnect
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!connection) return;

      const { error } = await supabase
        .from('quickbooks_connections')
        .update({
          is_active: false,
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Disconnected from QuickBooks');
      queryClient.invalidateQueries({ queryKey: ['quickbooks-connection'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to disconnect');
    },
  });

  return {
    connection,
    isLoading,
    error,
    isConnecting,
    isConnected: !!connection?.is_active,
    initiateConnection,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}
```

### 4.3 QuickBooks Sync Hook

Create file: `src/hooks/useQuickBooksSync.ts`

```typescript
/**
 * Hook for syncing receipts to QuickBooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  quickbooks_transaction_id?: string;
  purchase?: any;
  error?: string;
}

interface DryRunResult {
  dryRun: true;
  payload: any;
  receipt: {
    id: string;
    amount: number;
    payee: string | null;
    project: string | null;
    date: string;
  };
}

export function useQuickBooksSync() {
  const queryClient = useQueryClient();

  // Dry run - preview what would be sent
  const previewMutation = useMutation({
    mutationFn: async (receiptId: string): Promise<DryRunResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('quickbooks-sync-receipt', {
        body: { receiptId, dryRun: true },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
  });

  // Actual sync
  const syncMutation = useMutation({
    mutationFn: async (receiptId: string): Promise<SyncResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('quickbooks-sync-receipt', {
        body: { receiptId, dryRun: false },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Receipt synced to QuickBooks');
        queryClient.invalidateQueries({ queryKey: ['receipts'] });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sync to QuickBooks');
    },
  });

  return {
    preview: previewMutation.mutateAsync,
    isPreviewing: previewMutation.isPending,
    previewData: previewMutation.data,
    
    sync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    syncResult: syncMutation.data,
    syncError: syncMutation.error,
  };
}
```

### 4.4 Send to QuickBooks Dialog

Create file: `src/components/receipts/SendToQuickBooksDialog.tsx`

```typescript
/**
 * Dialog shown after approving a receipt to optionally send to QuickBooks
 */

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Eye, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useQuickBooksSync } from '@/hooks/useQuickBooksSync';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { useQuickBooksFeatureFlag } from '@/hooks/useFeatureFlag';
import { formatCurrency } from '@/lib/utils';

interface SendToQuickBooksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: {
    id: string;
    amount: number;
    payee_name?: string;
    project_number?: string;
    project_name?: string;
    captured_at?: string;
    description?: string;
  };
  onComplete?: () => void;
}

export function SendToQuickBooksDialog({
  open,
  onOpenChange,
  receipt,
  onComplete,
}: SendToQuickBooksDialogProps) {
  const { data: featureFlag } = useQuickBooksFeatureFlag();
  const { isConnected, connection } = useQuickBooksConnection();
  const { preview, isPreviewing, previewData, sync, isSyncing } = useQuickBooksSync();
  
  const [showPreview, setShowPreview] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setShowPreview(false);
      setSyncComplete(false);
    }
  }, [open]);

  // Don't show if feature is disabled
  if (!featureFlag?.enabled) {
    return null;
  }

  const handlePreview = async () => {
    try {
      await preview(receipt.id);
      setShowPreview(true);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSync = async () => {
    try {
      const result = await sync(receipt.id);
      if (result.success) {
        setSyncComplete(true);
        setTimeout(() => {
          onOpenChange(false);
          onComplete?.();
        }, 2000);
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Receipt Approved
          </AlertDialogTitle>
          <AlertDialogDescription>
            Would you like to send this receipt to QuickBooks?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Receipt Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vendor:</span>
            <span className="font-medium">{receipt.payee_name || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">{formatCurrency(receipt.amount)}</span>
          </div>
          {receipt.project_number && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project:</span>
              <span className="font-medium text-sm">
                {receipt.project_number} - {receipt.project_name}
              </span>
            </div>
          )}
          {receipt.captured_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {new Date(receipt.captured_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              QuickBooks is not connected. Connect in Settings first.
            </span>
          </div>
        )}

        {isConnected && connection && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {connection.environment === 'sandbox' ? '🧪 Sandbox' : '🏢 Production'}
            </Badge>
            <span>→ {connection.company_name}</span>
          </div>
        )}

        {/* Preview Section */}
        {showPreview && previewData && (
          <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
            <h4 className="text-sm font-medium mb-2">QuickBooks Payload Preview:</h4>
            <pre className="text-xs overflow-auto max-h-40 bg-white dark:bg-slate-800 p-2 rounded">
              {JSON.stringify(previewData.payload, null, 2)}
            </pre>
          </div>
        )}

        {/* Success State */}
        {syncComplete && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Successfully sent to QuickBooks!</span>
          </div>
        )}

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {!syncComplete && (
            <>
              <AlertDialogCancel onClick={handleSkip} disabled={isSyncing}>
                Skip
              </AlertDialogCancel>
              
              {featureFlag?.config?.showDryRunPreview && !showPreview && (
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={isPreviewing || !isConnected}
                >
                  {isPreviewing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Preview
                </Button>
              )}
              
              <Button
                onClick={handleSync}
                disabled={isSyncing || !isConnected}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send to QuickBooks
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 4.5 QuickBooks Settings Component

Create file: `src/components/settings/QuickBooksSettings.tsx`

```typescript
/**
 * QuickBooks connection settings panel
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Link2, Unlink, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { useQuickBooksFeatureFlag } from '@/hooks/useFeatureFlag';
import { format } from 'date-fns';

export function QuickBooksSettings() {
  const { data: featureFlag, isLoading: flagLoading } = useQuickBooksFeatureFlag();
  const {
    connection,
    isLoading,
    isConnecting,
    isConnected,
    initiateConnection,
    disconnect,
    isDisconnecting,
  } = useQuickBooksConnection();

  // Don't show if feature flag is disabled
  if (flagLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!featureFlag?.enabled) {
    return null; // Feature is disabled
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              QuickBooks Integration
              <Badge variant="outline" className="text-xs">
                {featureFlag.config?.environment === 'sandbox' ? '🧪 Sandbox' : '🏢 Production'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Connect to QuickBooks Online to sync approved receipts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : isConnected && connection ? (
          // Connected State
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Connected</AlertTitle>
              <AlertDescription className="text-green-700">
                Connected to <strong>{connection.company_name}</strong>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Company ID:</span>
                <p className="font-mono text-xs">{connection.realm_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Connected:</span>
                <p>{format(new Date(connection.connected_at), 'MMM d, yyyy')}</p>
              </div>
              {connection.last_sync_at && (
                <div>
                  <span className="text-muted-foreground">Last Sync:</span>
                  <p>{format(new Date(connection.last_sync_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => initiateConnection()}
                disabled={isConnecting}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                Reconnect
              </Button>
              <Button
                variant="destructive"
                onClick={() => disconnect()}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          // Not Connected State
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>
                Connect to QuickBooks to enable receipt syncing.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => initiateConnection()}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Connect to QuickBooks
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Intuit to authorize the connection.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Phase 5: Integration with Existing Components

### 5.1 Modify ReceiptsManagement.tsx

Add the SendToQuickBooksDialog after approval. Find the `handleApproveReceipt` function and modify:

```typescript
// Add state at top of component
const [showQBDialog, setShowQBDialog] = useState(false);
const [approvedReceipt, setApprovedReceipt] = useState<UnifiedReceipt | null>(null);

// Modify handleApproveReceipt
const handleApproveReceipt = async (receiptId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('receipts')
      .update({
        approval_status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', receiptId);

    if (error) throw error;
    toast.success('Receipt approved');
    
    // Find the receipt for QB dialog
    const receipt = allReceipts.find(r => r.id === receiptId);
    if (receipt) {
      setApprovedReceipt(receipt);
      setShowQBDialog(true);
    }
    
    loadReceipts();
  } catch (error) {
    console.error('Approval error:', error);
    toast.error('Failed to approve receipt');
  }
};

// Add dialog at bottom of component, before closing tag
{approvedReceipt && (
  <SendToQuickBooksDialog
    open={showQBDialog}
    onOpenChange={setShowQBDialog}
    receipt={{
      id: approvedReceipt.id,
      amount: approvedReceipt.amount,
      payee_name: approvedReceipt.payee_name,
      project_number: approvedReceipt.project_number,
      project_name: approvedReceipt.project_name,
      captured_at: approvedReceipt.date,
      description: approvedReceipt.description,
    }}
    onComplete={() => {
      setApprovedReceipt(null);
      loadReceipts();
    }}
  />
)}
```

### 5.2 Add QuickBooks Status Badge to Receipt List

Add a badge showing sync status in the receipt table:

```typescript
// Add to column definitions or render function
{receipt.quickbooks_sync_status === 'success' && (
  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
    QB Synced
  </Badge>
)}
{receipt.quickbooks_sync_status === 'failed' && (
  <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
    QB Failed
  </Badge>
)}
{receipt.quickbooks_sync_status === 'pending' && (
  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
    QB Pending
  </Badge>
)}
```

---

## Phase 6: TypeScript Types

### 6.1 Add Types to Supabase Types File

Add to `src/integrations/supabase/types.ts` (or regenerate from database):

```typescript
// Add to Database interface -> Tables

feature_flags: {
  Row: {
    id: string;
    flag_name: string;
    enabled: boolean;
    description: string | null;
    config: Record<string, any>;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  };
  Insert: {
    id?: string;
    flag_name: string;
    enabled?: boolean;
    description?: string | null;
    config?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
    updated_by?: string | null;
  };
  Update: {
    id?: string;
    flag_name?: string;
    enabled?: boolean;
    description?: string | null;
    config?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
    updated_by?: string | null;
  };
};

quickbooks_connections: {
  Row: {
    id: string;
    realm_id: string;
    company_name: string | null;
    environment: 'sandbox' | 'production';
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
    is_active: boolean;
    last_sync_at: string | null;
    last_error: string | null;
    connected_by: string | null;
    connected_at: string;
    disconnected_at: string | null;
    disconnected_by: string | null;
    created_at: string;
    updated_at: string;
  };
  // ... Insert and Update types
};

// Add to receipts Row type
quickbooks_transaction_id: string | null;
quickbooks_sync_status: 'pending' | 'success' | 'failed' | 'skipped' | null;
quickbooks_synced_at: string | null;
quickbooks_synced_by: string | null;
quickbooks_error_message: string | null;
quickbooks_request_payload: Record<string, any> | null;
quickbooks_response_payload: Record<string, any> | null;
```

---

## Phase 7: Testing Checklist

### 7.1 Feature Flag Tests
- [ ] Feature flag disabled → No QB UI visible anywhere
- [ ] Feature flag enabled → QB connection option in settings
- [ ] Feature flag enabled → "Send to QB" option after approval

### 7.2 Connection Tests (Sandbox)
- [ ] Can initiate OAuth flow
- [ ] OAuth popup opens correctly
- [ ] Callback processes successfully
- [ ] Tokens stored in database
- [ ] Connection status shows in settings
- [ ] Can disconnect

### 7.3 Sync Tests (Sandbox)
- [ ] Dry run returns correct payload preview
- [ ] Sync creates Purchase in QuickBooks sandbox
- [ ] Receipt updated with QB transaction ID
- [ ] Sync log entry created
- [ ] Error handling works (invalid data, network error)
- [ ] Cannot sync unapproved receipt
- [ ] Cannot sync already-synced receipt

### 7.4 UI Tests
- [ ] Settings page shows connection status
- [ ] Approval triggers QB dialog
- [ ] Skip button works
- [ ] Preview button shows payload
- [ ] Send button syncs and shows success
- [ ] Badge shows sync status in receipt list

---

## Phase 8: Deployment Checklist

1. [ ] Run all database migrations
2. [ ] Add Supabase secrets (Client ID, Secret, etc.)
3. [ ] Deploy Edge Functions
4. [ ] Update Intuit Developer Portal redirect URI
5. [ ] Test OAuth flow end-to-end
6. [ ] Keep feature flag DISABLED initially
7. [ ] Enable for admin testing only
8. [ ] Test with sandbox thoroughly
9. [ ] When ready: switch to production credentials

---

## Security Considerations

1. **Tokens encrypted at rest** - Supabase handles this
2. **Admin-only access** - All QB operations require admin role
3. **Feature flag controls** - Master switch to disable everything
4. **Audit logging** - Every sync attempt logged with full payload
5. **CSRF protection** - OAuth state parameter verified
6. **Token refresh** - Automatic refresh before expiration
7. **No auto-sync** - User must explicitly trigger each sync

---

## Future Enhancements (Out of Scope)

- Auto-sync approved receipts (batch job)
- Sync expenses (not just receipts)
- Create invoices in QuickBooks
- Bi-directional sync (import from QB)
- Multiple QuickBooks company support
- Production environment switch UI

---

## Support

For issues or questions about this integration:
1. Check sync log in database for error details
2. Verify feature flag is enabled
3. Verify QuickBooks connection is active
4. Check Edge Function logs in Supabase dashboard
