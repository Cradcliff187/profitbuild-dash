import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { ProjectMedia } from '@/types/project';
import { formatFileSize, formatDuration } from './videoUtils';

export interface MediaComment {
  id: string;
  media_id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

export interface MediaReportOptions {
  projectName: string;
  projectNumber: string;
  clientName: string;
  address?: string;
  mediaItems: ProjectMedia[];
  reportTitle?: string;
  comments?: Map<string, MediaComment[]>;
  aggregateComments?: boolean;
  includeThumbnails?: boolean;
  onProgress?: (current: number, total: number) => void;
}

export interface PDFGenerationResult {
  blob: Blob;
  stats: {
    total: number;
    successful: number;
    failed: number;
    failedItems: string[];
  };
}

// PDF Layout Constants
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
const IMAGE_MAX_HEIGHT = 180; // Leave room for metadata

/**
 * Fetch image from URL and convert to base64 data URI
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

/**
 * Calculate image dimensions to fit within constraints while preserving aspect ratio
 */
function calculateImageDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; x: number; y: number } {
  let width = imgWidth;
  let height = imgHeight;
  
  // Scale down if too wide
  if (width > maxWidth) {
    height = (maxWidth / width) * height;
    width = maxWidth;
  }
  
  // Scale down if too tall
  if (height > maxHeight) {
    width = (maxHeight / height) * width;
    height = maxHeight;
  }
  
  // Center horizontally
  const x = MARGIN + (CONTENT_WIDTH - width) / 2;
  const y = MARGIN;
  
  return { width, height, x, y };
}

/**
 * Format GPS coordinates to readable string
 */
function formatGPSCoordinates(lat?: number, lon?: number): string {
  if (lat === undefined || lon === undefined) return '';
  
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

/**
 * Format timestamp to human-readable format
 */
function formatTimestamp(isoString?: string): string {
  if (!isoString) return '';
  
  try {
    return format(new Date(isoString), 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
}

/**
 * Get image dimensions from base64 data URI
 */
function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Format user display name from profile data
 */
function formatUserName(comment: MediaComment): string {
  if (comment.profiles?.full_name) {
    return comment.profiles.full_name;
  }
  if (comment.profiles?.email) {
    return comment.profiles.email.split('@')[0];
  }
  return 'Unknown User';
}

/**
 * Render comments section in PDF
 */
function renderComments(
  doc: jsPDF,
  comments: MediaComment[],
  startY: number,
  maxY: number = PAGE_HEIGHT - MARGIN
): number {
  if (comments.length === 0) return startY;

  let currentY = startY;

  // Comments header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Comments:', MARGIN, currentY);
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  for (const comment of comments) {
    // Check if we need a new page
    if (currentY > maxY - 15) {
      doc.addPage();
      currentY = MARGIN;
    }

    const userName = formatUserName(comment);
    const timestamp = formatTimestamp(comment.created_at);
    const header = `• ${userName} (${timestamp}):`;
    
    doc.setFont('helvetica', 'bold');
    doc.text(header, MARGIN + 3, currentY);
    currentY += 5;

    // Comment text (wrapped)
    doc.setFont('helvetica', 'normal');
    const commentLines = doc.splitTextToSize(`"${comment.comment_text}"`, CONTENT_WIDTH - 6);
    
    for (const line of commentLines) {
      if (currentY > maxY - 10) {
        doc.addPage();
        currentY = MARGIN;
      }
      doc.text(line, MARGIN + 6, currentY);
      currentY += 4;
    }
    
    currentY += 3; // Space between comments
  }

  doc.setTextColor(0, 0, 0);
  return currentY;
}

/**
 * Generate PDF report for project media
 */
export async function generateMediaReportPDF(options: MediaReportOptions): Promise<PDFGenerationResult> {
  const {
    projectName,
    projectNumber,
    clientName,
    address,
    mediaItems,
    reportTitle = 'Project Media Report',
    comments = new Map(),
    aggregateComments = false,
    onProgress,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const stats = {
    total: mediaItems.length,
    successful: 0,
    failed: 0,
    failedItems: [] as string[]
  };

  // Count media types
  const photoCount = mediaItems.filter(m => m.file_type === 'image').length;
  const videoCount = mediaItems.filter(m => m.file_type === 'video').length;
  
  // Calculate total file size
  const totalSize = mediaItems.reduce((sum, m) => sum + (m.file_size || 0), 0);

  // === COVER PAGE ===
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, PAGE_WIDTH / 2, 40, { align: 'center' });

  // Project details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Details', MARGIN, 70);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  let y = 85;
  
  doc.text(`Project Name: ${projectName}`, MARGIN, y);
  y += 10;
  doc.text(`Project Number: ${projectNumber}`, MARGIN, y);
  y += 10;
  doc.text(`Client: ${clientName}`, MARGIN, y);
  y += 10;
  
  if (address) {
    doc.text(`Address: ${address}`, MARGIN, y);
    y += 10;
  }

  // Report metadata
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Report Information', MARGIN, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, MARGIN, y);
  y += 10;
  doc.text(`Total Media: ${mediaItems.length} items (${photoCount} photos, ${videoCount} videos)`, MARGIN, y);
  y += 10;
  doc.text(`Total Size: ${formatFileSize(totalSize)}`, MARGIN, y);

  // === MEDIA PAGES ===
  for (let i = 0; i < mediaItems.length; i++) {
    const media = mediaItems[i];
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, mediaItems.length);
    }
    
    doc.addPage();

    try {
      // Fetch and embed image/thumbnail
      const imageUrl = media.file_type === 'video' ? media.thumbnail_url : media.file_url;
      if (!imageUrl) {
        throw new Error('No image URL available');
      }

      const base64Image = await fetchImageAsBase64(imageUrl);
      const imgDims = await getImageDimensions(base64Image);
      
      const dims = calculateImageDimensions(
        imgDims.width,
        imgDims.height,
        CONTENT_WIDTH,
        IMAGE_MAX_HEIGHT
      );

      doc.addImage(base64Image, 'JPEG', dims.x, dims.y, dims.width, dims.height);

      // Add video badge overlay
      if (media.file_type === 'video') {
        // Dark background for badge
        doc.setFillColor(0, 0, 0);
        doc.rect(dims.x + 10, MARGIN + 10, 60, 20, 'F');

        // Play icon and text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('▶ VIDEO', dims.x + 15, MARGIN + 22);
        doc.setTextColor(0, 0, 0);
      }

      // Metadata section
      let metaY = MARGIN + dims.height + 15;
      doc.setFont('helvetica', 'normal');

      // Media count
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Media ${i + 1} of ${mediaItems.length}`, PAGE_WIDTH - MARGIN, metaY, { align: 'right' });

      // Caption (bold)
      if (media.caption) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(media.caption, MARGIN, metaY, { maxWidth: CONTENT_WIDTH });
        metaY += 10;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Description
      if (media.description) {
        doc.text(`Description: ${media.description}`, MARGIN, metaY, { maxWidth: CONTENT_WIDTH });
        metaY += 8;
      }

      // Timestamp
      const timestamp = formatTimestamp(media.taken_at || media.created_at);
      if (timestamp) {
        doc.text(`Date: ${timestamp}`, MARGIN, metaY);
        metaY += 6;
      }

      // GPS Coordinates
      const gps = formatGPSCoordinates(media.latitude, media.longitude);
      if (gps) {
        doc.text(`GPS: ${gps}`, MARGIN, metaY);
        metaY += 6;
      }

      // Location name
      if (media.location_name) {
        doc.text(`Location: ${media.location_name}`, MARGIN, metaY);
        metaY += 6;
      }

      // Video duration
      if (media.file_type === 'video' && media.duration) {
        doc.text(`Duration: ${formatDuration(media.duration)}`, MARGIN, metaY);
        metaY += 6;
      }

      // File details
      const fileDetails = [];
      if (media.file_name) {
        fileDetails.push(media.file_name);
      }
      if (media.file_size) {
        fileDetails.push(formatFileSize(media.file_size));
      }
      if (fileDetails.length > 0) {
        doc.text(`File: ${fileDetails.join(' - ')}`, MARGIN, metaY);
        metaY += 6;
      }

      // Render comments for this media (if not aggregating)
      if (!aggregateComments && comments.has(media.id)) {
        const mediaComments = comments.get(media.id)!;
        if (mediaComments.length > 0) {
          metaY += 3;
          renderComments(doc, mediaComments, metaY, PAGE_HEIGHT - MARGIN);
        }
      }

      stats.successful++;

    } catch (error) {
      console.error(`Failed to load media ${media.id}:`, error);
      stats.failed++;
      stats.failedItems.push(media.file_name || media.caption || 'Unknown file');
      
      // Add placeholder for failed media
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(14);
      doc.text('[Media failed to load]', MARGIN, MARGIN + 50);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      let errorY = MARGIN + 70;
      
      if (media.file_name) {
        doc.text(`File: ${media.file_name}`, MARGIN, errorY);
        errorY += 10;
      }
      if (media.caption) {
        doc.text(`Caption: ${media.caption}`, MARGIN, errorY);
        errorY += 10;
      }
      
      doc.text(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, MARGIN, errorY);
    }
  }

  // === AGGREGATED COMMENTS PAGE (if enabled) ===
  if (aggregateComments && comments.size > 0) {
    doc.addPage();
    
    // Page header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Comments Summary', PAGE_WIDTH / 2, MARGIN + 10, { align: 'center' });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, MARGIN + 15, PAGE_WIDTH - MARGIN, MARGIN + 15);
    
    let currentY = MARGIN + 25;
    let totalComments = 0;

    // Iterate through media items in order
    for (const media of mediaItems) {
      const mediaComments = comments.get(media.id);
      if (!mediaComments || mediaComments.length === 0) continue;

      totalComments += mediaComments.length;

      // Check if we need a new page
      if (currentY > PAGE_HEIGHT - 50) {
        doc.addPage();
        currentY = MARGIN;
      }

      // Media header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      const mediaTitle = media.caption || media.file_name || `Media ${mediaItems.indexOf(media) + 1}`;
      doc.text(mediaTitle, MARGIN, currentY);
      currentY += 7;

      // Render comments for this media
      currentY = renderComments(doc, mediaComments, currentY, PAGE_HEIGHT - MARGIN);
      currentY += 5; // Space before next media section
    }

    // Summary footer
    if (currentY > PAGE_HEIGHT - 30) {
      doc.addPage();
      currentY = MARGIN;
    }

    currentY += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Total: ${totalComments} comments across ${mediaItems.length} media items`,
      PAGE_WIDTH / 2,
      currentY,
      { align: 'center' }
    );
  }

  // Return result with stats
  return {
    blob: doc.output('blob'),
    stats
  };
}
