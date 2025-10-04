/**
 * Video utility functions for duration formatting and size estimation
 */

export const MAX_VIDEO_DURATION = 120; // seconds (2 minutes)
export const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150MB
export const BYTES_PER_SECOND = 650000; // ~650KB/sec for medium quality 1080p

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration with labels for display
 */
export function formatDurationWithLabel(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins === 0) {
    return `${secs}s`;
  }
  
  return `${mins}m ${secs}s`;
}

/**
 * Estimate video file size based on duration
 */
export function estimateVideoSize(durationSeconds: number): number {
  return Math.floor(durationSeconds * BYTES_PER_SECOND);
}

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Check if estimated size exceeds limit
 */
export function isVideoSizeExceeded(durationSeconds: number): boolean {
  return estimateVideoSize(durationSeconds) >= MAX_VIDEO_SIZE;
}

/**
 * Get time remaining before hitting size limit
 */
export function getTimeRemainingBeforeSizeLimit(currentDuration: number): number {
  const maxDurationForSize = MAX_VIDEO_SIZE / BYTES_PER_SECOND;
  return Math.max(0, maxDurationForSize - currentDuration);
}

/**
 * Extract video duration from a video file or blob
 * Returns duration in seconds
 */
export async function getVideoDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}
