import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ForgotPasswordRequest {
  email: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json() as ForgotPasswordRequest;

    if (!email || typeof email !== 'string') {
      // Still return success to not reveal validation details
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

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

    // Look up user by email
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      // Return success anyway — don't reveal internal errors
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const user = userList.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
    );

    if (!user) {
      console.log('No user found for email:', email);
      // Return success — don't reveal whether email exists
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('📧 Forgot password request for:', email);

    // Determine redirect URL based on environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const isPreview = supabaseUrl.includes('lovableproject');
    const redirectTo = isPreview
      ? 'https://8ad59cd4-cdfa-472d-b4a1-52ac194e00f2.lovableproject.com/reset-password'
      : 'https://rcgwork.com/reset-password';

    // Generate recovery link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: user.email!,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error('Error generating reset link:', error);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const resetLink = data.properties?.action_link;

    if (!resetLink) {
      console.error('Failed to get action_link from response');
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send branded email via existing send-auth-email function
    const emailResponse = await supabaseAdmin.functions.invoke('send-auth-email', {
      body: {
        type: 'password-reset',
        email: user.email,
        resetUrl: resetLink
      }
    });

    if (emailResponse.error) {
      console.error('Error sending email:', emailResponse.error);
    } else {
      console.log('✅ Password reset email sent to:', email);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in forgot-password:', error);
    // Always return success
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
