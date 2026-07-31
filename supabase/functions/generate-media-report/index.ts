import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
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
  /**
   * 'photo-grid' (default): CompanyCam-style photo-first tiles — the image
   * dominates, caption/time render in a slim strip only when present. Reads
   * well even when nothing is captioned (the normal case in the field).
   * 'detailed': side-by-side card with a full info column — better when the
   * team writes captions/descriptions or comments matter.
   */
  layout?: 'photo-grid' | 'detailed';
  /**
   * IANA timezone for ALL displayed dates/times (photo times, date-group
   * headers, day counts, "Report Generated"). The isolate runs in UTC, so
   * omitting timeZone on toLocale* renders UTC wall-clock — the +4h bug.
   * The client sends the browser's zone; invalid/absent values fall back to
   * the company's home zone.
   */
  timeZone?: string;
}

type ResolvedOptions = Required<ReportOptions>;

const DEFAULT_TIME_ZONE = 'America/New_York';

/** Validate an IANA zone name — an invalid one makes toLocale* THROW, which
 *  would 500 the whole report. */
function resolveTimeZone(tz: unknown): string {
  if (typeof tz !== 'string' || !tz) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

interface ReportRequest {
  projectId: string;
  mediaIds: string[];
  reportTitle?: string;
  format?: string;  // Accepted but only 'story' is used
  summary?: string;
  delivery?: 'print' | 'download' | 'email';
  /** Preferred: all recipients. One email is sent with every address on it. */
  recipientEmails?: string[];
  /** Legacy single-recipient field — merged into recipientEmails when present. */
  recipientEmail?: string;
  recipientName?: string;
  pdfDownloadUrl?: string;
  mediaCount?: number;
  options?: ReportOptions;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_RECIPIENTS = 20;

/** Merge, trim, validate, and dedupe (case-insensitively) recipient emails. */
function resolveRecipients(body: ReportRequest): string[] {
  const candidates = [
    ...(Array.isArray(body.recipientEmails) ? body.recipientEmails : []),
    ...(body.recipientEmail ? [body.recipientEmail] : []),
  ];

  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const raw of candidates) {
    const email = String(raw).trim();
    if (!EMAIL_RE.test(email)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push(email);
    if (recipients.length >= MAX_EMAIL_RECIPIENTS) break;
  }
  return recipients;
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
//
// Resource discipline: this function runs inside the edge isolate's
// CPU/memory caps (exceeding them returns HTTP 546 WORKER_LIMIT before
// our code can respond). Field photos average ~3MB and reach 8MB, so:
//  - images are fetched as resized variants via Storage image
//    transforms when available (probed once at runtime, silent fallback
//    to originals when the feature is off),
//  - base64 encoding uses std encodeBase64 (linear, allocation-cheap),
//  - a hard byte budget stops embedding before the isolate dies; items
//    past the budget keep their remote URL (the public bucket serves
//    them with CORS, so preview and html2canvas still render them).

const TRANSFORM_WIDTH = 1200;
const TRANSFORM_QUALITY = 75;
const MAX_SINGLE_EMBED_BYTES = 12 * 1024 * 1024;  // skip base64 for any one file larger than this
const MAX_TOTAL_EMBED_BYTES = 48 * 1024 * 1024;   // stop embedding once total raw bytes exceed this

function encodeStoragePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function publicMediaUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/project-media/${encodeStoragePath(path)}`;
}

function transformedMediaUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/render/image/public/project-media/${encodeStoragePath(path)}?width=${TRANSFORM_WIDTH}&quality=${TRANSFORM_QUALITY}`;
}

/** Probe once whether Storage image transforms are enabled on this project. */
async function probeImageTransforms(
  supabaseUrl: string,
  samplePath: string
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    // GET, not HEAD — the gateway can report misleading headers on HEAD
    const response = await fetch(transformedMediaUrl(supabaseUrl, samplePath), {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (response.ok) {
      await response.arrayBuffer(); // drain so the connection is reusable
      return true;
    }
    await response.body?.cancel();
    return false;
  } catch {
    return false;
  }
}

async function fetchImageAsBase64(
  url: string,
  timeoutMs = 15000
): Promise<{ dataUrl: string; bytes: number } | null> {
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
    if (arrayBuffer.byteLength > MAX_SINGLE_EMBED_BYTES) {
      console.warn(`⚠️ Skipping embed, file too large (${(arrayBuffer.byteLength / 1048576).toFixed(1)}MB): ${url.slice(0, 80)}`);
      return null;
    }
    const base64 = encodeBase64(new Uint8Array(arrayBuffer));
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return { dataUrl: `data:${contentType};base64,${base64}`, bytes: arrayBuffer.byteLength };
  } catch (error) {
    console.warn(`⚠️ Failed to convert image to base64: ${(error as Error).message}`);
    return null;
  }
}

async function convertMediaToBase64(
  mediaItems: any[],
  delivery: string | undefined,
  supabaseUrl: string
): Promise<any[]> {
  // Only convert for print/download — email uses external image refs which is fine
  if (delivery === 'email') return mediaItems;

  const images = mediaItems.filter((m) => m.file_type === 'image' && m.storage_path);
  const embeddable = mediaItems.filter(
    (m) =>
      (m.file_type === 'image' && m.storage_path) ||
      // Video thumbnails must be embedded too — a remote signed URL is the
      // exact thing that goes blank in html2canvas-generated PDFs.
      (m.file_type === 'video' && m.thumbnail_url)
  );
  if (embeddable.length === 0) return mediaItems;

  const transformsAvailable = images.length > 0
    ? await probeImageTransforms(supabaseUrl, images[0].storage_path)
    : false;
  console.log(`🖼️ Converting ${embeddable.length} items to base64 (transforms ${transformsAvailable ? 'ON' : 'OFF — using originals'})...`);

  const batchSize = 4;
  const results = [...mediaItems];
  let totalEmbedded = 0;
  let converted = 0;

  for (let i = 0; i < results.length; i += batchSize) {
    if (totalEmbedded > MAX_TOTAL_EMBED_BYTES) break;

    const batch = results.slice(i, i + batchSize);
    const base64Results = await Promise.all(
      batch.map((media) => {
        if (media.file_type === 'image' && media.storage_path) {
          const fetchUrl = transformsAvailable
            ? transformedMediaUrl(supabaseUrl, media.storage_path)
            : media.file_url;
          return fetchImageAsBase64(fetchUrl);
        }
        if (media.file_type === 'video' && media.thumbnail_url) {
          return fetchImageAsBase64(media.thumbnail_url);
        }
        return Promise.resolve(null);
      })
    );

    base64Results.forEach((result, idx) => {
      if (result) {
        const target = results[i + idx];
        if (target.file_type === 'video') {
          results[i + idx] = { ...target, thumbnail_url: result.dataUrl };
        } else {
          results[i + idx] = { ...target, file_url: result.dataUrl };
        }
        totalEmbedded += result.bytes;
        converted++;
      }
      // If conversion fails, keep the signed URL as fallback
    });
  }

  if (totalEmbedded > MAX_TOTAL_EMBED_BYTES) {
    console.warn(`⚠️ Embed budget reached (${(totalEmbedded / 1048576).toFixed(1)}MB) — remaining items keep remote URLs`);
  }
  console.log(`✅ Base64 conversion: ${converted}/${embeddable.length} embedded, ${(totalEmbedded / 1048576).toFixed(1)}MB`);

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
      delivery, recipientName,
      pdfDownloadUrl, mediaCount,
    } = body;

    // Resolve options with defaults. timeZone is re-resolved through the
    // validator regardless of what the client sent (an invalid IANA name
    // would make every toLocale* call throw).
    const opts: ResolvedOptions = {
      showComments: true,
      showGps: true,
      showTimestamps: true,
      showNumbering: true,
      imageSize: 'medium',
      layout: 'photo-grid',
      ...body.options,
      timeZone: resolveTimeZone(body.options?.timeZone),
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

    // Video thumbnails are stored as PATHS in the private
    // project-media-thumbnails bucket (client-side capture writes
    // 'thumbnails/{id}.jpg') — sign them so they render in the report/email.
    const thumbPaths = mediaItems
      .filter((m: any) => m.thumbnail_url && !String(m.thumbnail_url).startsWith('http'))
      .map((m: any) => m.thumbnail_url as string);

    const thumbUrlMap = new Map<string, string>();
    if (thumbPaths.length > 0) {
      const { data: thumbSigned } = await supabase.storage
        .from('project-media-thumbnails')
        .createSignedUrls(thumbPaths, 2592000); // 30 days — email links must outlive the session
      (thumbSigned || []).forEach((item: any) => {
        if (item.signedUrl && item.path) thumbUrlMap.set(item.path, item.signedUrl);
      });
    }

    const mediaWithUrls = mediaItems.map((media: any) => ({
      ...media,
      // Original storage path, kept so the base64 converter can request
      // resized variants and the email builder can mint stable public URLs.
      storage_path:
        media.file_url && !String(media.file_url).startsWith('http')
          ? media.file_url
          : null,
      file_url: signedUrlMap.get(media.file_url) || media.file_url,
      // A path that failed to sign becomes null so the video placeholder
      // renders instead of a broken <img>.
      thumbnail_url: media.thumbnail_url
        ? String(media.thumbnail_url).startsWith('http')
          ? media.thumbnail_url
          : thumbUrlMap.get(media.thumbnail_url) || null
        : null,
    }));

    // ── Convert images to base64 for PDF (fixes CORS/blank images) ─
    const mediaWithBase64 = await convertMediaToBase64(mediaWithUrls, delivery, supabaseUrl);

    // ── Fetch comments (skip query if comments hidden) ──────
    const commentsByMedia = new Map<string, MediaComment[]>();

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
          hour: '2-digit', minute: '2-digit',
          timeZone: opts.timeZone,
        })}</div>
      </div>
    `;

    // Count media types for stats bar
    const photoCount = mediaWithBase64.filter((m: any) => m.file_type === 'image').length;
    const videoCount = mediaWithBase64.filter((m: any) => m.file_type === 'video').length;
    const uniqueDates = new Set(mediaWithBase64.map((m: any) =>
      new Date(m.taken_at || m.created_at).toLocaleDateString('en-US', {
        timeZone: opts.timeZone,
      })
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
      const recipients = resolveRecipients(body);
      if (recipients.length === 0) {
        return new Response(
          JSON.stringify({ error: 'At least one valid recipient email is required for email delivery' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📧 Sending report via email to ${recipients.length} recipient(s)`);

      const resendApiKey = Deno.env.get('ResendAPI');
      if (!resendApiKey) {
        throw new Error('Email service not configured');
      }

      const { Resend } = await import('https://esm.sh/resend@2.0.0');
      const resend = new Resend(resendApiKey);

      // Email thumbnails must outlive the 1-hour signed URLs — the bucket is
      // public, so mint stable public URLs (images only; videos have no
      // renderable still unless a thumbnail exists).
      const emailMedia = mediaWithUrls.map((m: any) => ({
        ...m,
        email_img_url:
          m.file_type === 'image' && m.storage_path
            ? publicMediaUrl(supabaseUrl, m.storage_path)
            : m.file_type === 'video' && m.thumbnail_url
              ? m.thumbnail_url
              : null,
      }));

      const emailBodyHtml = buildEmailBody(
        branding, project, emailMedia, opts,
        { reportTitle, recipientName, summary, pdfDownloadUrl, mediaCount }
      );

      const emailHtml = buildBrandedEmail(branding, {
        preheaderText: `Media report: ${project.project_name} - ${mediaWithUrls.length} items`,
        bodyHtml: emailBodyHtml,
      });

      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: `${branding.companyName} <noreply@rcgwork.com>`,
        to: recipients,
        subject: `${project.project_number} - Media Report: ${project.project_name}`,
        html: emailHtml,
      });

      if (emailError) {
        console.error('❌ Email send failed:', emailError);
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      console.log('✅ Report email sent:', emailResult?.id);

      // Log to database — one row per recipient so history stays queryable
      try {
        await supabase.from('email_messages').insert(
          recipients.map((email) => ({
            recipient_email: email,
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
          }))
        );
      } catch (logError) {
        console.error('Failed to log email to database:', logError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          delivery: 'email',
          emailId: emailResult?.id,
          recipientEmails: recipients,
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
    mediaItems.map((m: any) =>
      new Date(m.taken_at || m.created_at).toLocaleDateString('en-US', {
        timeZone: opts.timeZone,
      })
    )
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

  // Thumbnail previews (up to 3 items with a stable renderable image)
  const previewItems = mediaItems
    .filter((m: any) => m.email_img_url)
    .slice(0, 3);
  const thumbnailRowHtml = previewItems.length > 0 ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        ${previewItems.map((m: any) => `
          <td style="width: ${Math.floor(100 / previewItems.length)}%; padding: 0 4px; vertical-align: top;">
            <img src="${m.email_img_url}" alt="Preview"
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

// Shared per-item fragments used by both layouts ------------------

function renderMediaImage(media: any, globalIndex: number, opts: ResolvedOptions): string {
  const isVideo = media.file_type === 'video';
  // Videos without a generated thumbnail get a styled placeholder —
  // a raw video file URL inside <img> renders as a broken image.
  const imgSrc = isVideo ? media.thumbnail_url : media.file_url;

  return `
    ${imgSrc
      ? `<img src="${imgSrc}"
         alt="${escapeHtml(media.caption || (isVideo ? 'Video' : 'Photo'))}">`
      : `<div class="video-placeholder">
           <div class="video-placeholder-icon">&#9658;</div>
           <div class="video-placeholder-text">Video${media.duration ? ` &middot; ${Math.round(media.duration)}s` : ''}<br>View in project portal</div>
         </div>`}
    ${opts.showNumbering
      ? `<span class="media-number">#${globalIndex + 1}</span>`
      : ''}
    <span class="media-type-badge">${isVideo ? 'Video' : 'Photo'}</span>
  `;
}

function renderMetaTags(media: any, opts: ResolvedOptions): string {
  // GPS coordinates only when there's no human-readable location — matching
  // the option's description ("display coordinates when no location name").
  const locationTag = media.location_name
    ? `<span class="meta-tag">${escapeHtml(media.location_name)}</span>`
    : opts.showGps && media.latitude && media.longitude
      ? `<span class="meta-tag">GPS: ${media.latitude.toFixed(4)}&deg;, ${media.longitude.toFixed(4)}&deg;</span>`
      : '';
  return locationTag ? `<div class="media-meta">${locationTag}</div>` : '';
}

function renderComments(mediaComments: MediaComment[], opts: ResolvedOptions): string {
  if (!opts.showComments || mediaComments.length === 0) return '';
  return `
    <div class="media-comments">
      ${mediaComments.map((comment: any) => `
        <div class="comment-item">
          <div class="comment-avatar">${escapeHtml((comment.profiles?.full_name || 'U').substring(0, 2).toUpperCase())}</div>
          <div>
            <span class="comment-author">${escapeHtml(comment.profiles?.full_name || 'User')}</span> —
            ${escapeHtml(comment.comment_text)}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function generateStoryTimeline(
  branding: BrandingConfig,
  mediaItems: any[],
  comments: Map<string, MediaComment[]>,
  opts: ResolvedOptions
): string {
  // Group photos by date — in the VIEWER's timezone, not the isolate's UTC.
  // Without timeZone here an evening photo (after 8pm EDT) files under the
  // next day's header.
  const photosByDate = new Map<string, any[]>();
  mediaItems.forEach((media: any) => {
    const dateKey = new Date(
      media.taken_at || media.created_at
    ).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: opts.timeZone,
    });
    if (!photosByDate.has(dateKey)) {
      photosByDate.set(dateKey, []);
    }
    photosByDate.get(dateKey)!.push(media);
  });

  const isGrid = opts.layout === 'photo-grid';

  // Photo-first tile: the image carries the page; text renders in a slim
  // strip only when it exists. No "No caption" placeholders anywhere — an
  // uncaptioned photo is the normal case, not an omission to call out.
  const renderTile = (media: any) => {
    const mediaComments = comments.get(media.id) || [];
    const timestamp = new Date(media.taken_at || media.created_at);
    const globalIndex = mediaItems.findIndex((m: any) => m.id === media.id);
    const timeStr = timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: opts.timeZone,
    });

    const stripParts: string[] = [];
    if (opts.showTimestamps) stripParts.push(`<span class="tile-time">${timeStr}</span>`);
    if (media.caption) stripParts.push(`<span class="tile-caption">${escapeHtml(media.caption)}</span>`);

    const metaHtml = renderMetaTags(media, opts);
    const commentsHtml = renderComments(mediaComments, opts);
    const hasStrip = stripParts.length > 0 || metaHtml || commentsHtml;

    return `
      <div class="media-tile">
        <div class="tile-image">
          ${renderMediaImage(media, globalIndex, opts)}
        </div>
        ${hasStrip ? `
          <div class="tile-strip">
            ${stripParts.length > 0 ? `<div class="tile-strip-row">${stripParts.join('')}</div>` : ''}
            ${metaHtml}
            ${commentsHtml}
          </div>
        ` : ''}
      </div>
    `;
  };

  // Detailed card: side-by-side image + info column (the pre-Jul-2026 look,
  // minus the "No caption" filler) — best when captions/descriptions exist.
  const renderCard = (media: any) => {
    const mediaComments = comments.get(media.id) || [];
    const timestamp = new Date(media.taken_at || media.created_at);
    const globalIndex = mediaItems.findIndex((m: any) => m.id === media.id);

    return `
      <div class="media-card">
        <div class="media-image">
          ${renderMediaImage(media, globalIndex, opts)}
        </div>
        <div class="media-info">
          ${opts.showTimestamps ? `
            <div class="media-time">
              ${timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: opts.timeZone })}
            </div>
          ` : ''}
          ${media.caption
            ? `<div class="media-caption">${escapeHtml(media.caption)}</div>`
            : ''
          }
          ${media.description
            ? `<div class="media-description">${escapeHtml(media.description)}</div>`
            : ''
          }
          ${renderMetaTags(media, opts)}
          ${renderComments(mediaComments, opts)}
        </div>
      </div>
    `;
  };

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
            ${isGrid
              ? `<div class="media-grid">${photos.map(renderTile).join('')}</div>`
              : photos.map(renderCard).join('')}
          </div>
        `).join('')}
    </div>
  `;
}

// ================================================================
// Story Timeline CSS
// ================================================================

function getStoryTimelineCss(branding: BrandingConfig, opts: ResolvedOptions): string {
  // Map imageSize option to media card image column width (detailed layout)
  const imgColMap = {
    small: '200px',
    medium: '260px',
    large: '320px',
  };
  const imgColWidth = imgColMap[opts.imageSize];

  // In the photo-grid layout, imageSize drives density instead:
  // small = 3-across, medium = 2-across, large = one full-width photo per row
  const gridColsMap = { small: 3, medium: 2, large: 1 };
  const gridCols = gridColsMap[opts.imageSize];

  return `
    /* ── Timeline Section ────────────────────── */
    .timeline-section {
      padding: 36px 56px 56px;
    }

    /* No page-break-inside:avoid here — a date group can hold dozens of
       photos and MUST be allowed to span pages (forcing it whole created
       giant gaps / overflow in generated PDFs). Individual cards/tiles
       carry their own avoid rules instead. */
    .date-group {
      margin-bottom: 48px;
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

    /* ── Photo Grid (photo-first layout) ─────── */
    .media-grid {
      display: grid;
      grid-template-columns: repeat(${gridCols}, 1fr);
      gap: 16px;
    }

    .media-tile {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
      background: white;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* padding-bottom keeps the 4:3 box — html2canvas 1.4.1 (the PDF
       renderer) does not implement CSS aspect-ratio, which collapses the
       image boxes in generated PDFs */
    .tile-image {
      position: relative;
      padding-bottom: 75%;
      overflow: hidden;
      background: #F8F6F3;
    }

    /* contain, never cover — a portrait phone photo center-cropped into a
       4:3 landscape box loses ~44% of the frame, which the field reads as
       "someone edited my photo" (Rule 21 precedent: TimelineStoryView made
       this same cover→contain fix). The box background letterboxes. */
    .tile-image img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .tile-image .video-placeholder {
      position: absolute;
      top: 0;
      left: 0;
    }

    .tile-strip {
      padding: 10px 14px 12px;
    }

    .tile-strip-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .tile-time {
      font-size: 11px;
      font-weight: 600;
      color: ${branding.primaryColor};
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .tile-caption {
      font-size: ${gridCols === 3 ? '11px' : '13px'};
      font-weight: 500;
      color: ${branding.secondaryColor};
      line-height: 1.45;
      min-width: 0;
    }

    .tile-strip .media-meta { margin-top: 6px; }
    .tile-strip .media-comments { margin-top: 10px; padding-top: 10px; }

    /* ── Media Card (detailed layout) ────────── */
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
      padding-bottom: 75%;
      overflow: hidden;
      background: #F8F6F3;
    }

    /* contain, never cover — same reasoning as .tile-image img above. */
    .media-image img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .media-image .video-placeholder {
      position: absolute;
      top: 0;
      left: 0;
    }

    .video-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: ${branding.secondaryColor};
    }

    .video-placeholder-icon {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      padding-left: 4px;
    }

    .video-placeholder-text {
      font-size: 11px;
      color: rgba(255,255,255,0.65);
      text-align: center;
      line-height: 1.5;
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

    /* ── Print Styles ────────────────── */
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

      /* Cards/tiles stay whole across pages; date groups may split (a
         30-photo day MUST be allowed to span pages or the browser pushes
         the whole group to a fresh page, leaving huge gaps). */
      .media-card { page-break-inside: avoid; break-inside: avoid; }
      .media-tile { page-break-inside: avoid; break-inside: avoid; }
      .date-header { page-break-after: avoid; }
      .report-footer { page-break-inside: avoid; }
    }

    @page {
      margin: 0.5in;
      size: letter portrait;
    }
  `;
}
