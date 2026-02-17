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
      <div class="detail-cell">
        <div class="detail-label">Project Number</div>
        <div class="detail-value mono">${escapeHtml(project.project_number)}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-label">Client</div>
        <div class="detail-value">${escapeHtml(project.client_name || 'N/A')}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-label">Location</div>
        <div class="detail-value">${escapeHtml(project.address || 'N/A')}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-label">Report Generated</div>
        <div class="detail-value">${new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}</div>
      </div>
    `;

    // Count media types for stats bar
    const photoCount = mediaWithBase64.filter((m: any) => m.file_type === 'image').length;
    const videoCount = mediaWithBase64.filter((m: any) => m.file_type === 'video').length;
    const uniqueDates = new Set(mediaWithBase64.map((m: any) =>
      new Date(m.taken_at || m.created_at).toLocaleDateString()
    )).size;

    const statsBarHtml = `
      <div class="stats-bar">
        <div class="stat-item">
          <div class="stat-number orange">${mediaWithBase64.length}</div>
          <div class="stat-label">Media Items</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${photoCount}</div>
          <div class="stat-label">Photos</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${videoCount}</div>
          <div class="stat-label">Videos</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${uniqueDates}</div>
          <div class="stat-label">${uniqueDates === 1 ? 'Day' : 'Days'}</div>
        </div>
      </div>
    `;

    const storyBodyHtml = generateStoryTimeline(
      branding,
      mediaWithBase64,
      commentsByMedia,
      opts
    );

    const html = buildBrandedReport(branding, {
      title: reportTitle || project.project_name,
      detailsHtml,
      summary,
      bodyHtml: statsBarHtml + storyBodyHtml,
      recipientName: project.client_name || undefined,
      additionalCss: getStoryTimelineCss(branding, opts),
      projectNumber: project.project_number,
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

      // Log email to database
      try {
        await supabase.from('email_messages').insert({
          recipient_email: recipientEmail,
          recipient_name: recipientName || null,
          recipient_user_id: null,
          email_type: 'media-report',
          subject: `${project.project_number} - Media Report: ${project.project_name}`,
          entity_type: 'media-report',
          entity_id: projectId,
          project_id: projectId,
          sent_by: null,
          resend_email_id: emailResult?.id || null,
          delivery_status: emailResult?.id ? 'sent' : 'failed',
          error_message: null,
        });
      } catch (logError) {
        console.error('Failed to log email to database:', logError);
      }

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
    <div class="timeline-section">
      ${Array.from(photosByDate.entries())
        .map(([date, photos]) => `
          <div class="date-group">
            <div class="date-header">
              <div class="date-badge">${date}</div>
              <div class="date-line"></div>
              <div class="date-count">${photos.length} item${photos.length !== 1 ? 's' : ''}</div>
            </div>
            ${photos.map((media: any) => {
              const mediaComments = comments.get(media.id) || [];
              const timestamp = new Date(media.taken_at || media.created_at);
              const globalIndex = mediaItems.findIndex((m: any) => m.id === media.id);
              const isVideo = media.file_type === 'video';

              return `
                <div class="media-card">
                  <div class="media-image">
                    <img src="${isVideo && media.thumbnail_url ? media.thumbnail_url : media.file_url}"
                         alt="${escapeHtml(media.caption || (isVideo ? 'Video' : 'Photo'))}">
                    ${opts.showNumbering
                      ? `<span class="media-number">#${globalIndex + 1}</span>`
                      : ''}
                    <span class="media-type-badge">${isVideo ? 'Video' : 'Photo'}</span>
                  </div>
                  <div class="media-info">
                    ${opts.showTimestamps ? `
                      <div class="media-time">
                        ${timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ` : ''}
                    ${media.caption
                      ? `<div class="media-caption">${escapeHtml(media.caption)}</div>`
                      : '<div class="media-caption empty">No caption</div>'
                    }
                    ${media.description
                      ? `<div class="media-description">${escapeHtml(media.description)}</div>`
                      : ''
                    }
                    <div class="media-meta">
                      ${media.location_name
                        ? `<span class="meta-tag">${escapeHtml(media.location_name)}</span>`
                        : ''
                      }
                      ${opts.showGps && media.latitude && media.longitude
                        ? `<span class="meta-tag">GPS: ${media.latitude.toFixed(4)}&deg;, ${media.longitude.toFixed(4)}&deg;</span>`
                        : ''
                      }
                    </div>
                    ${opts.showComments && mediaComments.length > 0 ? `
                      <div class="media-comments">
                        ${mediaComments.map((comment: any) => `
                          <div class="comment-item">
                            <div class="comment-avatar">${(comment.profiles?.full_name || 'U').substring(0, 2).toUpperCase()}</div>
                            <div>
                              <span class="comment-author">${escapeHtml(comment.profiles?.full_name || 'User')}</span> —
                              ${escapeHtml(comment.comment_text)}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
    </div>
  `;
}

// ================================================================
// Story Timeline CSS
// ================================================================

function getStoryTimelineCss(branding: BrandingConfig, opts: ResolvedOptions): string {
  // Map imageSize option to media card image column width
  const imgColMap = {
    small: '200px',
    medium: '260px',
    large: '320px',
  };
  const imgColWidth = imgColMap[opts.imageSize];

  return `
    /* ── Timeline Section ────────────────────── */
    .timeline-section {
      padding: 36px 56px 56px;
    }

    .date-group {
      margin-bottom: 48px;
      page-break-inside: avoid;
    }

    .date-group:last-child { margin-bottom: 0; }

    .date-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }

    .date-badge {
      background: ${branding.secondaryColor};
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
    }

    .date-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, #E2E8F0, transparent);
    }

    .date-count {
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
      white-space: nowrap;
    }

    /* ── Media Card ──────────────────────────── */
    .media-card {
      display: grid;
      grid-template-columns: ${imgColWidth} 1fr;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 20px;
      background: white;
      page-break-inside: avoid;
    }

    .media-card:last-child { margin-bottom: 0; }

    .media-image {
      position: relative;
      aspect-ratio: 4/3;
      overflow: hidden;
      background: #F8F6F3;
    }

    .media-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .media-number {
      position: absolute;
      top: 12px;
      left: 12px;
      background: ${branding.primaryColor};
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 5px;
      letter-spacing: 0.05em;
    }

    .media-type-badge {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(0,0,0,0.6);
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .media-info {
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .media-time {
      font-size: 12px;
      font-weight: 600;
      color: ${branding.primaryColor};
      margin-bottom: 8px;
      font-variant-numeric: tabular-nums;
    }

    .media-caption {
      font-size: 15px;
      font-weight: 500;
      color: ${branding.secondaryColor};
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .media-caption.empty {
      color: #94A3B8;
      font-style: italic;
      font-weight: 400;
    }

    .media-description {
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .media-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .meta-tag {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      color: #64748B;
      background: #F8F6F3;
      padding: 5px 10px;
      border-radius: 5px;
      font-weight: 500;
    }

    .media-comments {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid #E2E8F0;
    }

    .comment-item {
      display: flex;
      gap: 8px;
      font-size: 12px;
      line-height: 1.5;
      color: #475569;
      margin-bottom: 6px;
    }

    .comment-item:last-child { margin-bottom: 0; }

    .comment-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: ${branding.primaryColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .comment-author {
      font-weight: 600;
      color: ${branding.secondaryColor};
    }

    /* ── Print Styles ────────────────────────── */
    @media print {
      body {
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .report-container { box-shadow: none !important; }

      .cover-hero, .report-footer, .date-badge, .media-number, .media-type-badge {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .date-group { page-break-inside: avoid; }
      .media-card { page-break-inside: avoid; break-inside: avoid; }
      .report-footer { page-break-inside: avoid; }
    }

    @page {
      margin: 0.5in;
      size: letter portrait;
    }
  `;
}
