import { supabase } from "@/integrations/supabase/client";
import type { ProjectMedia, MediaCategory } from "@/types/project";
import { generateStoragePath, validateMediaFile } from "./mediaMetadata";
import { captureVideoThumbnail } from "./videoUtils";

export interface UploadProjectMediaParams {
  projectId: string;
  file: File;
  caption?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  altitude?: number;
  deviceModel?: string;
  takenAt?: string;
  uploadSource?: 'camera' | 'gallery' | 'web';
  duration?: number;
}

export interface UploadProjectMediaResult {
  data: ProjectMedia | null;
  error: Error | null;
}

/**
 * Upload media file to project-media bucket and create database record
 */
export async function uploadProjectMedia(
  params: UploadProjectMediaParams
): Promise<UploadProjectMediaResult> {
  try {
    const { projectId, file, ...metadata } = params;

    // Validate file
    const validation = validateMediaFile(file);
    if (!validation.isValid) {
      return {
        data: null,
        error: new Error(validation.error || 'Invalid file'),
      };
    }

    // Read the user from the local session — getUser() is a network
    // round-trip that serializes concurrent queries behind the auth lock
    // (Gotcha #63)
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return {
        data: null,
        error: new Error('User not authenticated'),
      };
    }

    // Generate storage path
    const storagePath = generateStoragePath(user.id, projectId, file.name);

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return {
        data: null,
        error: uploadError,
      };
    }

    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 'video';

    // Create database record
    const { data: mediaRecord, error: dbError } = await supabase
      .from('project_media')
      .insert({
        project_id: projectId,
        file_url: uploadData.path,
        file_name: file.name,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        caption: metadata.caption,
        description: metadata.description,
        taken_at: metadata.takenAt,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        location_name: metadata.locationName,
        altitude: metadata.altitude,
        device_model: metadata.deviceModel,
        uploaded_by: user.id,
        upload_source: metadata.uploadSource || 'web',
        duration: metadata.duration,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete uploaded file
      await supabase.storage.from('project-media').remove([uploadData.path]);
      return {
        data: null,
        error: dbError,
      };
    }

    // Get signed URL for the uploaded file (7 days expiry)
    const { data: signedUrlData } = await supabase.storage
      .from('project-media')
      .createSignedUrl(uploadData.path, 604800); // 7 days expiry

    // Generate a thumbnail for videos in the background (don't await).
    // Client-side canvas frame-grab — the old generate-video-thumbnail edge
    // function spawned ffmpeg, which the hosted edge runtime can't run, so
    // it never produced a single thumbnail (Gotcha #75). The DB stores the
    // storage PATH ('thumbnails/{id}.jpg'); readers sign it by convention.
    if (fileType === 'video') {
      (async () => {
        try {
          const thumbBlob = await captureVideoThumbnail(file);
          if (!thumbBlob) return;

          const thumbPath = `thumbnails/${mediaRecord.id}.jpg`;
          const { error: thumbUploadError } = await supabase.storage
            .from('project-media-thumbnails')
            .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' });

          if (thumbUploadError) {
            console.warn('Thumbnail upload failed:', thumbUploadError.message);
            return;
          }

          const { error: thumbDbError } = await supabase
            .from('project_media')
            .update({ thumbnail_url: thumbPath })
            .eq('id', mediaRecord.id);

          if (thumbDbError) {
            console.warn('Thumbnail record update failed:', thumbDbError.message);
          }
        } catch (err) {
          console.warn('Thumbnail generation error:', err);
        }
      })();
    }

    return {
      data: {
        ...mediaRecord,
        file_url: signedUrlData?.signedUrl || mediaRecord.file_url,
        created_at: mediaRecord.created_at,
        updated_at: mediaRecord.updated_at,
      } as ProjectMedia,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Delete media from database, then storage — in that order.
 *
 * DB first is load-bearing: RLS can block the row delete WITHOUT an error
 * (0 rows affected), and the old storage-first order then left a DB row
 * pointing at a removed object — a permanently broken tile in every gallery.
 * An orphaned storage object (DB gone, storage remove failed) is the
 * harmless direction, so storage cleanup is best-effort.
 */
export async function deleteProjectMedia(
  mediaId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Get media record first
    const { data: media, error: fetchError } = await supabase
      .from('project_media')
      .select('file_url')
      .eq('id', mediaId)
      .single();

    if (fetchError || !media) {
      return {
        success: false,
        error: fetchError || new Error('Media not found'),
      };
    }

    // Delete database record and verify a row was actually removed —
    // RLS silently deletes 0 rows for callers without permission.
    const { data: deletedRows, error: dbError } = await supabase
      .from('project_media')
      .delete()
      .eq('id', mediaId)
      .select('id');

    if (dbError) {
      return {
        success: false,
        error: dbError,
      };
    }

    if (!deletedRows || deletedRows.length === 0) {
      return {
        success: false,
        error: new Error('You do not have permission to delete this item'),
      };
    }

    // Best-effort storage cleanup (file + any generated video thumbnail)
    const { error: storageError } = await supabase.storage
      .from('project-media')
      .remove([media.file_url]);

    if (storageError) {
      console.warn('Media DB row deleted but storage cleanup failed:', storageError.message);
    }

    await supabase.storage
      .from('project-media-thumbnails')
      .remove([`thumbnails/${mediaId}.jpg`])
      .catch(() => { /* thumbnail may not exist — fine */ });

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Get media list for a project with signed URLs
 */
export async function getProjectMediaList(
  projectId: string,
  options?: {
    fileType?: 'image' | 'video';
    limit?: number;
    offset?: number;
  }
): Promise<{ data: ProjectMedia[]; error: Error | null }> {
  try {
    let query = supabase
      .from('project_media')
      .select('*')
      .eq('project_id', projectId)
      .order('taken_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (options?.fileType) {
      query = query.eq('file_type', options.fileType);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return {
        data: [],
        error,
      };
    }

    // PostgREST caps every response at 1,000 rows (Gotcha #23) — largest
    // project holds ~20 media today, but surface the truncation loudly if a
    // project ever gets there so it doesn't fail silently.
    if ((data || []).length === 1000) {
      console.warn(`getProjectMediaList: hit the 1,000-row cap for project ${projectId} — media list is truncated; pagination needed`);
    }

    // Batch generate signed URLs for all media (7 days expiry)
    const mediaPaths = (data || []).map((media) => media.file_url);

    const { data: signedUrls, error: signedUrlError } = await supabase.storage
      .from('project-media')
      .createSignedUrls(mediaPaths, 604800);

    if (signedUrlError) {
      console.error('Failed to batch generate signed URLs:', signedUrlError);
    }

    // Build a map from path → signedUrl for O(1) lookup
    const signedUrlMap = new Map<string, string>();
    if (signedUrls) {
      signedUrls.forEach((item) => {
        if (item.signedUrl && item.path) {
          signedUrlMap.set(item.path, item.signedUrl);
        }
      });
    }

    // Batch generate thumbnail signed URLs for videos
    const videoMedia = (data || []).filter(
      (media) => media.file_type === 'video' && media.thumbnail_url
    );
    const thumbnailPaths = videoMedia.map((media) => `thumbnails/${media.id}.jpg`);

    const thumbnailUrlMap = new Map<string, string>();
    if (thumbnailPaths.length > 0) {
      const { data: thumbSignedUrls } = await supabase.storage
        .from('project-media-thumbnails')
        .createSignedUrls(thumbnailPaths, 604800);

      if (thumbSignedUrls) {
        thumbSignedUrls.forEach((item) => {
          if (item.signedUrl && item.path) {
            thumbnailUrlMap.set(item.path, item.signedUrl);
          }
        });
      }
    }

    // Map signed URLs back to media items
    const mediaWithUrls: ProjectMedia[] = (data || []).map((media) => {
      const signedUrl = signedUrlMap.get(media.file_url);
      let thumbnailUrl = media.thumbnail_url;

      if (media.file_type === 'video' && media.thumbnail_url) {
        const thumbKey = `thumbnails/${media.id}.jpg`;
        thumbnailUrl = thumbnailUrlMap.get(thumbKey) || thumbnailUrl;
      }

      return {
        ...media,
        file_url: signedUrl || media.file_url,
        thumbnail_url: thumbnailUrl,
        source: 'media',
      } as ProjectMedia;
    });

    // Merge in image/video attachments from project_notes so photos/videos
    // shared in the Notes tab also surface on the Media tab. The note row is
    // synthesized into ProjectMedia shape with source='note'; lightboxes use
    // that flag to hide delete + the media comment thread (the note is the
    // conversation).
    const typeFilter = options?.fileType ?? null;
    const noteTypes =
      typeFilter === 'image' ? ['image'] : typeFilter === 'video' ? ['video'] : ['image', 'video'];

    const { data: noteRows, error: notesError } = await supabase
      .from('project_notes')
      .select('id, user_id, note_text, attachment_url, attachment_type, attachment_name, created_at, updated_at')
      .eq('project_id', projectId)
      .not('attachment_url', 'is', null)
      .in('attachment_type', noteTypes)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Failed to load note attachments for Media tab:', notesError);
    }

    const noteMedia: ProjectMedia[] = (noteRows || []).map((row) => ({
      id: `note:${row.id}`,
      project_id: projectId,
      file_url: row.attachment_url as string,
      file_name: row.attachment_name || row.note_text?.slice(0, 60) || 'Note attachment',
      file_type: (row.attachment_type === 'video' ? 'video' : 'image') as 'image' | 'video',
      mime_type: row.attachment_type === 'video' ? 'video/mp4' : 'image/jpeg',
      file_size: 0,
      caption: row.note_text || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      uploaded_by: row.user_id || undefined,
      source: 'note',
      note_id: row.id,
      note_text: row.note_text || undefined,
    }));

    const merged = [...mediaWithUrls, ...noteMedia].sort((a, b) => {
      const aTime = new Date(a.taken_at || a.created_at).getTime();
      const bTime = new Date(b.taken_at || b.created_at).getTime();
      return bTime - aTime;
    });

    return { data: merged, error: null };
  } catch (error) {
    return {
      data: [],
      error: error as Error,
    };
  }
}

/**
 * Update media metadata (caption, description, location)
 */
export async function updateMediaMetadata(
  mediaId: string,
  updates: {
    file_name?: string;
    caption?: string;
    description?: string;
    location_name?: string;
    category?: MediaCategory | null;
  }
): Promise<{ data: ProjectMedia | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('project_media')
      .update(updates)
      .eq('id', mediaId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error,
      };
    }

    // Get signed URL (7 days expiry)
    const { data: signedUrlData } = await supabase.storage
      .from('project-media')
      .createSignedUrl(data.file_url, 604800);

    return {
      data: {
        ...data,
        file_url: signedUrlData?.signedUrl || data.file_url,
      } as ProjectMedia,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Refresh signed URL for a single media item
 * Used when images fail to load due to expired URLs
 */
export async function refreshMediaSignedUrl(
  mediaId: string
): Promise<{ signedUrl: string | null; thumbnailUrl: string | null; error: Error | null }> {
  try {
    // Fetch the media item to get file paths
    const { data: media, error: fetchError } = await supabase
      .from('project_media')
      .select('file_url, thumbnail_url, file_type, id')
      .eq('id', mediaId)
      .single();

    if (fetchError || !media) {
      return { signedUrl: null, thumbnailUrl: null, error: fetchError || new Error('Media not found') };
    }

    // Generate new signed URLs (7 days)
    const { data: signedUrlData } = await supabase.storage
      .from('project-media')
      .createSignedUrl(media.file_url, 604800);

    let thumbnailUrl = null;
    if (media.thumbnail_url && media.file_type === 'video') {
      const { data: thumbnailUrlData } = await supabase.storage
        .from('project-media-thumbnails')
        .createSignedUrl(`thumbnails/${media.id}.jpg`, 604800);
      thumbnailUrl = thumbnailUrlData?.signedUrl || null;
    }

    return {
      signedUrl: signedUrlData?.signedUrl || null,
      thumbnailUrl,
      error: null
    };
  } catch (error) {
    return { signedUrl: null, thumbnailUrl: null, error: error as Error };
  }
}
