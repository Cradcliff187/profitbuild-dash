import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnableUserRequest {
  userId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    // Verify caller is admin
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId }: EnableUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to clear the auth ban
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: unbanError } = await serviceClient.auth.admin.updateUserById(userId, {
      ban_duration: 'none'
    });

    if (unbanError) {
      console.error('Auth unban error:', unbanError);
      return new Response(
        JSON.stringify({ error: `Failed to unban user: ${unbanError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Flip profile back to active and clear the deactivation audit fields
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        is_active: true,
        deactivated_at: null,
        deactivated_by: null
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Roll back the unban so state stays internally consistent on profile failure
      await serviceClient.auth.admin.updateUserById(userId, {
        ban_duration: '876000h'
      });
      return new Response(
        JSON.stringify({ error: `Failed to reactivate profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log admin action
    await supabaseClient
      .from('admin_actions')
      .insert({
        admin_user_id: user.id,
        action_type: 'reactivate_user',
        target_user_id: userId,
        action_details: {
          reactivated_at: new Date().toISOString(),
        }
      });

    // Best-effort cascade: reactivate the linked internal payee so the user reappears
    // in @mentions, WorkerPicker, and any other is_active=true filter. Do not roll
    // back the unban if this fails — auth is the source of truth and the admin can
    // reconcile from Role Management → Accounting Linkage. Mirror of the disable
    // function's payee step. See Architectural Rule 11 in CLAUDE.md.
    try {
      const { error: payeeError } = await serviceClient
        .from('payees')
        .update({ is_active: true })
        .eq('user_id', userId)
        .eq('is_internal', true);
      if (payeeError) {
        console.error('Linked payee reactivate failed (user still enabled successfully):', payeeError);
      }
    } catch (payeeErr) {
      console.error('Linked payee reactivate threw (user still enabled successfully):', payeeErr);
    }

    console.log(`User ${userId} reactivated successfully by admin ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User reactivated successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
