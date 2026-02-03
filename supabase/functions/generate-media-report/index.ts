import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  fetchBranding,
  buildBrandedReport,
  buildBrandedEmail,
  escapeHtml,
  type BrandingConfig,
} from '../_shared/brandedTemplate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  projectId: string;
  mediaIds: string[];
  reportTitle?: string;
  format?: string;  // Accepted but only 'story' is used
  summary?: string;
  // NEW: delivery options
  delivery?: 'print' | 'download' | 'email';
  recipientEmail?: string;
  recipientName?: string;
  pdfDownloadUrl?: string;  // Signed URL for email download link
  mediaCount?: number;      // Number of media items in report
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
    const { projectId, mediaIds, reportTitle, summary, delivery, recipientEmail, recipientName, pdfDownloadUrl, mediaCount } = body;

    console.log(
      `📋 Request: Project ${projectId}, ${mediaIds.length} media items, delivery: ${delivery || 'download'}`
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
      .createSignedUrls(mediaPaths, 3600); // 1 hour for report generation

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

    // ── Fetch comments (single query) ───────────────────────
    const { data: comments } = await supabase
      .from('media_comments')
      .select(`*, profiles:user_id (full_name, email)`)
      .in('media_id', mediaIds)
      .order('created_at', { ascending: true });

    const commentsByMedia = new Map<string, MediaComment[]>();
    (comments || []).forEach((comment: MediaComment) => {
      if (!commentsByMedia.has(comment.media_id)) {
        commentsByMedia.set(comment.media_id, []);
      }
      commentsByMedia.get(comment.media_id)!.push(comment);
    });
    console.log(`✅ ${comments?.length || 0} comments loaded`);

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
        <strong>Total Media Items:</strong> ${mediaWithUrls.length}
      </div>
    `;

    const storyBodyHtml = generateStoryTimeline(
      branding,
      mediaWithUrls,
      commentsByMedia
    );

    const html = buildBrandedReport(branding, {
      title: reportTitle || `${project.project_name} - Media Report`,
      detailsHtml,
      summary,
      bodyHtml: storyBodyHtml,
      recipientName: project.client_name || undefined,
      additionalCss: getStoryTimelineCss(branding),
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

      // Build email-safe summary (no huge images)
      const emailBodyHtml = `
        <h1 style="margin: 0 0 16px; color: ${branding.secondaryColor}; font-size: 24px; font-weight: 600;">
          ${escapeHtml(reportTitle || project.project_name + ' - Media Report')}
        </h1>
        <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
          ${recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hello,'}
        </p>
        <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
          Please find the latest project media report for
          <strong>${escapeHtml(project.project_name)}</strong>
          (${escapeHtml(project.project_number)}).
          This report contains ${mediaWithUrls.length} media
          item${mediaWithUrls.length !== 1 ? 's' : ''}.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
          style="background: ${branding.lightBgColor}; border-radius: 8px; border-left: 4px solid ${branding.primaryColor}; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              ${detailsHtml}
            </td>
          </tr>
        </table>

        ${summary ? `
          <p style="margin: 0 0 8px; color: ${branding.secondaryColor}; font-size: 14px; font-weight: 600;">
            Report Summary
          </p>
          <p style="margin: 0 0 24px; color: #4a5568; font-size: 14px; line-height: 1.6;">
            ${escapeHtml(summary)}
          </p>
        ` : ''}

        <p style="margin: 0 0 8px; color: #4a5568; font-size: 14px; line-height: 1.6;">
          <strong>${mediaCount || mediaWithUrls.length} media item${(mediaCount || mediaWithUrls.length) !== 1 ? 's' : ''}</strong> captured across
          <strong>${new Set(mediaWithUrls.map((m: any) =>
            new Date(m.taken_at || m.created_at).toLocaleDateString()
          )).size} day(s)</strong>.
        </p>

        ${pdfDownloadUrl ? `
          <!-- Download Button -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
            <tr>
              <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background-color: ${branding.primaryColor}; border-radius: 8px; padding: 16px 40px;">
                      <a href="${pdfDownloadUrl}" 
                         style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block;"
                         target="_blank">
                        📄 Download Full Report (PDF)
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Plain text fallback link -->
          <p style="font-size: 13px; color: #666; text-align: center; margin-top: 16px;">
            If the button doesn't work, copy this link:<br>
            <a href="${pdfDownloadUrl}" style="color: ${branding.primaryColor}; word-break: break-all;">
              ${pdfDownloadUrl}
            </a>
          </p>

          <!-- Expiration notice -->
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 8px;">
            This download link expires in 30 days.
          </p>
        ` : `
          <p style="margin: 24px 0 0; color: #718096; font-size: 13px; font-style: italic;">
            For the full report with high-resolution images, please use the print/save
            option in the ${escapeHtml(branding.companyAbbreviation)} project portal.
          </p>
        `}
      `;

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
// Story Timeline Generator
// ================================================================

function generateStoryTimeline(
  branding: BrandingConfig,
  mediaItems: any[],
  comments: Map<string, MediaComment[]>
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
                  <div class="story-number">PHOTO ${globalIndex + 1}</div>
                  ${
                    media.caption
                      ? `<div class="story-caption">${escapeHtml(media.caption)}</div>`
                      : '<div class="story-caption" style="color: #94a3b8; font-style: italic;">No caption</div>'
                  }
                  <div class="story-meta">
                    <div class="story-meta-item">
                      <strong>Time:</strong> ${timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    ${
                      media.location_name
                        ? `<div class="story-meta-item"><strong>Location:</strong> ${escapeHtml(media.location_name)}</div>`
                        : ''
                    }
                    ${
                      media.latitude && media.longitude
                        ? `<div class="story-meta-item"><strong>GPS:</strong> ${media.latitude.toFixed(4)}°, ${media.longitude.toFixed(4)}°</div>`
                        : ''
                    }
                  </div>
                  ${
                    media.description
                      ? `<div style="font-size: 12px; color: #64748b; margin-top: 6px;">${escapeHtml(media.description)}</div>`
                      : ''
                  }
                  ${
                    mediaComments.length > 0
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

function getStoryTimelineCss(branding: BrandingConfig): string {
  return `
    .story-section { padding: 30px; }

    .story-date-group {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    .story-date-header {
      font-size: 20px; font-weight: bold;
      color: ${branding.secondaryColor};
      margin-bottom: 20px; padding-bottom: 10px;
      border-bottom: 2px solid ${branding.primaryColor};
    }

    .story-item {
      display: flex; gap: 20px;
      margin-bottom: 30px; padding: 15px;
      background: white;
      border: 1px solid #e2e8f0; border-radius: 8px;
      page-break-inside: avoid;
    }

    .story-thumbnail {
      flex-shrink: 0; width: 180px; height: 135px;
      border-radius: 6px; overflow: hidden; background: #f7fafc;
    }

    .story-thumbnail img {
      width: 100%; height: 100%; object-fit: cover;
    }

    .story-content { flex: 1; min-width: 0; }

    .story-number {
      display: inline-block;
      background: ${branding.primaryColor}; color: white;
      padding: 3px 10px; border-radius: 4px;
      font-size: 11px; font-weight: 600;
      margin-bottom: 8px; letter-spacing: 0.5px;
    }

    .story-caption {
      font-size: 15px; font-weight: 600;
      color: ${branding.secondaryColor}; margin-bottom: 8px;
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
        max-height: 120px;
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
