import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
  forceDelete?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    // Create client with anon key to verify caller
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the calling user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is admin
    const { data: isAdmin, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      console.error('Permission error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, forceDelete = false }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for financial records - prevent hard delete if they exist
    const { count: expenseCount } = await supabaseClient
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: receiptCount } = await supabaseClient
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((expenseCount || 0) > 0 || (receiptCount || 0) > 0) {
      if (!forceDelete) {
        return new Response(
          JSON.stringify({ 
            error: 'Cannot delete user with financial records. Please deactivate instead.',
            hasFinancialRecords: true,
            expenseCount: expenseCount || 0,
            receiptCount: receiptCount || 0
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Force delete: manually delete financial records first
      console.log(`⚠️ Force deleting user ${userId} with ${expenseCount} expenses and ${receiptCount} receipts`);
      
      // Create service role client for deletion
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // Delete expenses
      if ((expenseCount || 0) > 0) {
        const { error: expenseDeleteError } = await serviceClient
          .from('expenses')
          .delete()
          .eq('user_id', userId);
        
        if (expenseDeleteError) {
          console.error('Error deleting expenses:', expenseDeleteError);
        } else {
          console.log(`Deleted ${expenseCount} expense records`);
        }
      }
      
      // Delete receipts
      if ((receiptCount || 0) > 0) {
        const { error: receiptDeleteError } = await serviceClient
          .from('receipts')
          .delete()
          .eq('user_id', userId);
        
        if (receiptDeleteError) {
          console.error('Error deleting receipts:', receiptDeleteError);
        } else {
          console.log(`Deleted ${receiptCount} receipt records`);
        }
      }
    }

    // Check if this is the last admin
    const { count: adminCount } = await supabaseClient
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'admin');

    const { data: targetUserRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const isTargetAdmin = targetUserRoles?.some(r => r.role === 'admin');
    
    if (isTargetAdmin && (adminCount ?? 0) <= 1) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete the last admin user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user details for audit log before deletion
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Create service role client for deletion
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user from auth.users (cascade will handle profiles, user_roles, etc.)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log admin action
    await supabaseClient
      .from('admin_actions')
      .insert({
        admin_user_id: user.id,
        action_type: 'delete_user',
        target_user_id: userId,
        action_details: {
          deleted_email: profile?.email,
          deleted_name: profile?.full_name,
          deleted_at: new Date().toISOString(),
          force_delete: forceDelete,
          expense_count: expenseCount || 0,
          receipt_count: receiptCount || 0,
        }
      });

    console.log(`User ${userId} deleted successfully by admin ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User deleted successfully'
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
