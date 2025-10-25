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
    const companyAbbreviation = branding?.company_abbreviation || 'RCG';
    const primaryColor = branding?.primary_color || '#cf791d';
    const secondaryColor = branding?.secondary_color || '#1b2b43';
    const accentColor = branding?.accent_color || '#cf791d';
    const lightBgColor = branding?.light_bg_color || '#f4f7f9';

    // Determine base URL from request origin for dynamic environment support
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://rcgwork.com';
    const baseUrl = new URL(origin).origin;
    const loginUrl = `${baseUrl}/auth`;

    console.log('📍 Environment URLs:', { origin, baseUrl, loginUrl });

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
            <!--[if mso]>
            <style type="text/css">
              body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
            </style>
            <![endif]-->
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${lightBgColor}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
            
            <!-- Preheader text (hidden but shows in email preview) -->
            <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
              Reset your password to regain access to your ${companyName} account
            </div>
            
            <!-- Email wrapper table -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${lightBgColor}; margin: 0; padding: 0;">
              <tr>
                <td align="center" style="padding: 48px 20px;">
                  
                  <!-- Main content container -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(27, 43, 67, 0.12); overflow: hidden;">
                    
                    <!-- Branded Header with Navy Gradient -->
                    <tr>
                      <td style="background: linear-gradient(135deg, ${secondaryColor} 0%, #243550 100%); padding: 40px 48px; text-align: center; border-bottom: 4px solid ${primaryColor};">
                        <img src="${logoUrl}" alt="${companyName}" style="max-width: 260px; height: auto; display: block; margin: 0 auto;" />
                      </td>
                    </tr>
                    
                    <!-- Hero Section with Icon -->
                    <tr>
                      <td style="padding: 56px 48px 32px; text-align: center;">
                        
                        <!-- Lock Icon -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="80" style="margin: 0 auto 24px;">
                          <tr>
                            <td style="width: 80px; height: 80px; background-color: ${primaryColor}15; border-radius: 50%; text-align: center; vertical-align: middle;">
                              <svg width="40" height="40" viewBox="0 0 40 40" style="display: inline-block; vertical-align: middle;">
                                <path d="M20 10C17.239 10 15 12.239 15 15V18H13C11.895 18 11 18.895 11 20V28C11 29.105 11.895 30 13 30H27C28.105 30 29 29.105 29 28V20C29 18.895 28.105 18 27 18H25V15C25 12.239 22.761 10 20 10ZM23 18H17V15C17 13.343 18.343 12 20 12C21.657 12 23 13.343 23 15V18Z" fill="${primaryColor}"/>
                              </svg>
                            </td>
                          </tr>
                        </table>
                        
                        <h1 style="margin: 0 0 16px; color: ${secondaryColor}; font-size: 32px; font-weight: 700; line-height: 1.2; letter-spacing: -0.5px;">
                          Reset Your Password
                        </h1>
                        <p style="margin: 0; color: #4a5568; font-size: 17px; line-height: 1.6; max-width: 440px; margin: 0 auto;">
                          We received a request to reset your password for your ${companyName} account.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Content Section -->
                    <tr>
                      <td style="padding: 0 48px 40px;">
                        <p style="margin: 0 0 32px; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                          Click the button below to create a new password:
                        </p>
                        
                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 0 0 32px;">
                              <!--[if mso]>
                              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetUrl}" style="height:56px;v-text-anchor:middle;width:240px;" arcsize="14%" strokecolor="${primaryColor}" fillcolor="${primaryColor}">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">Reset Password</center>
                              </v:roundrect>
                              <![endif]-->
                              <!--[if !mso]><!-->
                              <a href="${resetUrl}" target="_blank" style="display: inline-block; min-width: 240px; padding: 18px 48px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 4px 14px rgba(207, 121, 29, 0.35); transition: all 0.2s ease;">
                                Reset Password
                              </a>
                              <!--<![endif]-->
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Alternative Link Section -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid ${primaryColor};">
                          <tr>
                            <td>
                              <p style="margin: 0 0 12px; color: #718096; font-size: 14px; line-height: 1.5; font-weight: 500;">
                                Or copy and paste this link:
                              </p>
                              <p style="margin: 0; word-break: break-all;">
                                <a href="${resetUrl}" style="color: ${primaryColor}; font-size: 13px; text-decoration: underline; font-family: 'Courier New', monospace;">${resetUrl}</a>
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                      <td style="padding: 0 48px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fffbf0; border-radius: 8px; padding: 20px; border: 1px solid #ffd666;">
                          <tr>
                            <td>
                              <p style="margin: 0; color: #8b6914; font-size: 14px; line-height: 1.6; text-align: center;">
                                <strong>🔒 Security Notice:</strong> This link will expire in 24 hours. If you didn't request this password reset, you can safely ignore this email.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 48px; text-align: center; background: linear-gradient(180deg, #ffffff 0%, ${lightBgColor} 100%); border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px; color: ${secondaryColor}; font-size: 15px; font-weight: 600; line-height: 1.5;">
                          ${companyLegalName}
                        </p>
                        <p style="margin: 0 0 16px; color: #718096; font-size: 14px; line-height: 1.5;">
                          ${companyAbbreviation} Construction Management Platform
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.6;">
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
      
      if (userRole === 'admin' || userRole === 'owner') {
        roleFeatures = `
          <tr>
            <td style="padding: 10px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="40" style="vertical-align: top;">
                    <div style="width: 32px; height: 32px; background-color: ${primaryColor}15; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 18px;">👥</span>
                    </div>
                  </td>
                  <td style="vertical-align: top; padding-left: 12px;">
                    <p style="margin: 0 0 4px; color: ${secondaryColor}; font-size: 15px; font-weight: 600; line-height: 1.4;">
                      Full System Access
                    </p>
                    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      Manage users, projects, quotes, and all financial data
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      } else if (userRole === 'project_manager') {
        roleFeatures = `
          <tr>
            <td style="padding: 10px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="40" style="vertical-align: top;">
                    <div style="width: 32px; height: 32px; background-color: ${primaryColor}15; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 18px;">📋</span>
                    </div>
                  </td>
                  <td style="vertical-align: top; padding-left: 12px;">
                    <p style="margin: 0 0 4px; color: ${secondaryColor}; font-size: 15px; font-weight: 600; line-height: 1.4;">
                      Project Management
                    </p>
                    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      Track projects, manage expenses, and monitor profitability
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      } else if (userRole === 'estimator') {
        roleFeatures = `
          <tr>
            <td style="padding: 10px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="40" style="vertical-align: top;">
                    <div style="width: 32px; height: 32px; background-color: ${primaryColor}15; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 18px;">📊</span>
                    </div>
                  </td>
                  <td style="vertical-align: top; padding-left: 12px;">
                    <p style="margin: 0 0 4px; color: ${secondaryColor}; font-size: 15px; font-weight: 600; line-height: 1.4;">
                      Estimates & Quotes
                    </p>
                    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      Create detailed estimates and professional quotes
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      } else {
        roleFeatures = `
          <tr>
            <td style="padding: 10px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="40" style="vertical-align: top;">
                    <div style="width: 32px; height: 32px; background-color: ${primaryColor}15; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 18px;">⏱️</span>
                    </div>
                  </td>
                  <td style="vertical-align: top; padding-left: 12px;">
                    <p style="margin: 0 0 4px; color: ${secondaryColor}; font-size: 15px; font-weight: 600; line-height: 1.4;">
                      Time Tracking
                    </p>
                    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      Log hours and track your work on projects
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      }

      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ${companyName}</title>
            <!--[if mso]>
            <style type="text/css">
              body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
            </style>
            <![endif]-->
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${lightBgColor}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
            
            <!-- Preheader text -->
            <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
              Welcome to ${companyName}! Get started with your new construction management account.
            </div>
            
            <!-- Email wrapper table -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${lightBgColor}; margin: 0; padding: 0;">
              <tr>
                <td align="center" style="padding: 48px 20px;">
                  
                  <!-- Main content container -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(27, 43, 67, 0.12); overflow: hidden;">
                    
                    <!-- Branded Header with Orange Gradient -->
                    <tr>
                      <td style="background: linear-gradient(135deg, ${primaryColor} 0%, #e08a2a 100%); padding: 40px 48px; text-align: center; position: relative;">
                        <img src="${logoUrl}" alt="${companyName}" style="max-width: 260px; height: auto; display: block; margin: 0 auto; filter: brightness(0) invert(1);" />
                      </td>
                    </tr>
                    
                    <!-- Decorative Border -->
                    <tr>
                      <td style="background: linear-gradient(90deg, ${secondaryColor} 0%, ${primaryColor} 50%, ${secondaryColor} 100%); height: 4px;"></td>
                    </tr>
                    
                    <!-- Hero Section -->
                    <tr>
                      <td style="padding: 56px 48px 32px; text-align: center;">
                        
                        <!-- Welcome Icon -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="80" style="margin: 0 auto 24px;">
                          <tr>
                            <td style="width: 80px; height: 80px; background: linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%); border-radius: 50%; text-align: center; vertical-align: middle; border: 3px solid ${primaryColor}30;">
                              <svg width="40" height="40" viewBox="0 0 40 40" style="display: inline-block; vertical-align: middle;">
                                <path d="M20 2L7 10v10c0 8.15 5.63 15.78 13 17.67C27.37 35.78 33 28.15 33 20V10L20 2zm0 4.5l10 6.25V20c0 6.5-4.5 12.6-10 14.25C14.5 32.6 10 26.5 10 20v-7.25l10-6.25zM17 22l-3-3-1.5 1.5L17 25l9-9-1.5-1.5L17 22z" fill="${primaryColor}"/>
                              </svg>
                            </td>
                          </tr>
                        </table>
                        
                        <h1 style="margin: 0 0 16px; color: ${secondaryColor}; font-size: 36px; font-weight: 700; line-height: 1.2; letter-spacing: -0.5px;">
                          Welcome to ${companyName}!
                        </h1>
                        <p style="margin: 0; color: #4a5568; font-size: 18px; line-height: 1.6; max-width: 480px; margin: 0 auto;">
                          Hi <strong style="color: ${secondaryColor};">${userName || email}</strong>, your account has been created and you're ready to get started.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Role Badge -->
                    <tr>
                      <td style="padding: 0 48px 32px; text-align: center;">
                        <div style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}08 100%); border-radius: 24px; border: 2px solid ${primaryColor}30;">
                          <p style="margin: 0; color: ${primaryColor}; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            🎯 ${roleName.charAt(0).toUpperCase() + roleName.slice(1).replace('_', ' ')}
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Login Credentials Section -->
                    <tr>
                      <td style="padding: 0 48px 32px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, ${secondaryColor}08 0%, ${primaryColor}05 100%); border-radius: 12px; padding: 28px; border-left: 4px solid ${primaryColor};">
                          <tr>
                            <td>
                              <h3 style="margin: 0 0 16px; color: ${secondaryColor}; font-size: 18px; font-weight: 600;">
                                Your Login Credentials
                              </h3>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <p style="margin: 0; color: #718096; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                      Email
                                    </p>
                                    <p style="margin: 4px 0 0; color: ${secondaryColor}; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">
                                      ${email}
                                    </p>
                                  </td>
                                </tr>
                                ${tempPassword ? `
                                <tr>
                                  <td style="padding: 16px 0 8px; border-top: 1px solid ${primaryColor}20;">
                                    <p style="margin: 0; color: #718096; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                      Temporary Password
                                    </p>
                                    <p style="margin: 4px 0 0; color: ${primaryColor}; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 2px dashed ${primaryColor}40;">
                                      ${tempPassword}
                                    </p>
                                  </td>
                                </tr>
                                ` : ''}
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                      <td style="padding: 0 48px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center">
                              <!--[if mso]>
                              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${loginUrl}" style="height:56px;v-text-anchor:middle;width:260px;" arcsize="14%" strokecolor="${primaryColor}" fillcolor="${primaryColor}">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:sans-serif;font-size:17px;font-weight:700;">Access Your Account</center>
                              </v:roundrect>
                              <![endif]-->
                              <!--[if !mso]><!-->
                              <a href="${loginUrl}" target="_blank" style="display: inline-block; min-width: 260px; padding: 18px 48px; background: linear-gradient(135deg, ${primaryColor} 0%, #e08a2a 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 17px; text-align: center; box-shadow: 0 6px 20px rgba(207, 121, 29, 0.4); transition: all 0.2s ease; letter-spacing: 0.3px;">
                                Access Your Account →
                              </a>
                              <!--<![endif]-->
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- What You Can Do Section -->
                    <tr>
                      <td style="padding: 0 48px 40px;">
                        <h3 style="margin: 0 0 20px; color: ${secondaryColor}; font-size: 20px; font-weight: 600; text-align: center;">
                          What You Can Do
                        </h3>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          ${roleFeatures}
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                      <td style="padding: 0 48px 40px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fffbf0; border-radius: 8px; padding: 20px; border: 1px solid #ffd666;">
                          <tr>
                            <td>
                              <p style="margin: 0; color: #8b6914; font-size: 14px; line-height: 1.6; text-align: center;">
                                ${tempPassword ? 
                                  '<strong>🔐 Important:</strong> Please change your temporary password after your first login for security.' : 
                                  '<strong>🔒 Security Notice:</strong> If you didn\'t expect this account creation, please contact your administrator immediately.'
                                }
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 48px; text-align: center; background: linear-gradient(180deg, #ffffff 0%, ${lightBgColor} 100%); border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px; color: ${secondaryColor}; font-size: 15px; font-weight: 600; line-height: 1.5;">
                          ${companyLegalName}
                        </p>
                        <p style="margin: 0 0 16px; color: #718096; font-size: 14px; line-height: 1.5;">
                          ${companyAbbreviation} Construction Management Platform
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.6;">
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
