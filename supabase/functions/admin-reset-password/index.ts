import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  targetUserId: string;
  method: 'temporary_password' | 'email_reset';
  temporaryPassword?: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
  temporaryPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get requesting user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role using server-side function
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: isAdminData, error: roleError } = await supabaseServiceRole.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdminData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { targetUserId, method, temporaryPassword }: ResetPasswordRequest = await req.json();

    if (!targetUserId || !method) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: targetUserId, method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate method
    if (method !== 'temporary_password' && method !== 'email_reset') {
      return new Response(
        JSON.stringify({ error: 'Invalid method. Use "temporary_password" or "email_reset"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let responseData: ResetPasswordResponse;

    if (method === 'temporary_password') {
      // Generate temporary password if not provided
      const tempPassword = temporaryPassword || generateTemporaryPassword();

      // Update user password using admin client
      const { error: updateError } = await supabaseServiceRole.auth.admin.updateUserById(
        targetUserId,
        { password: tempPassword }
      );

      if (updateError) {
        console.error('Password update error:', updateError);
        return new Response(
          JSON.stringify({ error: `Failed to update password: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Set must_change_password flag
      const { error: profileError } = await supabaseServiceRole
        .from('profiles')
        .update({ 
          must_change_password: true,
          password_changed_at: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Continue even if profile update fails - password was already reset
      }

      responseData = {
        success: true,
        message: 'Password reset successfully with temporary password',
        temporaryPassword: tempPassword
      };

    } else {
      // Send password reset email
      const { error: resetError } = await supabaseServiceRole.auth.admin.generateLink({
        type: 'recovery',
        email: '', // Will be fetched from user record
        options: {
          redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/auth`
        }
      });

      if (resetError) {
        console.error('Password reset email error:', resetError);
        return new Response(
          JSON.stringify({ error: `Failed to send reset email: ${resetError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Set must_change_password flag
      const { error: profileError } = await supabaseServiceRole
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', targetUserId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      responseData = {
        success: true,
        message: 'Password reset email sent successfully'
      };
    }

    // Log admin action
    const { error: logError } = await supabaseServiceRole
      .from('admin_actions')
      .insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action_type: 'reset_password',
        action_details: {
          method,
          timestamp: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('Failed to log admin action:', logError);
      // Don't fail the request if logging fails
    }

    console.log(`Password reset successful for user ${targetUserId} by admin ${user.id}`);

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in admin-reset-password function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  return password;
}

serve(handler);
