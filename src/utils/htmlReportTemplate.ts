import { getCompanyBranding, CompanyBranding } from './companyBranding';
import { ProjectMedia } from '@/types/project';

interface MediaComment {
  id: string;
  comment_text: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface GenerateHTMLReportOptions {
  projectName: string;
  projectNumber: string;
  clientName: string;
  address?: string;
  reportTitle: string;
  mediaItems: ProjectMedia[];
  comments?: Map<string, MediaComment[]>;
}

export async function generateMediaReportHTML(options: GenerateHTMLReportOptions): Promise<string> {
  const branding = await getCompanyBranding();
  
  const primaryColor = branding?.primary_color || '#cf791d';
  const secondaryColor = branding?.secondary_color || '#1b2b43';
  const accentColor = branding?.accent_color || '#cf791d';
  const lightBgColor = branding?.light_bg_color || '#f4f7f9';
  const companyName = branding?.company_name || 'Radcliff Construction Group';
  const companyLegalName = branding?.company_legal_name || 'Radcliff Construction Group, LLC';
  const logoUrl = branding?.logo_full_url || '';

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
            background-color: ${lightBgColor};
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
            background: linear-gradient(135deg, ${secondaryColor} 0%, #243550 100%);
            padding: 60px 40px;
            text-align: center;
            border-bottom: 4px solid ${primaryColor};
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
            color: ${secondaryColor};
            margin: 0 0 30px 0;
            text-align: center;
          }
          
          .project-details {
            background: ${lightBgColor};
            padding: 30px;
            border-radius: 12px;
            border-left: 4px solid ${primaryColor};
            margin-bottom: 40px;
          }
          
          .project-details-title {
            color: ${secondaryColor};
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
            color: ${secondaryColor};
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
            background: ${lightBgColor};
          }
          
          .caption {
            font-size: 18px;
            font-weight: 600;
            color: ${secondaryColor};
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
            color: ${secondaryColor};
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
            border-left: 3px solid ${accentColor};
            border-radius: 6px;
          }
          
          .comments-title {
            color: ${primaryColor};
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
            color: ${secondaryColor};
          }
          
          .footer {
            text-align: center;
            padding: 40px;
            color: #a0aec0;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
            background: ${lightBgColor};
          }
          
          .footer-company {
            font-weight: 600;
            color: ${secondaryColor};
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
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo">` : ''}
            <h1 class="header-title">${companyName}</h1>
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
            ${options.mediaItems.map((media, index) => {
              const comments = options.comments?.get(media.id) || [];
              const takenDate = media.taken_at || media.created_at;
              
              return `
                <div class="media-item">
                  <div class="media-image-container">
                    <img 
                      src="${media.file_url}" 
                      alt="${media.caption || 'Project Media'}" 
                      class="media-image"
                      onerror="this.style.display='none'"
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
                        ${comments.map(comment => `
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
            <div class="footer-company">${companyLegalName}</div>
            <div>© ${new Date().getFullYear()} ${companyLegalName}. All Rights Reserved.</div>
            <div style="margin-top: 12px; font-size: 11px;">
              This report is confidential and intended solely for the use of ${options.clientName}
            </div>
          </div>
          
        </div>
      </body>
    </html>
  `;
}
