import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthEmailRequest {
  type: 'password-reset' | 'welcome';
  email: string;
  tokenHash?: string;
  redirectUrl?: string;
  userName?: string;
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

    const resend = new Resend(resendApiKey);
    const { type, email, tokenHash, redirectUrl, userName } = await req.json() as AuthEmailRequest;

    console.log('📧 Sending auth email:', { type, email, hasToken: !!tokenHash });

    let subject = '';
    let html = '';

    if (type === 'password-reset') {
      if (!tokenHash || !redirectUrl) {
        throw new Error('tokenHash and redirectUrl required for password reset');
      }

      const resetLink = `${redirectUrl}?token_hash=${tokenHash}&type=recovery`;
      
      subject = 'Reset Your Password - RCG Work';
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center;">
                        <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 20px 40px;">
                        <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                          You requested to reset your password for your RCG Work account. Click the button below to create a new password:
                        </p>
                        
                        <!-- Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${resetLink}" 
                                 style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                          Or copy and paste this link into your browser:<br>
                          <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
                        </p>
                        
                        <!-- Security Notice -->
                        <table role="presentation" style="width: 100%; margin-top: 30px; padding: 16px; background-color: #fef3c7; border-radius: 6px; border-collapse: collapse;">
                          <tr>
                            <td>
                              <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                <strong>⚠️ Security Notice:</strong><br>
                                This link will expire in 24 hours. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                          RCG Work - Construction Management<br>
                          This is an automated message, please do not reply.
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
      subject = 'Welcome to RCG Work';
      html = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Welcome to RCG Work!</h1>
            <p>Hi ${userName || 'there'},</p>
            <p>Your account has been created successfully. You can now log in and start managing your projects.</p>
          </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: 'RCG Work <onboarding@resend.dev>',
      to: [email],
      subject,
      html,
    });

    console.log('✅ Email sent successfully:', { 
      id: emailResponse.data?.id, 
      type,
      email 
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
    console.error('❌ Error sending email:', error);
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
