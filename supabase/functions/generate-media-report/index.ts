import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  fetchBranding,
  buildBrandedReport,
  buildBrandedEmail,
  buildCtaButton,
  buildAlternativeLink,
  buildDetailCard,
  buildNoticeBox,
  escapeHtml,
  EMAIL_COLORS,
  type BrandingConfig,
} from '../_shared/brandedTemplate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ================================================================
// Types
// ================================================================

interface ReportOptions {
  showComments?: boolean;
  showGps?: boolean;
  showTimestamps?: boolean;
  showNumbering?: boolean;
  imageSize?: 'small' | 'medium' | 'large';
}

type ResolvedOptions = Required<ReportOptions>;

interface ReportRequest {
  projectId: string;
  mediaIds: string[];
  reportTitle?: string;
  format?: string;  // Accepted but only 'story' is used
  summary?: string;
  delivery?: 'print' | 'download' | 'email';
  recipientEmail?: string;
  recipientName?: string;
  pdfDownloadUrl?: string;
  mediaCount?: number;
  options?: ReportOptions;
}

interface MediaComment {
  id: string;
  media_id: string;
  comment_text: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

// ================================================================
// Base64 Image Conversion (fixes blank images in PDF)
// ================================================================

async function fetchImageAsBase64(
  url: string,
  timeoutMs = 15000
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`⚠️ Image fetch returned ${response.status}: ${url.slice(0, 80)}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(
      uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.warn(`⚠️ Failed to convert image to base64: ${(error as Error).message}`);
    return null;
  }
}

async function convertMediaToBase64(
  mediaItems: any[],
  delivery: string | undefined
): Promise<any[]> {
  // Only convert for print/download — email uses external image refs which is fine
  if (delivery === 'email') return mediaItems;

  console.log(`🖼️ Converting ${mediaItems.length} images to base64...`);

  const batchSize = 5;
  const results = [...mediaItems];

  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const base64Results = await Promise.all(
      batch.map((media) => fetchImageAsBase64(media.file_url))
    );

    base64Results.forEach((base64Url, idx) => {
      if (base64Url) {
        results[i + idx] = { ...results[i + idx], file_url: base64Url };
      }
      // If conversion fails, keep the signed URL as fallback
    });
  }

  const converted = results.filter((m) => m.file_url?.startsWith('data:')).length;
  console.log(`✅ Base64 conversion: ${converted}/${results.length} succeeded`);

  return results;
}

// ================================================================
// Main Handler
// ================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting media report generation...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = (await req.json()) as ReportRequest;
    const {
      projectId, mediaIds, reportTitle, summary,
      delivery, recipientEmail, recipientName,
      pdfDownloadUrl, mediaCount,
    } = body;

    // Resolve options with defaults
    const opts: ResolvedOptions = {
      showComments: true,
      showGps: true,
      showTimestamps: true,
      showNumbering: true,
      imageSize: 'medium',
      ...body.options,
    };

    console.log(
      `📋 Request: Project ${projectId}, ${mediaIds.length} media items, delivery: ${delivery || 'download'}, imageSize: ${opts.imageSize}`
    );

    // ── Parallel data fetching ──────────────────────────────
    const [branding, projectResult, mediaResult] = await Promise.all([
      fetchBranding(supabase),
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase
        .from('project_media')
        .select('*')
        .in('id', mediaIds)
        .order('taken_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true }),
    ]);

    if (projectResult.error || !projectResult.data) {
      throw new Error('Project not found');
    }
    if (mediaResult.error) {
      throw new Error('Failed to fetch media items: ' + mediaResult.error.message);
    }

    const project = projectResult.data;
    const mediaItems = mediaResult.data || [];
    console.log(`✅ Data loaded: ${mediaItems.length} media items`);

    // ── Batch signed URLs (single request, not N+1) ─────────
    const mediaPaths = mediaItems.map((m: any) => m.file_url).filter(Boolean);
    const { data: signedUrls } = await supabase.storage
      .from('project-media')
      .createSignedUrls(mediaPaths, 3600);

    const signedUrlMap = new Map<string, string>();
    if (signedUrls) {
      signedUrls.forEach((item: any) => {
        if (item.signedUrl && item.path) {
          signedUrlMap.set(item.path, item.signedUrl);
        }
      });
    }
    console.log(`✅ Batch signed URLs generated: ${signedUrlMap.size}`);

    const mediaWithUrls = mediaItems.map((media: any) => ({
      ...media,
      file_url: signedUrlMap.get(media.file_url) || media.file_url,
    }));

    // ── Convert images to base64 for PDF (fixes CORS/blank images) ─
    const mediaWithBase64 = await convertMediaToBase64(mediaWithUrls, delivery);

    // ── Fetch comments (skip query if comments hidden) ──────
    let commentsByMedia = new Map<string, MediaComment[]>();

    if (opts.showComments) {
      const { data: comments } = await supabase
        .from('media_comments')
        .select(`*, profiles:user_id (full_name, email)`)
        .in('media_id', mediaIds)
        .order('created_at', { ascending: true });

      (comments || []).forEach((comment: MediaComment) => {
        if (!commentsByMedia.has(comment.media_id)) {
          commentsByMedia.set(comment.media_id, []);
        }
        commentsByMedia.get(comment.media_id)!.push(comment);
      });
      console.log(`✅ ${comments?.length || 0} comments loaded`);
    } else {
      console.log('ℹ️ Comments hidden — skipping query');
    }

    // ── Build report HTML using shared template ─────────────
    const detailsHtml = `
      <div class="detail-row">
        <strong>Project:</strong> ${escapeHtml(project.project_name)}
      </div>
      <div class="detail-row">
        <strong>Project #:</strong> ${escapeHtml(project.project_number)}
      </div>
      ${project.client_name ? `
        <div class="detail-row">
          <strong>Client:</strong> ${escapeHtml(project.client_name)}
        </div>
      ` : ''}
      ${project.address ? `
        <div class="detail-row">
          <strong>Location:</strong> ${escapeHtml(project.address)}
        </div>
      ` : ''}
      <div class="detail-row">
        <strong>Total Media Items:</strong> ${mediaWithBase64.length}
      </div>
    `;

    const storyBodyHtml = generateStoryTimeline(
      branding,
      mediaWithBase64,
      commentsByMedia,
      opts
    );

    const html = buildBrandedReport(branding, {
      title: reportTitle || `${project.project_name} - Media Report`,
      detailsHtml,
      summary,
      bodyHtml: storyBodyHtml,
      recipientName: project.client_name || undefined,
      additionalCss: getStoryTimelineCss(branding, opts),
    });

    const htmlSize = new TextEncoder().encode(html).length;
    console.log(`✅ HTML report ready: ${(htmlSize / 1024).toFixed(1)}KB`);

    // ── Handle email delivery ───────────────────────────────
    if (delivery === 'email') {
      if (!recipientEmail) {
        return new Response(
          JSON.stringify({ error: 'recipientEmail is required for email delivery' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📧 Sending report via email to ${recipientEmail}`);

      const resendApiKey = Deno.env.get('ResendAPI');
      if (!resendApiKey) {
        throw new Error('Email service not configured');
      }

      const { Resend } = await import('https://esm.sh/resend@2.0.0');
      const resend = new Resend(resendApiKey);

      const emailBodyHtml = buildEmailBody(
        branding, project, mediaWithUrls, opts,
        { reportTitle, recipientName, summary, pdfDownloadUrl, mediaCount }
      );

      const emailHtml = buildBrandedEmail(branding, {
        preheaderText: `Media report: ${project.project_name} - ${mediaWithUrls.length} items`,
        bodyHtml: emailBodyHtml,
      });

      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: `${branding.companyName} <noreply@rcgwork.com>`,
        to: [recipientEmail],
        subject: `${project.project_number} - Media Report: ${project.project_name}`,
        html: emailHtml,
      });

      if (emailError) {
        console.error('❌ Email send failed:', emailError);
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      console.log('✅ Report email sent:', emailResult?.id);

      return new Response(
        JSON.stringify({
          success: true,
          delivery: 'email',
          emailId: emailResult?.id,
          recipientEmail,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For 'print' and 'download': return HTML
    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('❌ Error generating report:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    return new Response(
      JSON.stringify({ error: err.message, details: err.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ================================================================
// Email Body Builder (uses shared template helpers)
// ================================================================

function buildEmailBody(
  branding: BrandingConfig,
  project: any,
  mediaItems: any[],
  opts: ResolvedOptions,
  extra: {
    reportTitle?: string;
    recipientName?: string;
    summary?: string;
    pdfDownloadUrl?: string;
    mediaCount?: number;
  }
): string {
  const { reportTitle, recipientName, summary, pdfDownloadUrl, mediaCount } = extra;
  const itemCount = mediaCount || mediaItems.length;
  const dayCount = new Set(
    mediaItems.map((m: any) => new Date(m.taken_at || m.created_at).toLocaleDateString())
  ).size;

  // Table-based detail rows for email compatibility
  const detailRows = [
    { label: 'Project', value: project.project_name },
    { label: 'Project #', value: project.project_number },
    ...(project.client_name ? [{ label: 'Client', value: project.client_name }] : []),
    ...(project.address ? [{ label: 'Location', value: project.address }] : []),
  ];

  const emailDetailRowsHtml = detailRows.map((row) => `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 10px;">
      <tr>
        <td style="padding: 0;">
          <p style="margin: 0 0 2px; color: ${EMAIL_COLORS.textTertiary}; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(row.label)}</p>
          <p style="margin: 0; color: ${branding.secondaryColor}; font-size: 15px; font-weight: 600;">${escapeHtml(row.value)}</p>
        </td>
      </tr>
    </table>
  `).join('');

  // Media count highlight
  const mediaCountHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 4px;">
      <tr>
        <td style="padding: 0;">
          <p style="margin: 0; color: ${branding.primaryColor}; font-size: 18px; font-weight: 700;">
            ${itemCount} media item${itemCount !== 1 ? 's' : ''} &middot; ${dayCount} day${dayCount !== 1 ? 's' : ''}
          </p>
        </td>
      </tr>
    </table>
  `;

  // Thumbnail previews (up to 3 images)
  const previewItems = mediaItems.slice(0, 3);
  const thumbnailRowHtml = previewItems.length > 0 ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        ${previewItems.map((m: any) => `
          <td style="width: ${Math.floor(100 / previewItems.length)}%; padding: 0 4px; vertical-align: top;">
            <img src="${m.file_url}" alt="Preview"
              width="${Math.floor(500 / previewItems.length)}"
              style="display: block; width: 100%; height: auto; border-radius: 8px; border: 1px solid ${EMAIL_COLORS.borderLight};" />
          </td>
        `).join('')}
      </tr>
    </table>
  ` : '';

  return `
    <h1 style="margin: 0 0 16px; color: ${branding.secondaryColor}; font-size: 24px; font-weight: 600;">
      ${escapeHtml(reportTitle || project.project_name + ' - Media Report')}
    </h1>
    <p style="margin: 0 0 24px; color: ${EMAIL_COLORS.textSecondary}; font-size: 16px; line-height: 1.6;">
      ${recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hello,'}
    </p>
    <p style="margin: 0 0 24px; color: ${EMAIL_COLORS.textSecondary}; font-size: 16px; line-height: 1.6;">
      Please find the latest project media report for
      <strong>${escapeHtml(project.project_name)}</strong>.
    </p>

    <div style="margin-bottom: 28px;">
      ${buildDetailCard({ branding, title: 'Report Details', contentHtml: emailDetailRowsHtml + mediaCountHtml })}
    </div>

    ${summary ? `
      <p style="margin: 0 0 8px; color: ${branding.secondaryColor}; font-size: 14px; font-weight: 600;">
        Report Summary
      </p>
      <p style="margin: 0 0 24px; color: ${EMAIL_COLORS.textSecondary}; font-size: 14px; line-height: 1.6;">
        ${escapeHtml(summary)}
      </p>
    ` : ''}

    ${thumbnailRowHtml}

    ${pdfDownloadUrl ? `
      <div style="margin: 32px 0 24px;">
        ${buildCtaButton({ href: pdfDownloadUrl, label: 'Download Full Report (PDF)', branding, width: 280 })}
      </div>

      <div style="margin-bottom: 24px;">
        ${buildAlternativeLink({ href: pdfDownloadUrl, branding })}
      </div>

      <div style="margin-bottom: 0;">
        ${buildNoticeBox({ type: 'info', html: 'This download link expires in <strong>30 days</strong>.' })}
      </div>
    ` : `
      <p style="margin: 24px 0 0; color: ${EMAIL_COLORS.textTertiary}; font-size: 13px; font-style: italic;">
        For the full report with high-resolution images, please use the print/save
        option in the ${escapeHtml(branding.companyAbbreviation)} project portal.
      </p>
    `}
  `;
}

// ================================================================
// Story Timeline Generator
// ================================================================

function generateStoryTimeline(
  branding: BrandingConfig,
  mediaItems: any[],
  comments: Map<string, MediaComment[]>,
  opts: ResolvedOptions
): string {
  // Group photos by date
  const photosByDate = new Map<string, any[]>();
  mediaItems.forEach((media: any) => {
    const dateKey = new Date(
      media.taken_at || media.created_at
    ).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!photosByDate.has(dateKey)) {
      photosByDate.set(dateKey, []);
    }
    photosByDate.get(dateKey)!.push(media);
  });

  return `
    <div class="story-section">
      ${Array.from(photosByDate.entries())
        .map(
          ([date, photos]) => `
        <div class="story-date-group">
          <div class="story-date-header">${date}</div>
          ${photos
            .map((media: any) => {
              const mediaComments = comments.get(media.id) || [];
              const timestamp = new Date(media.taken_at || media.created_at);
              const globalIndex = mediaItems.findIndex(
                (m: any) => m.id === media.id
              );

              return `
              <div class="story-item">
                <div class="story-thumbnail">
                  <img src="${media.file_url}" alt="${escapeHtml(media.caption || 'Photo')}">
                </div>
                <div class="story-content">
                  ${opts.showNumbering
                    ? `<div class="story-number">#${globalIndex + 1}</div>`
                    : ''}
                  ${
                    media.caption
                      ? `<div class="story-caption">${escapeHtml(media.caption)}</div>`
                      : ''
                  }
                  <div class="story-meta">
                    ${opts.showTimestamps ? `
                      <div class="story-meta-item">
                        <strong>Time:</strong> ${timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ` : ''}
                    ${
                      media.location_name
                        ? `<div class="story-meta-item"><strong>Location:</strong> ${escapeHtml(media.location_name)}</div>`
                        : ''
                    }
                    ${
                      opts.showGps && media.latitude && media.longitude && !media.location_name
                        ? `<div class="story-meta-item"><strong>GPS:</strong> ${media.latitude.toFixed(4)}&deg;, ${media.longitude.toFixed(4)}&deg;</div>`
                        : ''
                    }
                  </div>
                  ${
                    media.description
                      ? `<div style="font-size: 12px; color: #64748b; margin-top: 6px;">${escapeHtml(media.description)}</div>`
                      : ''
                  }
                  ${
                    opts.showComments && mediaComments.length > 0
                      ? `
                    <div class="story-comments">
                      ${mediaComments
                        .map(
                          (comment: any) => `
                        <div class="story-comment">
                          <span class="story-comment-author">${comment.profiles?.full_name || 'User'}:</span>
                          ${escapeHtml(comment.comment_text)}
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  `
                      : ''
                  }
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

// ================================================================
// Story Timeline CSS
// ================================================================

function getStoryTimelineCss(branding: BrandingConfig, opts: ResolvedOptions): string {
  const sizeMap = {
    small:  { width: '180px', height: '135px', printMax: '120px' },
    medium: { width: '280px', height: '210px', printMax: '200px' },
    large:  { width: '400px', height: '300px', printMax: '280px' },
  };
  const imgSize = sizeMap[opts.imageSize];

  return `
    .story-section { padding: 24px 30px; }

    .story-date-group {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .story-date-header {
      font-size: 16px; font-weight: 700;
      color: ${branding.secondaryColor};
      margin-bottom: 14px; padding: 8px 14px;
      background: ${branding.lightBgColor};
      border-left: 4px solid ${branding.primaryColor};
      border-radius: 0 6px 6px 0;
      letter-spacing: 0.3px;
    }

    .story-item {
      display: flex; gap: 16px;
      margin-bottom: 16px; padding: 12px;
      background: white;
      border: 1px solid #e2e8f0; border-radius: 8px;
      page-break-inside: avoid;
    }

    .story-thumbnail {
      flex-shrink: 0;
      width: ${imgSize.width}; height: ${imgSize.height};
      border-radius: 6px; overflow: hidden;
      background: #f1f5f9;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .story-thumbnail img {
      width: 100%; height: 100%; object-fit: cover;
    }

    .story-content { flex: 1; min-width: 0; }

    .story-number {
      display: inline-block;
      color: ${branding.primaryColor};
      font-size: 11px; font-weight: 700;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .story-caption {
      font-size: 14px; font-weight: 600;
      color: ${branding.secondaryColor}; margin-bottom: 6px;
    }

    .story-meta {
      display: flex; gap: 15px; flex-wrap: wrap;
      font-size: 11px; color: #64748b; margin-bottom: 8px;
    }

    .story-meta-item { display: flex; align-items: center; gap: 4px; }

    .story-comments {
      margin-top: 10px; padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }

    .story-comment {
      font-size: 12px; color: #475569;
      margin: 5px 0; padding-left: 12px;
      border-left: 2px solid ${branding.accentColor};
    }

    .story-comment-author {
      font-weight: 600; color: ${branding.secondaryColor};
    }

    /* Print-optimized styles */
    @media print {
      body {
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .report-container {
        box-shadow: none !important;
        max-width: 100% !important;
      }

      .header {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .story-date-group {
        page-break-inside: avoid;
      }

      .story-item {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .story-thumbnail img {
        max-height: ${imgSize.printMax};
      }

      .footer {
        page-break-inside: avoid;
      }
    }

    @page {
      margin: 0.75in;
      size: letter portrait;
    }
  `;
}
