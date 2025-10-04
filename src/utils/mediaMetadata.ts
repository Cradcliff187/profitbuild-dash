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

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150MB

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate media file type and size
 */
export function validateMediaFile(file: File): ValidationResult {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      isValid: false,
      error: `Invalid file type: ${file.type}. Allowed types: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}`,
    };
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      isValid: false,
      error: `File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum ${maxSizeMB}MB`,
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

/**
 * Extract EXIF metadata from image file
 * Note: This is a placeholder. In production, you would use a library like exifr
 * For now, returns null values - actual EXIF extraction should be done on native side
 */
export async function extractExifMetadata(file: File): Promise<{
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  takenAt: string | null;
  deviceModel: string | null;
}> {
  // This is a placeholder implementation
  // In a real app, you would use a library like 'exifr' to extract EXIF data
  // However, for Capacitor apps, it's better to extract EXIF on the native side
  // using the Camera plugin metadata
  
  return {
    latitude: null,
    longitude: null,
    altitude: null,
    takenAt: null,
    deviceModel: null,
  };
}

/**
 * Get device information
 * Note: This should be called from Capacitor Device API in actual implementation
 */
export function getDeviceInfo(): {
  model: string | null;
  platform: string | null;
  osVersion: string | null;
} {
  // Placeholder - should use Capacitor Device API
  return {
    model: null,
    platform: typeof window !== 'undefined' ? 'web' : null,
    osVersion: null,
  };
}

/**
 * Convert bytes to human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format GPS coordinates to readable string
 */
export function formatCoordinates(
  latitude: number,
  longitude: number
): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  
  return `${Math.abs(latitude).toFixed(6)}°${latDir}, ${Math.abs(longitude).toFixed(6)}°${lonDir}`;
}

/**
 * Check if browser supports certain media types
 */
export function getSupportedMediaTypes(): {
  supportsHeic: boolean;
  supportsWebP: boolean;
} {
  const canvas = document.createElement('canvas');
  
  return {
    supportsHeic: false, // HEIC not supported in browsers
    supportsWebP: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0,
  };
}
