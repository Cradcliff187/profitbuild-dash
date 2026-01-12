import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptData {
  id: string;
  user_id: string;
  amount: number;
  payee_id?: string;
  project_id?: string;
  description?: string;
  captured_at: string;
  image_url: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('ResendAPI');
    
    if (!resendApiKey) {
      console.error('❌ ResendAPI secret not configured');
      throw new Error('Email service not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse the receipt data from the request
    const receiptData: ReceiptData = await req.json();
    console.log('📄 Processing receipt notification:', receiptData.id);

    // Fetch company branding settings
    const { data: branding } = await supabase
      .from('company_branding_settings')
      .select('*')
      .single();

    const companyName = branding?.company_name || 'Radcliff Construction Group';
    const companyLegalName = branding?.company_legal_name || 'Radcliff Construction Group, LLC';
    const companyAbbreviation = branding?.company_abbreviation || 'RCG';
    const primaryColor = branding?.primary_color || '#cf791d';
    const secondaryColor = branding?.secondary_color || '#1b2b43';
    const accentColor = branding?.accent_color || '#cf791d';
    const lightBgColor = branding?.light_bg_color || '#f4f7f9';
    const logoUrl = branding?.logo_full_url || 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Full%20Horizontal%20Logo%20-%201500x500.png';
    
    const resend = new Resend(resendApiKey);

    // Fetch receipt details
    console.log('🔍 Fetching receipt:', receiptData.id);
    const { data: receiptRow, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptData.id)
      .single();

    if (receiptError) {
      console.error('❌ Error fetching receipt details:', receiptError);
      throw receiptError;
    }

    console.log('✅ Receipt fetched - user_id:', receiptRow.user_id, 'payee_id:', receiptRow.payee_id, 'project_id:', receiptRow.project_id);

    // Fetch profile separately
    let profile: { full_name?: string; email?: string } | null = null;
    if (receiptRow.user_id) {
      console.log('🔍 Fetching profile for user:', receiptRow.user_id);
      const { data: p, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', receiptRow.user_id)
        .single();
      
      if (profileError) {
        console.error('⚠️ Error fetching profile:', profileError);
      } else {
        profile = p;
        console.log('✅ Profile fetched:', profile?.full_name);
      }
    }

    // Fetch payee separately
    let payee: { payee_name?: string } | null = null;
    if (receiptRow.payee_id) {
      console.log('🔍 Fetching payee:', receiptRow.payee_id);
      const { data: py, error: payeeError } = await supabase
        .from('payees')
        .select('payee_name')
        .eq('id', receiptRow.payee_id)
        .single();
      
      if (payeeError) {
        console.error('⚠️ Error fetching payee:', payeeError);
      } else {
        payee = py;
        console.log('✅ Payee fetched:', payee?.payee_name);
      }
    }

    // Fetch project separately
    let project: { project_number?: string; project_name?: string } | null = null;
    if (receiptRow.project_id) {
      console.log('🔍 Fetching project:', receiptRow.project_id);
      const { data: pj, error: projectError } = await supabase
        .from('projects')
        .select('project_number, project_name')
        .eq('id', receiptRow.project_id)
        .single();
      
      if (projectError) {
        console.error('⚠️ Error fetching project:', projectError);
      } else {
        project = pj;
        console.log('✅ Project fetched:', project?.project_number);
      }
    }

    // Format the amount
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(receiptRow.amount);

    // Format the date
    const submittedDate = new Date(receiptRow.captured_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Format compact date for subject line
    const formattedDate = new Date(receiptRow.captured_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Prepare email content
    const employeeName = profile?.full_name || 'Unknown Employee';
    const employeeEmail = profile?.email || 'Unknown Email';
    const payeeName = payee?.payee_name || 'Not specified';
    const projectInfo = project 
      ? `${project.project_number} - ${project.project_name}`
      : 'No project assigned';
    const description = receiptRow.description || 'No description provided';

    // Build the email HTML (matching send-auth-email template structure)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Receipt Submitted</title>
          <!--[if mso]>
          <style type="text/css">
            body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${lightBgColor}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
          
          <!-- Preheader text (hidden but shows in email preview) -->
          <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
            New receipt submitted: ${formattedAmount} from ${employeeName} for ${payeeName}
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
                      
                      <!-- Receipt Icon -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="80" style="margin: 0 auto 24px;">
                        <tr>
                          <td style="width: 80px; height: 80px; background-color: ${primaryColor}15; border-radius: 50%; text-align: center; vertical-align: middle;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
                              <path d="M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 10H9V17H7V10ZM11 7H13V17H11V7ZM15 13H17V17H15V13Z" fill="${primaryColor}"/>
                            </svg>
                          </td>
                        </tr>
                      </table>
                      
                      <h1 style="margin: 0 0 16px; color: ${secondaryColor}; font-size: 32px; font-weight: 700; line-height: 1.2; letter-spacing: -0.5px;">
                        New Receipt Submitted
                      </h1>
                      <p style="margin: 0; color: #4a5568; font-size: 17px; line-height: 1.6; max-width: 440px; margin: 0 auto;">
                        A receipt has been submitted and is ready for review.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Receipt Details Card -->
                  <tr>
                    <td style="padding: 0 48px 32px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, ${secondaryColor}08 0%, ${primaryColor}05 100%); border-radius: 12px; padding: 32px; border-left: 4px solid ${primaryColor};">
                        <tr>
                          <td>
                            <h2 style="margin: 0 0 24px; color: ${secondaryColor}; font-size: 20px; font-weight: 600;">
                              Receipt Details
                            </h2>
                            
                            <!-- Amount - Featured -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
                              <tr>
                                <td>
                                  <p style="margin: 0 0 4px; color: #718096; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Amount
                                  </p>
                                  <p style="margin: 0; color: ${primaryColor}; font-size: 28px; font-weight: 700; line-height: 1.2;">
                                    ${formattedAmount}
                                  </p>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- Submitted By -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                              <tr>
                                <td>
                                  <p style="margin: 0 0 4px; color: #718096; font-size: 13px; font-weight: 500;">
                                    Submitted By
                                  </p>
                                  <p style="margin: 0 0 2px; color: ${secondaryColor}; font-size: 16px; font-weight: 600;">
                                    ${employeeName}
                                  </p>
                                  <p style="margin: 0; color: #718096; font-size: 14px;">
                                    ${employeeEmail}
                                  </p>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- Payee/Vendor -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                              <tr>
                                <td>
                                  <p style="margin: 0 0 4px; color: #718096; font-size: 13px; font-weight: 500;">
                                    Payee/Vendor
                                  </p>
                                  <p style="margin: 0; color: ${secondaryColor}; font-size: 16px; font-weight: 600;">
                                    ${payeeName}
                                  </p>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- Project -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                              <tr>
                                <td>
                                  <p style="margin: 0 0 4px; color: #718096; font-size: 13px; font-weight: 500;">
                                    Project
                                  </p>
                                  <p style="margin: 0; color: ${secondaryColor}; font-size: 16px; font-weight: 600;">
                                    ${projectInfo}
                                  </p>
                                </td>
                              </tr>
                            </table>
                            
                            ${description !== 'No description provided' ? `
                            <!-- Description -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                              <tr>
                                <td>
                                  <p style="margin: 0 0 4px; color: #718096; font-size: 13px; font-weight: 500;">
                                    Description
                                  </p>
                                  <p style="margin: 0; color: ${secondaryColor}; font-size: 15px; line-height: 1.5;">
                                    ${description}
                                  </p>
                                </td>
                              </tr>
                            </table>
                            ` : ''}
                            
                            <!-- Submitted Date -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td>
                                  <p style="margin: 0 0 4px; color: #718096; font-size: 13px; font-weight: 500;">
                                    Submitted On
                                  </p>
                                  <p style="margin: 0; color: #718096; font-size: 14px;">
                                    ${submittedDate}
                                  </p>
                                </td>
                              </tr>
                            </table>
                            
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Action Notice -->
                  <tr>
                    <td style="padding: 0 48px 40px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3e7; border-radius: 8px; padding: 20px; border-left: 3px solid ${accentColor};">
                        <tr>
                          <td>
                            <p style="margin: 0; color: #744210; font-size: 14px; line-height: 1.6; font-weight: 500;">
                              <strong>⚠️ Action Required:</strong> A receipt image has been submitted and requires review. Please log in to the system to view the receipt image and process this submission.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td style="padding: 0 48px 32px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td align="center">
                            <a href="https://rcgwork.com/time-entries?tab=receipts" 
                               style="display: inline-block; background-color: ${accentColor}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                              📋 Review Receipt
                            </a>
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

    // Send email via Resend
    console.log('📨 Sending receipt notification email...');
    const emailSubject = `RCG Receipt: ${project?.project_number || 'No Project'} - ${payeeName} - ${formattedDate}`;
    console.log('📧 Subject:', emailSubject);
    
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${companyName} <noreply@rcgwork.com>`,
      to: 'receipts@radcliffcg.com',
      reply_to: profile?.email || undefined,
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('❌ Failed to send email:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log('✅ Receipt notification email sent successfully:', emailResult?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Receipt notification sent',
        emailId: emailResult?.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-receipt-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
