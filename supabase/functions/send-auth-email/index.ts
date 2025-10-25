import { Resend } from 'npm:resend@2.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthEmailRequest {
  type: 'password-reset' | 'welcome' | 'user-invitation';
  email: string;
  resetUrl?: string;
  userName?: string;
  userRole?: string;
  tempPassword?: string;
  inviteMethod?: 'temporary' | 'permanent';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('ResendAPI');
    
    if (!resendApiKey) {
      console.error('❌ ResendAPI secret not configured');
      throw new Error('Email service not configured');
    }

    // Initialize Supabase client to fetch company branding
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company branding settings
    const { data: branding } = await supabase
      .from('company_branding_settings')
      .select('*')
      .single();

    const logoUrl = branding?.logo_full_url || 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Full%20Horizontal%20Logo%20-%201500x500.png';
    const companyName = branding?.company_name || 'Radcliff Construction Group';
    const companyLegalName = branding?.company_legal_name || 'Radcliff Construction Group, LLC';
    const primaryColor = branding?.primary_color || '#cf791d';
    const secondaryColor = branding?.secondary_color || '#1b2b43';
    const accentColor = branding?.accent_color || '#cf791d';
    const lightBgColor = branding?.light_bg_color || '#f4f7f9';

    const resend = new Resend(resendApiKey);
    const { type, email, resetUrl, userName, userRole, tempPassword, inviteMethod } = await req.json() as AuthEmailRequest;

    console.log('📧 Sending branded auth email:', { type, email, hasResetUrl: !!resetUrl, companyName });

    let subject = '';
    let html = '';

    if (type === 'password-reset') {
      if (!resetUrl) {
        throw new Error('resetUrl is required for password reset emails');
      }

      subject = `Reset Your Password - ${companyName}`;
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7f9;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f7f9;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); overflow: hidden;">
                    
                    <!-- Branded Header -->
                    <tr>
                      <td style="background-color: ${secondaryColor}; padding: 32px 40px; text-align: center;">
                        <img src="${logoUrl}" alt="${companyName}" style="max-width: 280px; height: auto; display: block; margin: 0 auto;">
                      </td>
                    </tr>
                    
                    <!-- Hero Section -->
                    <tr>
                      <td style="padding: 48px 40px 32px; text-align: center;">
                        <h1 style="margin: 0 0 16px; color: ${secondaryColor}; font-size: 28px; font-weight: 700; line-height: 1.2;">
                          Reset Your Password
                        </h1>
                        <p style="margin: 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                          We received a request to reset your password for your ${companyName} account.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 0 40px 32px;">
                        <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                          Click the button below to create a new password:
                        </p>
                        
                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 8px 0 24px;">
                              <a href="${resetUrl}" 
                                 style="display: inline-block; padding: 16px 40px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 8px rgba(207, 121, 29, 0.25); min-height: 48px; line-height: 1;">
                                Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Alternative Link -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f7fafc; border-radius: 8px; padding: 16px; margin-top: 8px;">
                          <tr>
                            <td>
                              <p style="margin: 0 0 8px; color: #718096; font-size: 14px; line-height: 1.5;">
                                Or copy and paste this link into your browser:
                              </p>
                              <p style="margin: 0;">
                                <a href="${resetUrl}" style="color: ${primaryColor}; font-size: 13px; word-break: break-all; text-decoration: underline;">${resetUrl}</a>
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                      <td style="padding: 0 40px 40px;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3e7; border-left: 4px solid ${primaryColor}; border-radius: 8px;">
                          <tr>
                            <td style="padding: 20px 24px;">
                              <p style="margin: 0 0 8px; color: #744210; font-size: 14px; font-weight: 600; line-height: 1.5;">
                                🔒 Security Notice
                              </p>
                              <p style="margin: 0; color: #744210; font-size: 14px; line-height: 1.5;">
                                This password reset link will expire in <strong>24 hours</strong>. If you didn't request this password reset, please ignore this email or contact our support team if you have security concerns.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 40px; text-align: center; background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px; color: #2d3748; font-size: 14px; font-weight: 600; line-height: 1.5;">
                          ${companyLegalName}
                        </p>
                        <p style="margin: 0 0 12px; color: #718096; font-size: 13px; line-height: 1.5;">
                          Construction Management Platform
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.4;">
                          © ${new Date().getFullYear()} ${companyLegalName}. All Rights Reserved.<br>
                          This is an automated message, please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;
    } else if (type === 'welcome') {
      subject = `Welcome to ${companyName}`;
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ${companyName}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7f9;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f7f9;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); overflow: hidden;">
                    
                    <!-- Branded Header -->
                    <tr>
                      <td style="background-color: ${secondaryColor}; padding: 32px 40px; text-align: center;">
                        <img src="${logoUrl}" alt="${companyName}" style="max-width: 280px; height: auto; display: block; margin: 0 auto;">
                      </td>
                    </tr>
                    
                    <!-- Hero Section -->
                    <tr>
                      <td style="padding: 48px 40px 32px; text-align: center;">
                        <h1 style="margin: 0 0 16px; color: ${secondaryColor}; font-size: 28px; font-weight: 700; line-height: 1.2;">
                          Welcome to ${companyName}!
                        </h1>
                        <p style="margin: 0; color: #4a5568; font-size: 18px; line-height: 1.6;">
                          Hi ${userName || 'there'}, your account is ready!
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 0 40px 40px;">
                        <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                          Your account has been successfully created. You can now log in and start managing your construction projects with our comprehensive platform.
                        </p>
                        
                        <!-- Features Box -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f7fafc; border-radius: 8px; padding: 24px; margin-top: 8px;">
                          <tr>
                            <td>
                              <p style="margin: 0 0 12px; color: ${secondaryColor}; font-size: 15px; font-weight: 600;">
                                What's next?
                              </p>
                              <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px; line-height: 1.8;">
                                <li>Set up your profile and preferences</li>
                                <li>Create your first project</li>
                                <li>Invite team members to collaborate</li>
                                <li>Explore estimates, quotes, and time tracking</li>
                              </ul>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 40px; text-align: center; background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px; color: #2d3748; font-size: 14px; font-weight: 600; line-height: 1.5;">
                          ${companyLegalName}
                        </p>
                        <p style="margin: 0 0 12px; color: #718096; font-size: 13px; line-height: 1.5;">
                          Construction Management Platform
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.4;">
                          © ${new Date().getFullYear()} ${companyLegalName}. All Rights Reserved.<br>
                          This is an automated message, please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;
    } else if (type === 'user-invitation') {
      subject = `Welcome to ${companyName} - Your Account is Ready`;
      
      // Determine credential section based on invite method
      let credentialsSection = '';
      if (inviteMethod === 'temporary') {
        credentialsSection = `
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3e7; border-left: 4px solid ${accentColor}; border-radius: 8px; margin: 32px 0;">
            <tr>
              <td style="padding: 24px;">
                <p style="font-weight: 600; color: #744210; margin: 0 0 12px; font-size: 16px;">
                  🔑 Your Temporary Password
                </p>
                <p style="color: #744210; margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
                  Use this temporary password to log in. You'll be required to change it on your first login.
                </p>
                <div style="background: #ffffff; border: 2px dashed ${accentColor}; border-radius: 6px; padding: 16px; text-align: center; margin: 16px 0;">
                  <code style="font-size: 20px; font-weight: bold; color: ${primaryColor}; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                    ${tempPassword}
                  </code>
                </div>
                <p style="color: #744210; margin: 16px 0 0; font-size: 13px;">
                  ⚠️ You will be required to change this password on your first login for security.
                </p>
              </td>
            </tr>
          </table>
        `;
      } else if (inviteMethod === 'permanent') {
        credentialsSection = `
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3e7; border-left: 4px solid ${accentColor}; border-radius: 8px; margin: 32px 0;">
            <tr>
              <td style="padding: 24px;">
                <p style="font-weight: 600; color: #744210; margin: 0 0 12px; font-size: 16px;">
                  🔑 Your Account Credentials
                </p>
                <p style="color: #744210; margin: 0; font-size: 14px; line-height: 1.6;">
                  Your administrator has set a password for your account. Use the password provided to you by your administrator to log in.
                </p>
              </td>
            </tr>
          </table>
        `;
      }

      // Role-specific features
      let roleFeatures = '';
      const roleName = userRole || 'team member';
      
      if (userRole === 'admin') {
        roleFeatures = `
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">👥 User Management:</strong> Create and manage team members
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">📊 Financial Reports:</strong> Access comprehensive analytics
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">🏗️ Project Oversight:</strong> Manage all projects across teams
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">⚙️ System Settings:</strong> Configure company-wide preferences
          </li>
        `;
      } else if (userRole === 'manager') {
        roleFeatures = `
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">✅ Time Approval:</strong> Review and approve team time entries
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">📋 Estimates:</strong> Create and manage project estimates
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">💰 Budget Tracking:</strong> Monitor project costs and margins
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">👥 Team Coordination:</strong> Oversee field worker activities
          </li>
        `;
      } else if (userRole === 'field_worker') {
        roleFeatures = `
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">⏱️ Time Tracking:</strong> Log hours on mobile or desktop
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">📸 Media Capture:</strong> Upload photos and videos from the field
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">📝 Work Orders:</strong> View and update task assignments
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">💳 Expense Reports:</strong> Submit receipts and expenses
          </li>
        `;
      } else {
        roleFeatures = `
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">🏗️ Project Access:</strong> View and manage assigned projects
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">⏱️ Time Tracking:</strong> Log your work hours
          </li>
          <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
            <strong style="color: ${primaryColor};">📊 Reports:</strong> Access relevant project data
          </li>
        `;
      }

      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ${companyName}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7f9;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f7f9;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); overflow: hidden;">
                    
                    <!-- Branded Header -->
                    <tr>
                      <td style="background-color: ${primaryColor}; padding: 32px 40px; text-align: center;">
                        <img src="${logoUrl}" alt="${companyName}" style="max-width: 280px; height: auto; display: block; margin: 0 auto;">
                      </td>
                    </tr>
                    
                    <!-- Hero Section -->
                    <tr>
                      <td style="padding: 48px 40px 24px;">
                        <h1 style="color: ${primaryColor}; font-size: 28px; font-weight: bold; margin: 0 0 16px; text-align: center;">
                          Welcome to ${companyName}!
                        </h1>
                        
                        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                          Hi <strong>${userName || email}</strong>, your account has been created and you're ready to get started.
                        </p>

                        <!-- Role Badge -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 16px;">
                          <tr>
                            <td align="center">
                              <div style="display: inline-block; background: ${lightBgColor}; color: ${primaryColor}; padding: 8px 20px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                                Your Role: ${roleName.charAt(0).toUpperCase() + roleName.slice(1).replace('_', ' ')}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Credentials Section -->
                    <tr>
                      <td style="padding: 0 40px;">
                        ${credentialsSection}
                      </td>
                    </tr>

                    <!-- Login Button -->
                    <tr>
                      <td style="padding: 0 40px 32px;" align="center">
                        <table role="presentation" style="border-collapse: collapse;">
                          <tr>
                            <td style="background: ${primaryColor}; border-radius: 8px; padding: 16px 48px; box-shadow: 0 2px 8px rgba(207, 121, 29, 0.25);">
                              <a href="https://rcgwork.com" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                                Go to RCG Work →
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Getting Started -->
                    <tr>
                      <td style="padding: 0 40px 32px;">
                        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px;">
                          <h2 style="color: ${primaryColor}; font-size: 20px; font-weight: bold; margin: 0 0 16px;">
                            🚀 Getting Started
                          </h2>
                          <ol style="margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
                              Log in to your account at <a href="https://rcgwork.com" style="color: ${accentColor}; text-decoration: underline;">rcgwork.com</a>
                            </li>
                            <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
                              Complete your profile with additional details
                            </li>
                            <li style="margin-bottom: 12px; color: #555555; line-height: 1.6;">
                              Explore your dashboard and available features
                            </li>
                            <li style="margin-bottom: 0; color: #555555; line-height: 1.6;">
                              Start collaborating with your team
                            </li>
                          </ol>
                        </div>
                      </td>
                    </tr>

                    <!-- Role-Specific Features -->
                    <tr>
                      <td style="padding: 0 40px 32px;">
                        <h2 style="color: ${primaryColor}; font-size: 20px; font-weight: bold; margin: 0 0 16px;">
                          📱 Your Key Features
                        </h2>
                        <ul style="margin: 0; padding-left: 20px;">
                          ${roleFeatures}
                        </ul>
                      </td>
                    </tr>

                    <!-- Support Section -->
                    <tr>
                      <td style="padding: 0 40px 32px;">
                        <div style="background: ${lightBgColor}; border-radius: 8px; padding: 20px; border-left: 4px solid ${accentColor};">
                          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">
                            <strong style="color: ${primaryColor};">Need help?</strong><br>
                            If you have any questions or need assistance, please contact your administrator or reply to this email.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <!-- Security Notice -->
                    <tr>
                      <td style="padding: 0 40px 40px;">
                        <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                          If you didn't expect this account creation, please contact your administrator immediately.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 40px; text-align: center; background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px; color: #2d3748; font-size: 14px; font-weight: 600; line-height: 1.5;">
                          ${companyLegalName}
                        </p>
                        <p style="margin: 0 0 12px; color: #718096; font-size: 13px; line-height: 1.5;">
                          Construction Management Platform
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.4;">
                          © ${new Date().getFullYear()} ${companyLegalName}. All Rights Reserved.<br>
                          This is an automated message, please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: `${companyName} <noreply@rcgwork.com>`,
      to: [email],
      subject,
      html,
    });

    console.log('✅ Branded email sent successfully:', { 
      id: emailResponse.data?.id, 
      type,
      email,
      companyName
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Error sending branded email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
