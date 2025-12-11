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

  // Insert the expense
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

  console.log('💾 Clock out synced:', data?.id);
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
