import { supabase } from '@/integrations/supabase/client';
import { getQueue, markAsSynced, markAsFailed, updateOperationStatus, QueuedOperation, base64ToFile } from './syncQueue';
import { resolveConflict } from './conflictResolution';
import { uploadProjectMedia } from './projectMedia';

let isProcessing = false;

export const startSyncService = () => {
  window.addEventListener('online', async () => {
    await processQueue();
  });

  // Also process queue on page load if online
  if (navigator.onLine) {
    processQueue();
  }
};

export const processQueue = async (): Promise<void> => {
  if (isProcessing) {
    console.log('⏳ Sync already in progress');
    return;
  }

  isProcessing = true;
  const queue = await getQueue();
  const pendingOps = queue.filter(op => op.status === 'pending' || (op.status === 'failed' && op.retryCount < 3));

  if (pendingOps.length === 0) {
    isProcessing = false;
    return;
  }

  console.log(`🔄 Syncing ${pendingOps.length} operations...`);

  for (const operation of pendingOps) {
    try {
      await updateOperationStatus(operation.id, 'syncing');

      switch (operation.type) {
        case 'clock_out':
          await syncClockOut(operation);
          break;
        case 'edit_entry':
          await syncEditEntry(operation);
          break;
        case 'delete_entry':
          await syncDeleteEntry(operation);
          break;
        case 'media_upload':
          await syncMediaUpload(operation);
          break;
        case 'bid_media_upload':
          await syncBidMediaUpload(operation);
          break;
        default:
          console.warn('Unknown operation type:', operation.type);
      }

      await markAsSynced(operation.id);
      console.log('✅ Synced:', operation.type, operation.id);
    } catch (error) {
      console.error('❌ Sync failed:', operation.type, error);
      await markAsFailed(operation.id);

      // If max retries exceeded, log for manual resolution
      if (operation.retryCount >= 2) {
        console.error('🚨 Max retries exceeded for operation:', operation.id);
      }
    }
  }

  isProcessing = false;
  console.log('✅ Sync complete');
};

const syncClockOut = async (operation: QueuedOperation) => {
  const { payload } = operation;

  // Check if already synced by local_id
  if (payload.local_id) {
    const { data: existing } = await supabase
      .from('expenses')
      .select('id')
      .eq('local_id', payload.local_id)
      .maybeSingle();

    if (existing) {
      console.log('⚠️ Entry already synced, skipping');
      return;
    }
  }

  // Prefer CLOSING the active-timer placeholder that clock-in created
  // (start_time set, end_time NULL) rather than inserting a second row.
  // Clock-in inserts a placeholder immediately; the online clock-out path
  // finds and updates it. The offline path used to blind-insert, which
  // orphaned the placeholder forever as a phantom "0h" active timer (it kept
  // showing as clocked-in and polluted the approval queue + cost rollups)
  // while also creating a duplicate completed row. Match the online behavior.
  if (payload.payee_id && payload.start_time) {
    const { data: placeholder } = await supabase
      .from('expenses')
      .select('id')
      .eq('payee_id', payload.payee_id)
      .eq('start_time', payload.start_time)
      .is('end_time', null)
      .maybeSingle();

    if (placeholder) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          end_time: payload.end_time,
          amount: payload.amount,
          lunch_taken: payload.lunch_taken,
          lunch_duration_minutes: payload.lunch_duration_minutes,
          updated_by: payload.updated_by ?? payload.user_id,
          // Stamp local_id so a retry (if markAsSynced didn't land) is caught
          // by the dedup check above instead of inserting a duplicate.
          local_id: payload.local_id ?? null,
          synced_at: new Date().toISOString(),
        })
        .eq('id', placeholder.id);

      if (updateError) throw updateError;

      console.log('💾 Clock out synced (closed placeholder):', placeholder.id);
      return;
    }
  }

  // Fallback: no placeholder found (e.g. the clock-in also happened offline),
  // so insert the completed entry.
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...payload,
      created_offline: true,
      synced_at: new Date().toISOString()
    })
    .select()
    .maybeSingle();

  if (error) throw error;

  console.log('💾 Clock out synced (inserted):', data?.id);
};

const syncEditEntry = async (operation: QueuedOperation) => {
  const { payload } = operation;

  const { error } = await supabase
    .from('expenses')
    .update(payload.updates)
    .eq('id', payload.id);

  if (error) {
    // Check if conflict (row doesn't exist or was modified)
    if (error.code === 'PGRST116') {
      await resolveConflict(operation.id, null);
    } else {
      throw error;
    }
  }
};

const syncDeleteEntry = async (operation: QueuedOperation) => {
  const { payload } = operation;

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', payload.id);

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
};

const syncMediaUpload = async (operation: QueuedOperation) => {
  const { payload } = operation;
  
  try {
    // Convert base64 back to File
    const file = await base64ToFile(
      payload.fileData,
      payload.fileName,
      payload.fileType
    );
    
    // Use existing projectMedia upload utility
    const { data, error } = await uploadProjectMedia({
      file,
      projectId: payload.projectId,
      caption: payload.caption,
      description: payload.description,
      latitude: payload.latitude,
      longitude: payload.longitude,
      locationName: payload.locationName,
      altitude: payload.altitude,
      deviceModel: payload.deviceModel,
      takenAt: payload.takenAt,
      uploadSource: payload.uploadSource,
      duration: payload.duration,
    });
    
    if (error) throw error;
    
    console.log('📸 Media synced:', data?.id);
  } catch (error) {
    console.error('Failed to sync media:', error);
    throw error;
  }
};

const syncBidMediaUpload = async (operation: QueuedOperation) => {
  const { payload } = operation;

  try {
    const file = await base64ToFile(
      payload.fileData,
      payload.fileName,
      payload.fileType
    );

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Compress images
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      const { compressImage } = await import('@/utils/imageCompression');
      fileToUpload = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        targetSizeKB: 500,
      });
    }

    const fileType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'document';
    const bucket = fileType === 'document' ? 'bid-documents' : 'bid-media';

    // Generate storage path
    const { generateStoragePath } = await import('@/utils/mediaMetadata');
    const storagePath = generateStoragePath(user.id, payload.bidId, fileToUpload.name);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileToUpload, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    // Create database record with relative path (NOT public URL)
    const { error: dbError } = await supabase
      .from('bid_media')
      .insert({
        bid_id: payload.bidId,
        file_url: uploadData.path,
        file_name: fileToUpload.name,
        mime_type: fileToUpload.type,
        file_type: fileType,
        file_size: fileToUpload.size,
        caption: payload.caption || null,
        description: payload.description || null,
        duration: payload.duration || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        altitude: payload.altitude || null,
        location_name: payload.locationName || null,
        taken_at: payload.takenAt || null,
        device_model: payload.deviceModel || null,
        upload_source: payload.uploadSource || 'web',
        uploaded_by: user.id,
      });

    if (dbError) {
      // Rollback storage
      await supabase.storage.from(bucket).remove([uploadData.path]);
      throw dbError;
    }

    console.log('📸 Bid media synced');
  } catch (error) {
    console.error('Failed to sync bid media:', error);
    throw error;
  }
};
