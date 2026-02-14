import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  fetchBranding,
  buildBrandedEmail,
  buildHeroSection,
  buildCtaButton,
  buildNoticeBox,
  buildDetailCard,
  buildAlternativeLink,
  escapeHtml,
  EMAIL_COLORS,
  EMAIL_ICONS,
  type BrandingConfig,
} from '../_shared/brandedTemplate.ts';

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

// ── Role feature row (table-based for Outlook) ─────────────────────
function buildRoleFeature(
  userRole: string | undefined,
  branding: BrandingConfig,
): string {
  const features: Record<string, { emoji: string; title: string; desc: string }> = {
    admin:           { emoji: '&#128101;', title: 'Full System Access',  desc: 'Manage users, projects, quotes, and all financial data' },
    owner:           { emoji: '&#128101;', title: 'Full System Access',  desc: 'Manage users, projects, quotes, and all financial data' },
    project_manager: { emoji: '&#128203;', title: 'Project Management', desc: 'Track projects, manage expenses, and monitor profitability' },
    estimator:       { emoji: '&#128202;', title: 'Estimates &amp; Quotes', desc: 'Create detailed estimates and professional quotes' },
  };
  const fallback = { emoji: '&#9200;', title: 'Time Tracking', desc: 'Log hours and track your work on projects' };
  const f = features[userRole || ''] || fallback;

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 10px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td width="44" style="vertical-align: top;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="width: 32px; height: 32px; background-color: ${EMAIL_COLORS.primaryLight15}; border-radius: 6px; text-align: center; vertical-align: middle; font-size: 18px;">
                      ${f.emoji}
                    </td>
                  </tr>
                </table>
              </td>
              <td style="vertical-align: top; padding-left: 12px;">
                <p style="margin: 0 0 4px; color: ${branding.secondaryColor}; font-size: 15px; font-weight: 600; line-height: 1.4;">
                  ${f.title}
                </p>
                <p style="margin: 0; color: ${EMAIL_COLORS.textTertiary}; font-size: 14px; line-height: 1.6;">
                  ${f.desc}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

// ── Main handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('ResendAPI');
    if (!resendApiKey) {
      console.error('❌ ResendAPI secret not configured');
      throw new Error('Email service not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const branding = await fetchBranding(supabase);

    // Dynamic base URL from request origin
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://rcgwork.com';
    const baseUrl = new URL(origin).origin;
    const loginUrl = `${baseUrl}/auth`;

    console.log('📍 Environment URLs:', { origin, baseUrl, loginUrl });

    const resend = new Resend(resendApiKey);
    const { type, email, resetUrl, userName, userRole, tempPassword, inviteMethod } =
      (await req.json()) as AuthEmailRequest;

    console.log('📧 Sending branded auth email:', { type, email, hasResetUrl: !!resetUrl, companyName: branding.companyName });

    let subject = '';
    let html = '';

    // ────────────────────────────────────────────────────────────────
    // PASSWORD RESET
    // ────────────────────────────────────────────────────────────────
    if (type === 'password-reset') {
      if (!resetUrl) throw new Error('resetUrl is required for password reset emails');

      subject = `Reset Your Password - ${branding.companyName}`;

      const heroHtml = buildHeroSection({
        iconUrl: EMAIL_ICONS.lock,
        iconAlt: 'Password Reset',
        title: 'Reset Your Password',
        subtitle: `We received a request to reset your password for your ${escapeHtml(branding.companyName)} account.`,
        branding,
      });

      const bodyHtml = `
        <p style="margin: 0 0 32px; color: ${EMAIL_COLORS.textSecondary}; font-size: 16px; line-height: 1.6; text-align: center;">
          Click the button below to create a new password:
        </p>

        <div style="margin-bottom: 32px;">
          ${buildCtaButton({ href: resetUrl, label: 'Reset Password', branding })}
        </div>

        <div style="margin-bottom: 32px;">
          ${buildAlternativeLink({ href: resetUrl, branding })}
        </div>

        ${buildNoticeBox({
          type: 'warning',
          html: '<strong>Security Notice:</strong> This link will expire in 24 hours. If you didn\'t request this password reset, you can safely ignore this email.',
        })}
      `;

      html = buildBrandedEmail(branding, {
        preheaderText: `Reset your password to regain access to your ${branding.companyName} account`,
        title: 'Reset Your Password',
        heroHtml,
        bodyHtml,
      });

    // ────────────────────────────────────────────────────────────────
    // WELCOME
    // ────────────────────────────────────────────────────────────────
    } else if (type === 'welcome') {
      subject = `Welcome to ${branding.companyName}`;

      const heroHtml = buildHeroSection({
        iconUrl: EMAIL_ICONS.shield,
        iconAlt: 'Welcome',
        title: `Welcome to ${branding.companyName}!`,
        subtitle: `Hi ${escapeHtml(userName || 'there')}, your account is ready!`,
        branding,
      });

      const bodyHtml = `
        <p style="margin: 0 0 24px; color: ${EMAIL_COLORS.textSecondary}; font-size: 16px; line-height: 1.6; text-align: center;">
          Your account has been successfully created. You can now log in and start managing your construction projects with our comprehensive platform.
        </p>

        <div style="margin-bottom: 32px;">
          ${buildDetailCard({
            branding,
            contentHtml: `
              <p style="margin: 0 0 12px; color: ${branding.secondaryColor}; font-size: 15px; font-weight: 600;">
                What's next?
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr><td style="padding: 4px 0 4px 16px; color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.8;">&#8226; Set up your profile and preferences</td></tr>
                <tr><td style="padding: 4px 0 4px 16px; color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.8;">&#8226; Create your first project</td></tr>
                <tr><td style="padding: 4px 0 4px 16px; color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.8;">&#8226; Invite team members to collaborate</td></tr>
                <tr><td style="padding: 4px 0 4px 16px; color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.8;">&#8226; Explore estimates, quotes, and time tracking</td></tr>
              </table>
            `,
          })}
        </div>

        ${buildCtaButton({ href: loginUrl, label: 'Get Started', branding })}
      `;

      html = buildBrandedEmail(branding, {
        preheaderText: `Welcome to ${branding.companyName}! Your account is ready.`,
        title: `Welcome to ${branding.companyName}`,
        heroHtml,
        bodyHtml,
      });

    // ────────────────────────────────────────────────────────────────
    // USER INVITATION
    // ────────────────────────────────────────────────────────────────
    } else if (type === 'user-invitation') {
      subject = `Welcome to ${branding.companyName} - Your Account is Ready`;
      const roleName = userRole || 'team member';

      const heroHtml = buildHeroSection({
        iconUrl: EMAIL_ICONS.shield,
        iconAlt: 'Account Created',
        title: `Welcome to ${branding.companyName}!`,
        subtitle: `Hi <strong style="color: ${branding.secondaryColor};">${escapeHtml(userName || email)}</strong>, your account has been created and you're ready to get started.`,
        branding,
      });

      // Role badge
      const roleBadgeHtml = `
        <div style="text-align: center; margin-bottom: 32px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
            <tr>
              <td style="padding: 10px 24px; background-color: ${EMAIL_COLORS.primaryLight15}; border-radius: 24px; border: 2px solid ${EMAIL_COLORS.primaryBorder30};">
                <p style="margin: 0; color: ${branding.primaryColor}; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${roleName.charAt(0).toUpperCase() + roleName.slice(1).replace('_', ' ')}
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;

      // Credentials card
      const credentialsHtml = buildDetailCard({
        branding,
        title: 'Your Login Credentials',
        contentHtml: `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0; color: ${EMAIL_COLORS.textTertiary}; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                <p style="margin: 4px 0 0; color: ${branding.secondaryColor}; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">
                  ${escapeHtml(email)}
                </p>
              </td>
            </tr>
            ${tempPassword ? `
            <tr>
              <td style="padding: 16px 0 8px; border-top: 1px solid ${EMAIL_COLORS.primaryBorder20};">
                <p style="margin: 0; color: ${EMAIL_COLORS.textTertiary}; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</p>
                <p style="margin: 4px 0 0; color: ${branding.primaryColor}; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 2px dashed ${EMAIL_COLORS.primaryBorder40};">
                  ${escapeHtml(tempPassword)}
                </p>
              </td>
            </tr>
            ` : ''}
          </table>
        `,
      });

      // Security notice
      const securityNotice = buildNoticeBox({
        type: 'warning',
        html: tempPassword
          ? '<strong>Important:</strong> Please change your temporary password after your first login for security.'
          : '<strong>Security Notice:</strong> If you didn\'t expect this account creation, please contact your administrator immediately.',
      });

      const bodyHtml = `
        ${roleBadgeHtml}

        <div style="margin-bottom: 32px;">
          ${credentialsHtml}
        </div>

        <div style="margin-bottom: 32px;">
          ${buildCtaButton({ href: loginUrl, label: 'Access Your Account', branding })}
        </div>

        <h3 style="margin: 0 0 20px; color: ${branding.secondaryColor}; font-size: 20px; font-weight: 600; text-align: center;">
          What You Can Do
        </h3>
        ${buildRoleFeature(userRole, branding)}

        <div style="margin-top: 32px;">
          ${securityNotice}
        </div>
      `;

      html = buildBrandedEmail(branding, {
        preheaderText: `Welcome to ${branding.companyName}! Get started with your new construction management account.`,
        title: `Welcome to ${branding.companyName}`,
        heroHtml,
        bodyHtml,
      });
    }

    // ── Send ──────────────────────────────────────────────────────
    const emailResponse = await resend.emails.send({
      from: `${branding.companyName} <noreply@rcgwork.com>`,
      to: [email],
      subject,
      html,
    });

    console.log('✅ Branded email sent successfully:', {
      id: emailResponse.data?.id,
      type,
      email,
      companyName: branding.companyName,
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('❌ Error sending branded email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
