import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  targetUserId: string;
  method: 'temporary_password' | 'email_reset' | 'permanent_password';
  temporaryPassword?: string;
  permanentPassword?: string;
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
    // Get authorization header and decode JWT to extract user ID
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token and decode it (verify_jwt=true ensures it's valid)
    const token = authHeader.replace('Bearer ', '');
    const [, payloadBase64] = token.split('.');
    const payload = JSON.parse(atob(payloadBase64));
    const userId = payload.sub;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token: missing user ID' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: isAdminData, error: roleError } = await supabaseServiceRole.rpc('has_role', {
      _user_id: userId,
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
    const { targetUserId, method, temporaryPassword, permanentPassword }: ResetPasswordRequest = await req.json();

    if (!targetUserId || !method) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: targetUserId, method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate method
    if (method !== 'temporary_password' && method !== 'email_reset' && method !== 'permanent_password') {
      return new Response(
        JSON.stringify({ error: 'Invalid method. Use "temporary_password", "email_reset", or "permanent_password"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let responseData: ResetPasswordResponse;

    if (method === 'temporary_password' || method === 'permanent_password') {
      // Generate temporary password or use provided permanent password
      let newPassword: string;
      let mustChangePasswordFlag = false;

      if (method === 'permanent_password') {
        if (!permanentPassword || permanentPassword.length < 8) {
          return new Response(
            JSON.stringify({ error: 'Permanent password must be at least 8 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        newPassword = permanentPassword;
        mustChangePasswordFlag = false; // No need to change
      } else {
        newPassword = temporaryPassword || generateTemporaryPassword();
        mustChangePasswordFlag = true; // Force change on next login
      }

      // Update user password using admin client
      const { error: updateError } = await supabaseServiceRole.auth.admin.updateUserById(
        targetUserId,
        { password: newPassword }
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
          must_change_password: mustChangePasswordFlag
        })
        .eq('id', targetUserId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Continue even if profile update fails - password was already reset
      }

      responseData = {
        success: true,
        message: method === 'permanent_password' 
          ? 'Password set successfully'
          : 'Password reset successfully with temporary password',
        temporaryPassword: newPassword
      };

    } else {
      // Fetch user's email first
      const { data: targetUser, error: userError } = await supabaseServiceRole.auth.admin.getUserById(targetUserId);

      if (userError || !targetUser?.user?.email) {
        console.error('Failed to fetch user email:', userError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch user email. User may not exist.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Sending password reset email to: ${targetUser.user.email}`);

      // Send password reset email with correct email
      const { data: linkData, error: resetError } = await supabaseServiceRole.auth.admin.generateLink({
        type: 'recovery',
        email: targetUser.user.email,
        options: {
          redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/change-password`
        }
      });

      if (resetError) {
        console.error('Password reset email error:', resetError);
        return new Response(
          JSON.stringify({ 
            error: `Failed to send reset email: ${resetError.message}`,
            details: 'Email provider may not be configured in Supabase settings'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Password reset link generated:', linkData);

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
        message: 'Password reset email sent successfully',
        emailSentTo: targetUser.user.email
      };
    }

    // Log admin action
    const { error: logError } = await supabaseServiceRole
      .from('admin_actions')
      .insert({
        admin_user_id: userId,
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

    console.log(`Password reset successful for user ${targetUserId} by admin ${userId}`);

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
