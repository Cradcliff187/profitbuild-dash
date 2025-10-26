import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  projectId: string;
  mediaIds: string[];
  reportTitle?: string;
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting media report generation...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { projectId, mediaIds, reportTitle } = await req.json() as ReportRequest;
    console.log(`📋 Request: Project ${projectId}, ${mediaIds.length} media items`);

    // Fetch company branding (same as send-auth-email pattern)
    console.log('🎨 Fetching company branding...');
    const { data: branding } = await supabase
      .from('company_branding_settings')
      .select('*')
      .single();

    const brandingData = {
      primaryColor: branding?.primary_color || '#cf791d',
      secondaryColor: branding?.secondary_color || '#1b2b43',
      accentColor: branding?.accent_color || '#cf791d',
      lightBgColor: branding?.light_bg_color || '#f4f7f9',
      logoFullUrl: branding?.logo_full_url || '',
      companyName: branding?.company_name || 'Radcliff Construction Group',
      companyLegalName: branding?.company_legal_name || 'Radcliff Construction Group, LLC',
    };
    console.log('✅ Branding loaded:', brandingData.companyName);

    // Fetch project data
    console.log('📁 Fetching project data...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }
    console.log('✅ Project loaded:', project.project_name);

    // Fetch media items with signed URLs
    console.log('🖼️ Fetching media items...');
    const { data: mediaItems, error: mediaError } = await supabase
      .from('project_media')
      .select('*')
      .in('id', mediaIds)
      .order('taken_at', { ascending: true });

    if (mediaError) {
      throw new Error('Failed to fetch media items: ' + mediaError.message);
    }
    console.log(`✅ ${mediaItems?.length || 0} media items loaded`);

    // Generate signed URLs for each media item
    const mediaWithUrls = await Promise.all(
      (mediaItems || []).map(async (media) => {
        try {
          // file_url already contains the storage path
          const storagePath = media.file_url;
          
          if (!storagePath) {
            console.warn(`⚠️ Media item ${media.id} has no file_url`);
            return media;
          }

          // Check if it's already a full URL (shouldn't happen but defensive coding)
          if (storagePath.startsWith('http')) {
            console.log(`✅ Media ${media.id} already has full URL`);
            return media;
          }

          // Create signed URL using the storage path from file_url
          const { data: signedData, error } = await supabase.storage
            .from('project-media')
            .createSignedUrl(storagePath, 3600); // 1 hour expiry

          if (error) {
            console.error(`❌ Failed to create signed URL for ${storagePath}:`, error.message);
            return media; // Return original media, let HTML generation handle missing URL
          }

          if (!signedData?.signedUrl) {
            console.warn(`⚠️ No signed URL returned for ${storagePath}`);
            return media;
          }

          console.log(`✅ Signed URL created for media ${media.id}`);
          
          return {
            ...media,
            file_url: signedData.signedUrl, // Replace with signed URL
          };
        } catch (err) {
          console.error(`❌ Exception creating signed URL for media ${media.id}:`, err);
          return media; // Return original on exception
        }
      })
    );

    console.log(`✅ Generated ${mediaWithUrls.length} signed URLs`);

    // Fetch comments for these media items
    console.log('💬 Fetching comments...');
    const { data: comments } = await supabase
      .from('media_comments')
      .select(`
        *,
        profiles:user_id (full_name, email)
      `)
      .in('media_id', mediaIds)
      .order('created_at', { ascending: true });

    // Group comments by media_id
    const commentsByMedia = new Map<string, MediaComment[]>();
    (comments || []).forEach((comment: MediaComment) => {
      if (!commentsByMedia.has(comment.media_id)) {
        commentsByMedia.set(comment.media_id, []);
      }
      commentsByMedia.get(comment.media_id)!.push(comment);
    });
    console.log(`✅ ${comments?.length || 0} comments loaded`);

    // Generate HTML report
    console.log('📝 Generating HTML report...');
    const html = generateReportHTML({
      branding: brandingData,
      projectName: project.project_name,
      projectNumber: project.project_number,
      clientName: project.client_name,
      address: project.address,
      reportTitle: reportTitle || `${project.project_name} - Media Report`,
      mediaItems: mediaWithUrls,
      comments: commentsByMedia,
    });
    console.log('✅ HTML generated');
    
    // Log HTML size for debugging
    const htmlSize = new TextEncoder().encode(html).length;
    console.log(`✅ HTML report ready: ${(htmlSize / 1024).toFixed(1)}KB, ${mediaWithUrls.length} media items`);

    // Return HTML directly for client-side PDF conversion
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('❌ Error generating report:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});

// HTML generation function (inline for now)
function generateReportHTML(options: {
  branding: any;
  projectName: string;
  projectNumber: string;
  clientName: string;
  address?: string;
  reportTitle: string;
  mediaItems: any[];
  comments: Map<string, any[]>;
}): string {
  const { branding } = options;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${options.reportTitle}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: ${branding.lightBgColor};
            padding: 0;
            margin: 0;
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
          
          .logo {
            max-width: 280px;
            height: auto;
            margin-bottom: 20px;
          }
          
          .header-title {
            font-size: 36px;
            font-weight: bold;
            color: white;
            margin: 20px 0 0 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          
          .cover-content {
            padding: 40px;
          }
          
          .report-title {
            font-size: 28px;
            font-weight: bold;
            color: ${branding.secondaryColor};
            margin: 0 0 30px 0;
            text-align: center;
          }
          
          .project-details {
            background: ${branding.lightBgColor};
            padding: 30px;
            border-radius: 12px;
            border-left: 4px solid ${branding.primaryColor};
            margin-bottom: 40px;
          }
          
          .project-details-title {
            color: ${branding.secondaryColor};
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            display: block;
          }
          
          .detail-row {
            margin: 12px 0;
            font-size: 14px;
            color: #4a5568;
          }
          
          .detail-row strong {
            color: ${branding.secondaryColor};
            min-width: 100px;
            display: inline-block;
          }
          
          .media-section {
            page-break-before: always;
            padding: 40px;
          }
          
          .media-item {
            page-break-inside: avoid;
            margin-bottom: 50px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          
          .media-image-container {
            width: 100%;
            background: #f7fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 400px;
          }
          
          .media-image {
            width: 100%;
            height: auto;
            display: block;
            max-height: 600px;
            object-fit: contain;
          }
          
          .media-metadata {
            padding: 25px;
            background: ${branding.lightBgColor};
          }
          
          .caption {
            font-size: 18px;
            font-weight: 600;
            color: ${branding.secondaryColor};
            margin-bottom: 15px;
            line-height: 1.4;
          }
          
          .metadata-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-top: 15px;
          }
          
          .metadata-item {
            font-size: 13px;
            color: #4a5568;
            padding: 8px 0;
          }
          
          .metadata-item strong {
            color: ${branding.secondaryColor};
            display: block;
            margin-bottom: 4px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .comments-section {
            background: #fff7ed;
            padding: 20px;
            margin-top: 20px;
            border-left: 3px solid ${branding.accentColor};
            border-radius: 6px;
          }
          
          .comments-title {
            color: ${branding.primaryColor};
            font-weight: 600;
            margin-bottom: 12px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .comment {
            font-size: 13px;
            color: #744210;
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 6px;
            line-height: 1.5;
          }
          
          .comment-author {
            font-weight: 600;
            color: ${branding.secondaryColor};
          }
          
          .footer {
            text-align: center;
            padding: 40px;
            color: #a0aec0;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
            background: ${branding.lightBgColor};
          }
          
          .footer-company {
            font-weight: 600;
            color: ${branding.secondaryColor};
            margin-bottom: 8px;
          }
          
          @media print {
            body {
              background: white;
            }
            .report-container {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          
          <!-- Cover Page -->
          <div class="header">
            ${branding.logoFullUrl ? `<img src="${branding.logoFullUrl}" alt="${branding.companyName}" class="logo">` : ''}
            <h1 class="header-title">${branding.companyName}</h1>
          </div>
          
          <div class="cover-content">
            <h2 class="report-title">${options.reportTitle}</h2>
            
            <div class="project-details">
              <strong class="project-details-title">Project Information</strong>
              <div class="detail-row">
                <strong>Project Name:</strong> ${options.projectName}
              </div>
              <div class="detail-row">
                <strong>Project Number:</strong> ${options.projectNumber}
              </div>
              <div class="detail-row">
                <strong>Client:</strong> ${options.clientName}
              </div>
              ${options.address ? `
                <div class="detail-row">
                  <strong>Location:</strong> ${options.address}
                </div>
              ` : ''}
              <div class="detail-row">
                <strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div class="detail-row">
                <strong>Total Media Items:</strong> ${options.mediaItems.length}
              </div>
            </div>
          </div>
          
          <!-- Media Items -->
          <div class="media-section">
            ${options.mediaItems.map((media: any) => {
              const comments = options.comments.get(media.id) || [];
              const takenDate = media.taken_at || media.created_at;
              
              return `
                <div class="media-item">
                  <div class="media-image-container">
                    <img 
                      src="${media.file_url}" 
                      alt="${media.caption || 'Project Media'}" 
                      class="media-image"
                    >
                  </div>
                  
                  <div class="media-metadata">
                    ${media.caption ? `<div class="caption">${media.caption}</div>` : ''}
                    
                    <div class="metadata-grid">
                      <div class="metadata-item">
                        <strong>Date & Time</strong>
                        ${new Date(takenDate).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      
                      <div class="metadata-item">
                        <strong>Media Type</strong>
                        ${media.file_type === 'video' ? '🎥 Video' : '📷 Photo'}
                      </div>
                      
                      ${media.latitude && media.longitude ? `
                        <div class="metadata-item">
                          <strong>GPS Coordinates</strong>
                          ${media.latitude.toFixed(6)}°, ${media.longitude.toFixed(6)}°
                        </div>
                      ` : ''}
                      
                      ${media.location_name ? `
                        <div class="metadata-item">
                          <strong>Location</strong>
                          ${media.location_name}
                        </div>
                      ` : ''}
                      
                      ${media.description ? `
                        <div class="metadata-item" style="grid-column: 1 / -1;">
                          <strong>Description</strong>
                          ${media.description}
                        </div>
                      ` : ''}
                    </div>
                    
                    ${comments.length > 0 ? `
                      <div class="comments-section">
                        <div class="comments-title">
                          💬 Comments (${comments.length})
                        </div>
                        ${comments.map((comment: any) => `
                          <div class="comment">
                            <span class="comment-author">${comment.profiles?.full_name || 'User'}:</span>
                            ${comment.comment_text}
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-company">${branding.companyLegalName}</div>
            <div>© ${new Date().getFullYear()} ${branding.companyLegalName}. All Rights Reserved.</div>
            <div style="margin-top: 12px; font-size: 11px;">
              This report is confidential and intended solely for the use of ${options.clientName}
            </div>
          </div>
          
        </div>
      </body>
    </html>
  `;
}
