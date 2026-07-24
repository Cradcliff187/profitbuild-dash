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
 * Grab a still frame from a video file as a JPEG blob, for use as a
 * thumbnail. Runs entirely client-side (canvas frame-grab) — the hosted
 * Supabase edge runtime cannot run ffmpeg, so this is the only viable
 * thumbnail pipeline (Gotcha #75). Resolves null on any failure or after
 * a 10s timeout; callers treat a missing thumbnail as non-fatal.
 */
export async function captureVideoThumbnail(
  file: File | Blob,
  maxWidth = 640,
  seekToSeconds = 1
): Promise<Blob | null> {
  return new Promise((resolve) => {
    let settled = false;
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    const finish = (result: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), 10000);
    // If seeking never fires 'seeked' (e.g. target time equals current time,
    // or a platform quirk), grab whatever frame is decoded rather than
    // burning the full timeout.
    let fallbackTimer: ReturnType<typeof setTimeout>;

    // iOS can hand back an undecoded (all-black) frame — better to detect it
    // and return null (callers show an honest placeholder) than to save a
    // black thumbnail everywhere the video appears.
    const looksBlack = (ctx: CanvasRenderingContext2D, width: number, height: number): boolean => {
      try {
        const step = Math.max(1, Math.floor(Math.min(width, height) / 5));
        let samples = 0;
        let dark = 0;
        for (let y = step; y < height; y += step) {
          for (let x = step; x < width; x += step) {
            const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
            samples++;
            if (r < 10 && g < 10 && b < 10) dark++;
          }
        }
        return samples > 0 && dark === samples;
      } catch {
        return false;
      }
    };

    const capture = () => {
      if (settled) return;
      try {
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        if (!sourceWidth || !sourceHeight) {
          finish(null);
          return;
        }
        const width = Math.min(maxWidth, sourceWidth);
        const height = Math.round(width * (sourceHeight / sourceWidth));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        if (looksBlack(ctx, width, height)) {
          finish(null);
          return;
        }
        canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.8);
      } catch {
        finish(null);
      }
    };

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    video.onerror = () => finish(null);

    video.onloadedmetadata = () => {
      // Seek into the clip (mid-point for very short videos) so we don't
      // capture a black first frame
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = duration > 0 ? Math.min(seekToSeconds, duration / 2) : 0;
    };

    video.onloadeddata = () => {
      // Frame 0 is decoded; if the seek's 'seeked' event never arrives,
      // capture what we have after a short grace period.
      fallbackTimer = setTimeout(capture, 3000);
    };

    video.onseeked = capture;

    video.src = objectUrl;
  });
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
