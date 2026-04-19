# 06 — Report Generation Overhaul

## Priority: Sixth (Major Quality + Performance Improvement)
## Risk Level: Medium — rewriting active edge function, but same input/output contract
## Estimated Time: 60-90 minutes
## Depends On: 05 (shared branding template exists)

---

## Context

The current report generation pipeline has several issues:

1. **N+1 signed URLs in the edge function** — same problem as the frontend gallery, but server-side
2. **html2pdf.js on the client is fragile** — HTML → canvas → image → PDF. Memory-intensive, poor page breaks, CORS issues with signed URLs on mobile
3. **Dead code** — `generateDetailedFormat()` is never called (modal hardcodes `format: 'story'`)
4. **Monolithic HTML generation** — branding, styles, and content all in one giant function

### Strategy: Incremental, Not Revolutionary

We keep the same overall approach (edge function generates HTML, client converts to PDF) but:
- Use the shared branding template from Phase 05
- Batch the signed URL generation
- Clean up the dead `detailed` format code
- Improve the HTML structure for better html2pdf page breaks

We do NOT switch away from html2pdf.js in this phase. That would require a fundamentally different approach (server-side PDF or @react-pdf/renderer) which has its own risk profile. The current approach works — we're making it faster and more maintainable.

## Files to Modify

### File 1: `supabase/functions/generate-media-report/index.ts`

This is a full rewrite of the edge function. The input/output contract stays identical:

**Input (unchanged):**
```typescript
{
  projectId: string;
  mediaIds: string[];
  reportTitle?: string;
  format?: 'detailed' | 'story';  // Keep accepting but ignore 'detailed'
  summary?: string;
}
```

**Output (unchanged):**
- Content-Type: `text/html; charset=utf-8`
- Body: HTML string

**New implementation:**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  fetchBranding,
  buildBrandedReport,
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

    const { projectId, mediaIds, reportTitle, summary } =
      (await req.json()) as ReportRequest;

    console.log(
      `📋 Request: Project ${projectId}, ${mediaIds.length} media items`
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
  `;
}
```

### Deployment

After updating the file, deploy via Supabase CLI or MCP:

```bash
supabase functions deploy generate-media-report --project-ref clsjdxwbsjbhjibvlqbz
```

**CRITICAL:** The `_shared/brandedTemplate.ts` file must exist before deploying, because the import references it.

### File 2: `src/components/MediaReportBuilderModal.tsx` — NO CHANGES IN THIS PHASE

The modal's `handleGenerateHTMLReport` function calls the edge function and processes the HTML response. Since the edge function's input/output contract is unchanged, the modal continues working without modification.

The only thing that changes is:
- The HTML arrives faster (batch signed URLs instead of N+1)
- The HTML is structurally identical (same CSS classes, same layout)

## What Was Removed

- `generateDetailedFormat()` function — never called
- Inline branding fetch + fallback logic — replaced by `fetchBranding()` import
- Inline `escapeHtml()` definition — replaced by import from shared template
- Inline `generateReportHTML()` with embedded CSS — replaced by `buildBrandedReport()` + `getStoryTimelineCss()`
- N+1 signed URL loop — replaced by batch `createSignedUrls()`

## What Was Added

- Parallel data fetching (`Promise.all` for branding + project + media)
- Batch signed URL generation (1 call instead of N)
- Import of shared template utility

## Validation Checklist

- [ ] `_shared/brandedTemplate.ts` exists and is accessible from the function
- [ ] Edge function deploys without errors
- [ ] Navigate to a project with 5+ photos
- [ ] Open gallery → select photos → Generate Report
- [ ] Report modal appears, generation starts
- [ ] PDF downloads successfully
- [ ] PDF contains: branded header, project details, story timeline with photos
- [ ] Photos display correctly in the PDF (signed URLs resolved)
- [ ] Comments appear on photos that have them
- [ ] Summary text appears if provided
- [ ] Footer shows company legal name and copyright
- [ ] Test with 20+ photos to verify no timeout or memory issues
- [ ] Check edge function logs: should show batch URL generation, not N individual calls

## What NOT to Change

- `MediaReportBuilderModal.tsx` — unchanged in this phase
- `html2pdf.js` usage on the client — unchanged in this phase (future consideration)
- Other edge functions — they keep their inline templates for now
