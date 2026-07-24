/**
 * Metadata extraction and validation utilities for project media
 */

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate media file type and size (supports images, videos, and documents)
 */
export function validateMediaFile(file: File): ValidationResult {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type);

  if (!isImage && !isVideo && !isDocument) {
    return {
      isValid: false,
      error: `Invalid file type: ${file.type}. Allowed types: images (JPG, PNG, WebP), videos (MP4, MOV), documents (PDF, Word, Excel, Text)`,
    };
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE 
                : isVideo ? MAX_VIDEO_SIZE 
                : MAX_DOCUMENT_SIZE;
                
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    const fileType = isImage ? 'Image' : isVideo ? 'Video' : 'Document';
    return {
      isValid: false,
      error: `${fileType} size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum ${maxSizeMB}MB`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Generate standardized storage path for media files
 * Format: {userId}/{projectId}/{timestamp}-{sanitizedFilename}
 */
export function generateStoragePath(
  userId: string,
  projectId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(filename);
  return `${userId}/${projectId}/${timestamp}-${sanitized}`;
}

/**
 * Sanitize filename by removing special characters and spaces
 */
function sanitizeFilename(filename: string): string {
  // Get file extension
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot) : '';

  // Replace spaces with hyphens, remove special characters
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .substring(0, 50); // Limit length

  return sanitized + ext;
}

// Dead placeholder helpers removed Jul 2026 (field-media audit): the stub
// extractExifMetadata / getDeviceInfo (always returned nulls), a duplicate
// formatFileSize (canonical one lives in videoUtils), formatCoordinates and
// getSupportedMediaTypes (no consumers).
