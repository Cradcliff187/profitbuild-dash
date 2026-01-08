// supabase/functions/get-textbelt-key/index.ts
// Temporary function to retrieve Text Belt API key for renewal
// DELETE THIS FUNCTION AFTER RETRIEVING THE KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify caller is admin/manager
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Get user info from auth
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin or manager
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

    // Return the API key (for renewal purposes)
    return new Response(
      JSON.stringify({
        success: true,
        apiKey: textbeltKey,
        message: 'Remember to delete this function after retrieving the key'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error retrieving key:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
