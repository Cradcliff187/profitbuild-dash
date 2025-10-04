import { supabase } from "@/integrations/supabase/client";
import type { ProjectMedia } from "@/types/project";
import { generateStoragePath, validateMediaFile } from "./mediaMetadata";

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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    // Get signed URL for the uploaded file
    const { data: signedUrlData } = await supabase.storage
      .from('project-media')
      .createSignedUrl(uploadData.path, 3600); // 1 hour expiry

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
 * Delete media file from storage and database
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

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('project-media')
      .remove([media.file_url]);

    if (storageError) {
      return {
        success: false,
        error: storageError,
      };
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from('project_media')
      .delete()
      .eq('id', mediaId);

    if (dbError) {
      return {
        success: false,
        error: dbError,
      };
    }

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

    // Generate signed URLs for all media
    const mediaWithUrls = await Promise.all(
      (data || []).map(async (media) => {
        const { data: signedUrlData } = await supabase.storage
          .from('project-media')
          .createSignedUrl(media.file_url, 3600);

        return {
          ...media,
          file_url: signedUrlData?.signedUrl || media.file_url,
        } as ProjectMedia;
      })
    );

    return {
      data: mediaWithUrls,
      error: null,
    };
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
    caption?: string;
    description?: string;
    location_name?: string;
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

    // Get signed URL
    const { data: signedUrlData } = await supabase.storage
      .from('project-media')
      .createSignedUrl(data.file_url, 3600);

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
