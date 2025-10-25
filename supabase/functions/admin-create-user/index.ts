import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  fullName: string;
  role: string;
  method: 'invite' | 'temporary' | 'permanent';
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

    // Detect the environment from the request origin
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    const baseUrl = origin || 'https://rcgwork.com';

    const { email, fullName, role, method, password } = await req.json() as CreateUserRequest;

    console.log('Creating user:', { email, fullName, role, method, baseUrl });

    let userId: string;
    let tempPassword: string | null = null;

    if (method === 'invite') {
      // Create user without sending Supabase's default email
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (error) {
        console.error('Error creating user for invite:', error);
        throw error;
      }

      userId = data.user.id;
      console.log('User created for invite:', userId);

      // Generate password reset link for the invitation
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${baseUrl}/reset-password`,
        },
      });

      if (linkError) {
        console.error('Error generating invite link:', linkError);
        throw linkError;
      }

      console.log('Generated password reset link for invitation');

      // Send branded invitation email with password reset link
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-auth-email', {
        body: {
          type: 'user-invitation',
          email: email,
          userName: fullName,
          userRole: role,
          resetUrl: linkData.properties.action_link,
          inviteMethod: 'invite',
        },
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't throw - user is created, just log the email error
      } else {
        console.log('Branded invitation email sent successfully');
      }

    } else if (method === 'temporary') {
      // Generate temporary password
      tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (error) {
        console.error('Error creating user with temp password:', error);
        throw error;
      }

      userId = data.user.id;

      // Set must_change_password flag
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', userId);

      console.log('Must change password flag set for user:', userId);

      // Verify it was set
      const { data: verifyProfile } = await supabaseAdmin
        .from('profiles')
        .select('must_change_password')
        .eq('id', userId)
        .single();

      console.log('Verified must_change_password:', verifyProfile?.must_change_password);

      console.log('User created with temp password:', userId);

      // Send branded invitation email with temporary password
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-auth-email', {
        body: {
          type: 'user-invitation',
          email: email,
          userName: fullName,
          userRole: role,
          tempPassword: tempPassword,
          inviteMethod: 'temporary',
        },
      });

      if (emailError) {
        console.error('Error sending temporary password email:', emailError);
        // Don't throw - user is created, just log the email error
      } else {
        console.log('Branded temporary password email sent successfully');
      }

    } else {
      // Create user with permanent password
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: password!,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (error) {
        console.error('Error creating user with permanent password:', error);
        throw error;
      }

      userId = data.user.id;

      // Clear must_change_password flag for permanent passwords
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', userId);

      if (profileError) {
        console.error('Error clearing must_change_password flag:', profileError);
      }

      // Verify it was cleared
      const { data: verifyProfile } = await supabaseAdmin
        .from('profiles')
        .select('must_change_password')
        .eq('id', userId)
        .single();

      console.log('User created with permanent password:', userId);
      console.log('Verified must_change_password:', verifyProfile?.must_change_password);

      // Send branded invitation email confirming account creation
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-auth-email', {
        body: {
          type: 'user-invitation',
          email: email,
          userName: fullName,
          userRole: role,
          inviteMethod: 'permanent',
        },
      });

      if (emailError) {
        console.error('Error sending permanent password confirmation email:', emailError);
        // Don't throw - user is created, just log the email error
      } else {
        console.log('Branded account confirmation email sent successfully');
      }
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw roleError;
    }

    console.log('Role assigned successfully:', role);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        tempPassword,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in admin-create-user:', error);
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
