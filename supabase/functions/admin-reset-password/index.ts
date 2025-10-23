import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  userId: string;
  method: 'email' | 'temporary' | 'permanent';
  password?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { userId, method, password } = await req.json() as ResetPasswordRequest;

    console.log('Resetting password for user:', { userId, method });

    let tempPassword: string | null = null;

    if (method === 'email') {
      // Generate password reset link and send email
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: (await supabaseAdmin.auth.admin.getUserById(userId)).data.user?.email || '',
        options: {
          redirectTo: 'https://rcgwork.com/reset-password',
        },
      });

      if (error) {
        console.error('Error generating reset link:', error);
        throw error;
      }

      console.log('Password reset email sent successfully');

    } else if (method === 'temporary') {
      // Generate temporary password
      tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });

      if (error) {
        console.error('Error setting temp password:', error);
        throw error;
      }

      // Set must_change_password flag
      await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', userId);

      console.log('Temporary password set successfully');

    } else {
      // Set permanent password
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password!,
      });

      if (error) {
        console.error('Error setting permanent password:', error);
        throw error;
      }

      // Clear must_change_password flag
      await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', userId);

      console.log('Permanent password set successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        tempPassword,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in admin-reset-password:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
