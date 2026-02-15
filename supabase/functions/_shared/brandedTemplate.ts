import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

// ============================================================
// Types
// ============================================================

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  lightBgColor: string;
  logoFullUrl: string;
  logoIconUrl: string;
  companyName: string;
  companyLegalName: string;
  companyAbbreviation: string;
  companyAddress: string | null;
  companyPhone: string | null;
  companyLicense: string | null;
}

export interface DocumentSection {
  /** Raw HTML string for the body content area */
  bodyHtml: string;
}

// ============================================================
// Branding Fetcher
// ============================================================

/**
 * Fetch company branding settings from Supabase.
 * Returns a normalized config with sensible fallbacks.
 *
 * Use this instead of duplicating the branding fetch + fallback
 * logic in every edge function.
 */
export async function fetchBranding(supabase: SupabaseClient): Promise<BrandingConfig> {
  const { data: branding } = await supabase
    .from('company_branding_settings')
    .select('*')
    .single();

  return {
    primaryColor: branding?.primary_color || '#cf791d',
    secondaryColor: branding?.secondary_color || '#1b2b43',
    accentColor: branding?.accent_color || '#cf791d',
    lightBgColor: branding?.light_bg_color || '#f4f7f9',
    logoFullUrl:
      branding?.logo_full_url ||
      'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/horiztonal%20glossy.png',
    logoIconUrl:
      branding?.logo_icon_url ||
      'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/supabase-icon-only-512x512.png',
    companyName: branding?.company_name || 'Radcliff Construction Group',
    companyLegalName: branding?.company_legal_name || 'Radcliff Construction Group, LLC',
    companyAbbreviation: branding?.company_abbreviation || 'RCG',
    companyAddress: branding?.company_address || null,
    companyPhone: branding?.company_phone || null,
    companyLicense: branding?.company_license || null,
  };
}

// ============================================================
// HTML Helpers
// ============================================================

/**
 * Escape HTML entities to prevent XSS / garbled text in reports.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// Email-Safe Color Constants
// ============================================================

/**
 * Pre-computed solid color alternatives for hex-alpha patterns.
 * Email clients don't support 8-digit hex (#cf791d15) or rgba backgrounds.
 * These are visually equivalent solid colors computed on white.
 */
export const EMAIL_COLORS = {
  // Light tinted backgrounds (replaces ${primaryColor}15, 08, 05)
  primaryLight15: '#fef3e7',
  primaryLight08: '#fef9f2',
  primaryLight05: '#fffbf7',
  secondaryLight08: '#f0f2f5',

  // Border colors (replaces ${primaryColor}20, 30, 40)
  primaryBorder20: '#f5dfc0',
  primaryBorder30: '#efd0a5',
  primaryBorder40: '#e9c18b',

  // Alert/urgency
  overdueLight15: '#fef2f2',
  overdueBorder: '#dc2626',
  overdueText: '#991b1b',

  // Warning box
  warningBg: '#fffbf0',
  warningBorder: '#ffd666',
  warningText: '#8b6914',

  // Action required box
  actionBg: '#fef3e7',
  actionBorder: '#cf791d',
  actionText: '#744210',

  // Standardised gray palette
  textPrimary: '#1a202c',
  textSecondary: '#4a5568',
  textTertiary: '#718096',
  textMuted: '#a0aec0',
  textLight: '#94a3b8',
  borderLight: '#e2e8f0',
} as const;

// ============================================================
// Hosted Email Icon URLs
// ============================================================

const EMAIL_ICON_BASE =
  'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/email-icons';

export const EMAIL_ICONS = {
  lock: `${EMAIL_ICON_BASE}/email-icon-lock.png`,
  shield: `${EMAIL_ICON_BASE}/email-icon-shield.png`,
  receipt: `${EMAIL_ICON_BASE}/email-icon-receipt.png`,
  training: `${EMAIL_ICON_BASE}/email-icon-training.png`,
  trainingOverdue: `${EMAIL_ICON_BASE}/email-icon-training-overdue.png`,
} as const;

export type EmailIconKey = keyof typeof EMAIL_ICONS;

// ============================================================
// Email Component Helpers
// ============================================================

/**
 * Hero section with a hosted PNG icon, title, and subtitle.
 * The subtitle parameter accepts raw HTML – callers must escape user values.
 */
export function buildHeroSection(options: {
  iconUrl: string;
  iconAlt: string;
  title: string;
  /** Raw HTML – caller must escape user-supplied values */
  subtitle: string;
  branding: BrandingConfig;
}): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="80" style="margin: 0 auto 24px;">
      <tr>
        <td style="width: 80px; height: 80px; text-align: center; vertical-align: middle;">
          <img src="${options.iconUrl}" alt="${escapeHtml(options.iconAlt)}" width="80" height="80" style="display: block; border: 0; outline: none;" />
        </td>
      </tr>
    </table>
    <h1 style="margin: 0 0 16px; color: ${options.branding.secondaryColor}; font-size: 32px; font-weight: 700; line-height: 1.2; letter-spacing: -0.5px;">
      ${escapeHtml(options.title)}
    </h1>
    <p style="margin: 0 auto; color: ${EMAIL_COLORS.textSecondary}; font-size: 17px; line-height: 1.6; max-width: 440px;">
      ${options.subtitle}
    </p>
  `;
}

/**
 * CTA button with MSO VML fallback for Outlook.
 */
export function buildCtaButton(options: {
  href: string;
  label: string;
  branding: BrandingConfig;
  width?: number;
}): string {
  const w = options.width || 240;
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${options.href}" style="height:56px;v-text-anchor:middle;width:${w}px;" arcsize="14%" strokecolor="${options.branding.primaryColor}" fillcolor="${options.branding.primaryColor}">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:600;">${escapeHtml(options.label)}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${options.href}" target="_blank" style="display: inline-block; min-width: ${w}px; padding: 18px 48px; background-color: ${options.branding.primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center;">
            ${escapeHtml(options.label)}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

/**
 * Styled notice box (security warning, action required, info).
 */
export function buildNoticeBox(options: {
  type: 'warning' | 'action' | 'info';
  /** Raw HTML content for the notice */
  html: string;
}): string {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    warning: { bg: EMAIL_COLORS.warningBg, border: EMAIL_COLORS.warningBorder, text: EMAIL_COLORS.warningText },
    action: { bg: EMAIL_COLORS.actionBg, border: EMAIL_COLORS.actionBorder, text: EMAIL_COLORS.actionText },
    info: { bg: '#f0f4f8', border: '#4299e1', text: '#2c5282' },
  };
  const s = styles[options.type];
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
      <tr>
        <td style="background-color: ${s.bg}; border-radius: 8px; padding: 20px; border: 1px solid ${s.border};">
          <p style="margin: 0; color: ${s.text}; font-size: 14px; line-height: 1.6; text-align: center;">
            ${options.html}
          </p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Branded detail card with left accent border.
 * Use for credentials, receipt details, training info, etc.
 */
export function buildDetailCard(options: {
  branding: BrandingConfig;
  title?: string;
  /** Raw HTML for the card content */
  contentHtml: string;
}): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
      <tr>
        <td style="background-color: ${EMAIL_COLORS.primaryLight08}; border-radius: 12px; padding: 28px; border-left: 4px solid ${options.branding.primaryColor};">
          ${options.title ? `
            <h3 style="margin: 0 0 16px; color: ${options.branding.secondaryColor}; font-size: 18px; font-weight: 600;">
              ${escapeHtml(options.title)}
            </h3>
          ` : ''}
          ${options.contentHtml}
        </td>
      </tr>
    </table>
  `;
}

/**
 * "Or copy and paste this link" fallback section.
 */
export function buildAlternativeLink(options: {
  href: string;
  branding: BrandingConfig;
}): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
      <tr>
        <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid ${options.branding.primaryColor};">
          <p style="margin: 0 0 12px; color: ${EMAIL_COLORS.textTertiary}; font-size: 14px; line-height: 1.5; font-weight: 500;">
            Or copy and paste this link:
          </p>
          <p style="margin: 0; word-break: break-all;">
            <a href="${options.href}" style="color: ${options.branding.primaryColor}; font-size: 13px; text-decoration: underline; font-family: 'Courier New', monospace;">${options.href}</a>
          </p>
        </td>
      </tr>
    </table>
  `;
}

// ============================================================
// Email Template Builder
// ============================================================

/**
 * Build a complete branded email HTML document.
 *
 * Uses table-based layout for maximum email client compatibility.
 * Includes MSO conditional fallbacks for Outlook.
 */
export function buildBrandedEmail(
  branding: BrandingConfig,
  options: {
    preheaderText: string;
    heroHtml?: string;
    bodyHtml: string;
    footerHtml?: string;
    /** Optional HTML <title> tag content */
    title?: string;
  }
): string {
  const footer =
    options.footerHtml ||
    `
    <p style="margin: 0 0 8px; color: ${branding.secondaryColor}; font-size: 15px; font-weight: 600; line-height: 1.5;">
      ${escapeHtml(branding.companyLegalName)}
    </p>
    <p style="margin: 0 0 16px; color: ${EMAIL_COLORS.textTertiary}; font-size: 14px; line-height: 1.5;">
      ${escapeHtml(branding.companyAbbreviation)} Construction Management Platform
    </p>
    <p style="margin: 0; color: ${EMAIL_COLORS.textMuted}; font-size: 12px; line-height: 1.6;">
      &copy; ${new Date().getFullYear()} ${escapeHtml(branding.companyLegalName)}. All Rights Reserved.<br>
      This is an automated message, please do not reply to this email.
    </p>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${options.title ? `<title>${escapeHtml(options.title)}</title>` : ''}
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${branding.lightBgColor}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

        <!-- Preheader -->
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(options.preheaderText)}
        </div>

        <!-- Wrapper -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${branding.lightBgColor};">
          <tr>
            <td align="center" style="padding: 48px 20px;">

              <!-- Container -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">

                <!-- Branded Header -->
                <tr>
                  <!--[if mso]>
                  <td style="background-color: ${branding.secondaryColor}; padding: 40px 48px; text-align: center; border-bottom: 4px solid ${branding.primaryColor};">
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <td style="background: linear-gradient(135deg, ${branding.secondaryColor} 0%, #243550 100%); padding: 40px 48px; text-align: center; border-bottom: 4px solid ${branding.primaryColor};">
                  <!--<![endif]-->
                    <img src="${branding.logoFullUrl}" alt="${escapeHtml(branding.companyName)}" style="max-width: 260px; height: auto; display: block; margin: 0 auto;" />
                  </td>
                </tr>

                ${options.heroHtml ? `
                <!-- Hero -->
                <tr>
                  <td style="padding: 56px 48px 32px; text-align: center;">
                    ${options.heroHtml}
                  </td>
                </tr>
                ` : ''}

                <!-- Body -->
                <tr>
                  <td style="padding: ${options.heroHtml ? '0' : '48px'} 48px 32px;">
                    ${options.bodyHtml}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <!--[if mso]>
                  <td style="padding: 32px 48px; text-align: center; background-color: ${branding.lightBgColor}; border-top: 1px solid ${EMAIL_COLORS.borderLight};">
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <td style="padding: 32px 48px; text-align: center; background: linear-gradient(180deg, #ffffff 0%, ${branding.lightBgColor} 100%); border-top: 1px solid ${EMAIL_COLORS.borderLight};">
                  <!--<![endif]-->
                    ${footer}
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

// ============================================================
// Report/PDF Template Builder
// ============================================================

/**
 * Convert a hex color string to an "r, g, b" string for use in rgba().
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '207, 121, 29'; // fallback orange
}

/**
 * Build a complete branded HTML document for PDF report generation.
 *
 * Uses CSS-based layout (not table-based like email) since this
 * will be rendered by html2pdf.js/html2canvas, not an email client.
 *
 * @param branding  - Company branding config from fetchBranding()
 * @param options   - Report-specific content
 */
export function buildBrandedReport(
  branding: BrandingConfig,
  options: {
    /** Report title displayed on cover */
    title: string;
    /** Project details section HTML (detail-cell blocks) */
    detailsHtml: string;
    /** Optional summary text */
    summary?: string;
    /** Main body content (stats bar + media timeline) */
    bodyHtml: string;
    /** Optional: recipient name for confidentiality footer */
    recipientName?: string;
    /** Optional: additional CSS to inject */
    additionalCss?: string;
    /** Optional: project number for header display */
    projectNumber?: string;
  }
): string {
  const year = new Date().getFullYear();
  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const companyName = escapeHtml(branding.companyName);
  const companyLegalName = escapeHtml(branding.companyLegalName);
  const companyAbbreviation = escapeHtml(branding.companyAbbreviation);
  const primaryRgb = hexToRgb(branding.primaryColor);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(options.title)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #ffffff;
            color: #1E293B;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
          }

          .report-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
          }

          /* ── Header Bar ──────────────────────────── */
          .report-header-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 56px;
            border-bottom: 1px solid #E2E8F0;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .header-logo-box {
            width: 44px;
            height: 44px;
            border-radius: 8px;
            overflow: hidden;
            flex-shrink: 0;
            background: ${branding.secondaryColor};
            position: relative;
            padding: 5px;
            box-sizing: border-box;
          }

          .header-logo-box::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 3px;
            background: ${branding.primaryColor};
          }

          .header-logo-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            position: relative;
            z-index: 1;
          }

          .header-company {
            font-weight: 700;
            font-size: 15px;
            color: ${branding.secondaryColor};
            line-height: 1.2;
          }

          .header-company small {
            display: block;
            font-weight: 400;
            font-size: 11px;
            color: #64748B;
            letter-spacing: 0.02em;
            margin-top: 2px;
          }

          .header-right { text-align: right; }

          .header-project-num {
            font-weight: 700;
            font-size: 14px;
            color: ${branding.primaryColor};
            letter-spacing: 0.03em;
          }

          .header-date {
            font-size: 11px;
            color: #64748B;
            margin-top: 2px;
          }

          /* ── Cover Hero ──────────────────────────── */
          .cover-hero {
            position: relative;
            background: linear-gradient(160deg, #0F1B33 0%, ${branding.secondaryColor} 45%, #243550 100%);
            padding: 72px 56px 64px;
            overflow: hidden;
          }

          .cover-hero::before {
            content: '';
            position: absolute;
            top: -60px; right: -80px;
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(${primaryRgb}, 0.12) 0%, transparent 70%);
            pointer-events: none;
          }

          .cover-hero::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 4px;
            background: linear-gradient(90deg, ${branding.primaryColor}, ${branding.accentColor}, ${branding.primaryColor});
          }

          .cover-label {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: ${branding.primaryColor};
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
          }

          .cover-label::before {
            content: '';
            width: 24px; height: 2px;
            background: ${branding.primaryColor};
          }

          .cover-title {
            font-family: 'DM Serif Display', Georgia, serif;
            font-size: 38px;
            font-weight: 400;
            color: #ffffff;
            line-height: 1.15;
            margin-bottom: 8px;
            max-width: 560px;
            position: relative;
            z-index: 1;
          }

          .cover-subtitle {
            font-size: 15px;
            color: rgba(255,255,255,0.5);
            position: relative;
            z-index: 1;
          }

          /* ── Details Grid ────────────────────────── */
          .details-section { padding: 40px 56px; }

          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            overflow: hidden;
          }

          .detail-cell {
            padding: 20px 24px;
            border-bottom: 1px solid #E2E8F0;
          }

          .detail-cell:nth-child(odd) { border-right: 1px solid #E2E8F0; }
          .detail-cell:nth-last-child(-n+2) { border-bottom: none; }

          .detail-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #64748B;
            margin-bottom: 6px;
          }

          .detail-value {
            font-size: 15px;
            font-weight: 600;
            color: ${branding.secondaryColor};
            line-height: 1.3;
          }

          .detail-value.mono {
            font-variant-numeric: tabular-nums;
            letter-spacing: 0.03em;
            color: ${branding.primaryColor};
            font-weight: 700;
          }

          /* ── Summary Card ────────────────────────── */
          .summary-section { padding: 0 56px 40px; }

          .summary-card {
            background: #F8F6F3;
            border-radius: 10px;
            padding: 24px 28px;
            border-left: 4px solid ${branding.primaryColor};
          }

          .summary-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: ${branding.secondaryColor};
            margin-bottom: 10px;
          }

          .summary-text {
            font-size: 14px;
            line-height: 1.7;
            color: #475569;
            white-space: pre-wrap;
          }

          /* ── Stats Bar ───────────────────────────── */
          .stats-bar {
            display: flex;
            margin: 0 56px;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            overflow: hidden;
          }

          .stat-item {
            flex: 1;
            padding: 18px 20px;
            text-align: center;
            border-right: 1px solid #E2E8F0;
          }

          .stat-item:last-child { border-right: none; }

          .stat-number {
            font-size: 26px;
            font-weight: 700;
            color: ${branding.secondaryColor};
            line-height: 1;
            font-variant-numeric: tabular-nums;
          }

          .stat-number.orange { color: ${branding.primaryColor}; }

          .stat-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748B;
            margin-top: 6px;
          }

          /* ── Footer ──────────────────────────────── */
          .report-footer {
            background: #0F1B33;
            padding: 32px 56px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
          }

          .report-footer::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, ${branding.primaryColor}, ${branding.accentColor}, ${branding.primaryColor});
          }

          .footer-left {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .footer-logo-mark {
            width: 32px; height: 32px;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
          }

          .footer-logo-mark img {
            width: 100%; height: 100%;
            object-fit: contain;
          }

          .footer-company-name {
            font-size: 13px;
            font-weight: 600;
            color: rgba(255,255,255,0.8);
          }

          .footer-legal {
            font-size: 10px;
            color: rgba(255,255,255,0.35);
            margin-top: 2px;
          }

          .footer-right { text-align: right; }

          .footer-confidential {
            font-size: 10px;
            color: rgba(255,255,255,0.4);
            font-style: italic;
            line-height: 1.5;
          }

          ${options.additionalCss || ''}
        </style>
      </head>
      <body>
        <div class="report-container">

          <!-- Header Bar -->
          <div class="report-header-bar">
            <div class="header-left">
              <div class="header-logo-box">
                <img src="${branding.logoIconUrl}" alt="${companyName}">
              </div>
              <div class="header-company">
                ${companyName}
                <small>${branding.companyAddress ? escapeHtml(branding.companyAddress) : 'Licensed &amp; Insured'}</small>
              </div>
            </div>
            <div class="header-right">
              ${options.projectNumber ? `<div class="header-project-num">${escapeHtml(options.projectNumber)}</div>` : ''}
              <div class="header-date">${formattedDate}</div>
            </div>
          </div>

          <!-- Cover Hero -->
          <div class="cover-hero">
            <div class="cover-label">Project Documentation Report</div>
            <div class="cover-title">${escapeHtml(options.title)}</div>
            ${options.recipientName ? `<div class="cover-subtitle">Prepared for ${escapeHtml(options.recipientName)}</div>` : ''}
          </div>

          <!-- Details Grid -->
          <div class="details-section">
            <div class="details-grid">
              ${options.detailsHtml}
            </div>
          </div>

          <!-- Summary -->
          ${options.summary ? `
          <div class="summary-section">
            <div class="summary-card">
              <div class="summary-label">Report Summary</div>
              <div class="summary-text">${escapeHtml(options.summary)}</div>
            </div>
          </div>
          ` : ''}

          <!-- Body (stats bar + media timeline) -->
          ${options.bodyHtml}

          <!-- Footer -->
          <div class="report-footer">
            <div class="footer-left">
              <div class="footer-logo-mark">
                <img src="${branding.logoIconUrl}" alt="${companyAbbreviation}">
              </div>
              <div>
                <div class="footer-company-name">${companyLegalName}</div>
                <div class="footer-legal">&copy; ${year} ${companyLegalName}. All Rights Reserved.</div>
              </div>
            </div>
            <div class="footer-right">
              ${options.recipientName ? `<div class="footer-confidential">This report is confidential and intended<br>solely for the use of ${escapeHtml(options.recipientName)}.</div>` : ''}
            </div>
          </div>

        </div>
      </body>
    </html>
  `;
}
