import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password?: string;
  fullName?: string;
  role?: 'admin' | 'manager' | 'field_worker';
  sendInviteEmail?: boolean;
  mustChangePassword?: boolean;
  method?: 'temporary_password' | 'invite_email' | 'permanent_password';
  permanentPassword?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: CreateUserRequest = await req.json();
    const { email, fullName, role, permanentPassword } = requestData;

    // Validate email format server-side
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format. Email must include a valid domain (e.g., user@example.com)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map 'method' from frontend
    const method = (requestData as any).method || 'temporary_password';
    
    console.log('Creating user:', { 
      email, 
      role, 
      method
    });

    // Determine password and must_change_password flag based on method
    let finalPassword: string;
    let mustChangePasswordFlag = false;

    if (method === 'permanent_password') {
      // Admin sets permanent password directly
      if (!permanentPassword || permanentPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Permanent password must be at least 8 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      finalPassword = permanentPassword;
      mustChangePasswordFlag = false; // No need to change
    } else if (method === 'invite_email') {
      // Email invitation - Supabase sends email with setup link
      finalPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`; // Fallback
      mustChangePasswordFlag = false; // User sets via email link
    } else {
      // Generate temp password
      finalPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`;
      mustChangePasswordFlag = true; // Force change on first login
    }

    // Create user via admin API
    const createUserData: any = {
      email,
      password: finalPassword,
      email_confirm: method !== 'invite_email',
      user_metadata: {
        full_name: fullName || email,
      },
    };

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser(createUserData);

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', newUser.user.id);

    // Update profile with must_change_password flag
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        must_change_password: mustChangePasswordFlag
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Assign role if provided
    if (role) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: role,
          assigned_by: user.id,
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
      } else {
        console.log('Role assigned successfully:', role);
      }
    }

    // Log admin action
    const { error: auditError } = await supabaseAdmin
      .from('admin_actions')
      .insert({
        admin_user_id: user.id,
        target_user_id: newUser.user.id,
        action_type: 'user_created',
        action_details: {
          email,
          role,
          method,
          mustChangePassword: mustChangePasswordFlag,
        },
      });

    if (auditError) {
      console.error('Error logging admin action:', auditError);
    }

    const response: any = {
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        fullName: fullName || email,
        role,
      },
    };

    // Return password if it was generated (temp or permanent)
    if (method === 'temporary_password' || method === 'permanent_password') {
      response.temporaryPassword = finalPassword;
    }

    console.log('User creation complete');

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in admin-create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
