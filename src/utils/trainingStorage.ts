import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'training-content';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  document: ['application/pdf'],
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Upload a training content file to Supabase storage
 */
export async function uploadTrainingFile(
  file: File,
  contentType: 'document' | 'presentation'
): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = ALLOWED_MIME_TYPES[contentType];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed: ${contentType === 'document' ? 'PDF' : 'PowerPoint (.ppt, .pptx)'}`,
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File too large. Maximum size: 50MB',
      };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Generate storage path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${timestamp}_${sanitizedName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    return {
      success: true,
      path: uploadData.path,
    };

  } catch (err) {
    const error = err as Error;
    console.error('Upload exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a training content file from storage
 */
export async function deleteTrainingFile(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Download a training file as a Blob (bypasses CORS issues)
 */
export async function downloadTrainingFileBlob(path: string | null): Promise<Blob | null> {
  if (!path) return null;
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path);

    if (error) {
      console.error('Download blob error:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('downloadTrainingFileBlob error:', err);
    return null;
  }
}

/**
 * Get a signed URL for viewing a training file
 */
export async function getTrainingFileUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (err) {
    console.error('getTrainingFileUrl error:', err);
    return null;
  }
}

/**
 * Parse video URL to extract platform and ID
 */
export function parseVideoUrl(url: string): { platform: string; id: string } | null {
  if (!url) return null;
  
  // YouTube - multiple formats
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) return { platform: 'youtube', id: match[1] };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] };

  // Loom
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) return { platform: 'loom', id: loomMatch[1] };

  return null;
}

/**
 * Convert video URL to embeddable URL
 */
export function getVideoEmbedUrl(url: string): string | null {
  const parsed = parseVideoUrl(url);
  if (!parsed) return null;

  switch (parsed.platform) {
    case 'youtube':
      return `https://www.youtube.com/embed/${parsed.id}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${parsed.id}`;
    case 'loom':
      return `https://www.loom.com/embed/${parsed.id}`;
    default:
      return null;
  }
}

/**
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() || '';
}

