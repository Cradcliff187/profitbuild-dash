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
