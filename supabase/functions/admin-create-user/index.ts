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

    const { email, fullName, role, method, password } = await req.json() as CreateUserRequest;

    console.log('Creating user:', { email, fullName, role, method });

    let userId: string;
    let tempPassword: string | null = null;

    if (method === 'invite') {
      // Send invitation email
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
        },
        redirectTo: 'https://rcgwork.com/reset-password',
      });

      if (error) {
        console.error('Error inviting user:', error);
        throw error;
      }

      userId = data.user.id;
      console.log('User invited successfully:', userId);

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
      console.log('User created with permanent password:', userId);
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
