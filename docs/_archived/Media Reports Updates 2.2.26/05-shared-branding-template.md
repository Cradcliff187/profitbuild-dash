# 05 — Shared Branding Template Utility

## Priority: Fifth (Foundation for Report Pipeline)
## Risk Level: Very Low — new file creation only, no existing code modified yet
## Estimated Time: 30 minutes
## Depends On: 01

---

## Context

Four edge functions currently copy-paste identical branding/template code:
- `send-auth-email` — password reset, welcome, user invitation emails
- `send-receipt-notification` — receipt submission emails
- `send-training-notification` — training assignment/reminder emails
- `generate-media-report` — media report HTML generation

Each one independently:
1. Fetches `company_branding_settings` from Supabase
2. Extracts color/logo/name values with identical fallbacks
3. Builds identical HTML header (navy gradient, logo, gold border)
4. Builds identical HTML footer (company legal name, copyright, disclaimer)

This phase creates a shared utility. **No existing edge functions are modified in this phase.** That happens incrementally in later phases as each function is touched for other reasons.

## File to CREATE

### `supabase/functions/_shared/brandedTemplate.ts`

Supabase Edge Functions support shared code via the `_shared` directory convention. Files here can be imported by any function using relative paths.

```typescript
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
      'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Full%20Horizontal%20Logo%20-%201500x500.png',
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
// Email Template Builder
// ============================================================

/**
 * Build a complete branded email HTML document.
 *
 * Uses table-based layout for maximum email client compatibility.
 * Tested pattern across send-auth-email, send-receipt-notification,
 * and send-training-notification.
 *
 * @param branding  - Company branding config from fetchBranding()
 * @param options   - Email-specific content
 */
export function buildBrandedEmail(
  branding: BrandingConfig,
  options: {
    /** Hidden preheader text (shows in email preview, not body) */
    preheaderText: string;
    /** Raw HTML for the hero/icon area (centered, above main content) */
    heroHtml?: string;
    /** Raw HTML for the main body content */
    bodyHtml: string;
    /** Optional footer override. Defaults to standard company footer. */
    footerHtml?: string;
  }
): string {
  const footer =
    options.footerHtml ||
    `
    <p style="margin: 0 0 8px; color: ${branding.secondaryColor}; font-size: 15px; font-weight: 600; line-height: 1.5;">
      ${escapeHtml(branding.companyLegalName)}
    </p>
    <p style="margin: 0 0 16px; color: #718096; font-size: 14px; line-height: 1.5;">
      ${escapeHtml(branding.companyAbbreviation)} Construction Management Platform
    </p>
    <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.6;">
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
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(27, 43, 67, 0.12); overflow: hidden;">

                <!-- Branded Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${branding.secondaryColor} 0%, #243550 100%); padding: 40px 48px; text-align: center; border-bottom: 4px solid ${branding.primaryColor};">
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
                  <td style="padding: 32px 48px; text-align: center; background: linear-gradient(180deg, #ffffff 0%, ${branding.lightBgColor} 100%); border-top: 1px solid #e2e8f0;">
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
    /** Project details section HTML */
    detailsHtml: string;
    /** Optional summary text */
    summary?: string;
    /** Main body content (media items, etc.) */
    bodyHtml: string;
    /** Optional: recipient name for confidentiality footer */
    recipientName?: string;
    /** Optional: additional CSS to inject */
    additionalCss?: string;
  }
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(options.title)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: ${branding.lightBgColor};
            color: #1a202c;
            line-height: 1.6;
          }

          .report-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }

          .header {
            background: linear-gradient(135deg, ${branding.secondaryColor} 0%, #243550 100%);
            padding: 60px 40px;
            text-align: center;
            border-bottom: 4px solid ${branding.primaryColor};
          }

          .logo { max-width: 280px; height: auto; margin-bottom: 20px; }

          .header-title {
            font-size: 36px; font-weight: bold; color: white;
            margin: 20px 0 0 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }

          .cover-content { padding: 40px; }

          .report-title {
            font-size: 28px; font-weight: bold;
            color: ${branding.secondaryColor};
            margin: 0 0 30px 0; text-align: center;
          }

          .project-details {
            background: ${branding.lightBgColor};
            padding: 30px; border-radius: 12px;
            border-left: 4px solid ${branding.primaryColor};
            margin-bottom: 40px;
          }

          .project-details-title {
            color: ${branding.secondaryColor};
            font-size: 18px; font-weight: 600;
            margin-bottom: 20px; display: block;
          }

          .detail-row {
            margin: 12px 0; font-size: 14px; color: #4a5568;
          }

          .detail-row strong {
            color: ${branding.secondaryColor};
            min-width: 100px; display: inline-block;
          }

          .report-summary {
            margin-top: 30px; padding: 20px;
            background: linear-gradient(to right, ${branding.lightBgColor}, #ffffff);
            border-left: 4px solid ${branding.primaryColor};
            border-radius: 8px; page-break-inside: avoid;
          }

          .report-summary-title {
            font-size: 16px; font-weight: bold;
            color: ${branding.secondaryColor}; margin-bottom: 12px;
          }

          .report-summary-text {
            font-size: 14px; line-height: 1.6;
            color: ${branding.secondaryColor}; white-space: pre-wrap;
          }

          .footer {
            padding: 32px 40px; text-align: center;
            background: linear-gradient(180deg, #ffffff 0%, ${branding.lightBgColor} 100%);
            border-top: 1px solid #e2e8f0;
            font-size: 12px; color: #a0aec0;
          }

          .footer-company {
            font-size: 15px; font-weight: 600;
            color: ${branding.secondaryColor}; margin-bottom: 8px;
          }

          ${options.additionalCss || ''}
        </style>
      </head>
      <body>
        <div class="report-container">

          <!-- Header -->
          <div class="header">
            <img src="${branding.logoFullUrl}" alt="${escapeHtml(branding.companyName)}" class="logo">
            <div class="header-title">${escapeHtml(branding.companyName)}</div>
          </div>

          <!-- Cover -->
          <div class="cover-content">
            <div class="report-title">${escapeHtml(options.title)}</div>

            <div class="project-details">
              <span class="project-details-title">PROJECT DETAILS</span>
              ${options.detailsHtml}
              <div class="detail-row">
                <strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>

            ${options.summary ? `
              <div class="report-summary">
                <div class="report-summary-title">REPORT SUMMARY</div>
                <div class="report-summary-text">${escapeHtml(options.summary)}</div>
              </div>
            ` : ''}
          </div>

          <!-- Body -->
          ${options.bodyHtml}

          <!-- Footer -->
          <div class="footer">
            <div class="footer-company">${escapeHtml(branding.companyLegalName)}</div>
            <div>&copy; ${new Date().getFullYear()} ${escapeHtml(branding.companyLegalName)}. All Rights Reserved.</div>
            ${options.recipientName ? `
              <div style="margin-top: 12px; font-size: 11px;">
                This report is confidential and intended solely for the use of ${escapeHtml(options.recipientName)}
              </div>
            ` : ''}
          </div>

        </div>
      </body>
    </html>
  `;
}
```

## Verification

Since this is a NEW file with no consumers yet, verification is simply:

- [ ] File exists at `supabase/functions/_shared/brandedTemplate.ts`
- [ ] No syntax errors (can verify with `deno check supabase/functions/_shared/brandedTemplate.ts` if Deno is available, or review manually)
- [ ] Existing edge functions are completely unmodified — they continue working with their inline templates
- [ ] `npm run build` still passes (this file is outside the Vite build, in the Supabase functions directory)

## How This Gets Used (Preview of Phase 4 Steps)

In `06-report-generation-overhaul.md`, the `generate-media-report` edge function will be updated to:
```typescript
import { fetchBranding, buildBrandedReport, escapeHtml } from '../_shared/brandedTemplate.ts';
```

In `07-email-delivery.md`, the same function will add email support:
```typescript
import { fetchBranding, buildBrandedEmail, escapeHtml } from '../_shared/brandedTemplate.ts';
```

Existing email functions (send-auth-email, etc.) can optionally be migrated to use this shared utility later, but that's out of scope for this improvement set. The important thing is that future functions use the shared utility instead of copy-pasting.

## What NOT to Do

- Do NOT modify any existing edge functions in this phase
- Do NOT try to retroactively migrate send-auth-email / send-receipt-notification / send-training-notification to use this utility — that's a separate effort with its own testing requirements
- Do NOT add Resend imports to this file — email sending is handled by the consuming function, not the template utility
