// supabase/functions/check-sms-quota/index.ts
//
// Textbelt quota endpoint is a GET request:
// GET https://textbelt.com/quota/:key
//
// Returns: {"success": true, "quotaRemaining": 98}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify caller is admin/manager
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Get user info from auth using anon key client
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = roles?.some(r => ['admin', 'manager'].includes(r.role));
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    // Get API key
    const textbeltKey = Deno.env.get('TEXTBELT_API_KEY');
    if (!textbeltKey) {
      throw new Error('TEXTBELT_API_KEY not configured');
    }

    // GET request to Textbelt quota endpoint
    // Ref: https://docs.textbelt.com/other-api-endpoints#checking-your-credit-balance
    const response = await fetch(`https://textbelt.com/quota/${textbeltKey}`);
    const result = await response.json();

    console.log('📱 Quota check:', result);

    // Response format: {"success": true, "quotaRemaining": 98}
    return new Response(
      JSON.stringify({
        success: result.success,
        quotaRemaining: result.quotaRemaining,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Quota check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

