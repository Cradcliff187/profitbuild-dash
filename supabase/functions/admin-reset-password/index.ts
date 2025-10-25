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
      // Fetch user email first
      const userResponse = await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = userResponse.data.user?.email || '';
      
      console.log('📧 Starting email reset process via Resend:', {
        userId,
        email: userEmail,
        timestamp: new Date().toISOString()
      });
      
      // Determine redirect URL based on environment
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const isPreview = supabaseUrl.includes('lovableproject');
      const redirectTo = isPreview
        ? 'https://8ad59cd4-cdfa-472d-b4a1-52ac194e00f2.lovableproject.com/reset-password'
        : 'https://rcgwork.com/reset-password';
      
      console.log('🔗 Using redirect URL:', redirectTo);
      
      // Generate password reset link (token only, no email sent by Supabase)
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: userEmail,
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('❌ Error generating reset token:', {
          error: error.message,
          code: error.status,
          email: userEmail
        });
        throw error;
      }

      // Use the complete action_link provided by Supabase
      const resetLink = data.properties?.action_link;

      if (!resetLink) {
        console.error('❌ Failed to get action_link from response:', {
          dataKeys: Object.keys(data),
          propertiesKeys: data.properties ? Object.keys(data.properties) : 'no properties'
        });
        throw new Error('Failed to generate reset link');
      }

      console.log('✅ Reset link generated successfully:', {
        email: userEmail,
        hasLink: !!resetLink,
        redirectTo
      });

      // Send email via Resend edge function
      console.log('📨 Sending email via Resend...');
      const emailResponse = await supabaseAdmin.functions.invoke('send-auth-email', {
        body: {
          type: 'password-reset',
          email: userEmail,
          resetUrl: resetLink
        }
      });

      if (emailResponse.error) {
        console.error('❌ Error sending email via Resend:', emailResponse.error);
        throw new Error(`Failed to send email: ${emailResponse.error.message}`);
      }

      console.log('✅ Password reset email sent successfully via Resend:', {
        email: userEmail,
        emailId: emailResponse.data?.emailId
      });

    } else if (method === 'temporary') {
      // Generate temporary password
      tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
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
        email_confirm: true,
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
