import localforage from 'localforage';

export interface QueuedOperation {
  id: string;
  type: 'clock_in' | 'clock_out' | 'edit_entry' | 'delete_entry' | 'media_upload';
  timestamp: number;
  payload: any;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
}

const QUEUE_KEY = 'time_tracker_sync_queue';

// Initialize localforage instance
const queueStore = localforage.createInstance({
  name: 'TimeTrackerDB',
  storeName: 'syncQueue'
});

export const addToQueue = async (operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'status'>): Promise<void> => {
  try {
    const queue = await getQueue();
    const newOperation: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      retryCount: 0,
      status: 'pending'
    };
    
    queue.push(newOperation);
    await queueStore.setItem(QUEUE_KEY, queue);
    console.log('📥 Added to sync queue:', operation.type);
  } catch (error) {
    console.error('Failed to add to queue:', error);
    throw error;
  }
};

export const getQueue = async (): Promise<QueuedOperation[]> => {
  try {
    const queue = await queueStore.getItem<QueuedOperation[]>(QUEUE_KEY);
    return queue || [];
  } catch (error) {
    console.error('Failed to get queue:', error);
    return [];
  }
};

export const markAsSynced = async (operationId: string): Promise<void> => {
  try {
    const queue = await getQueue();
    const updatedQueue = queue.filter(op => op.id !== operationId);
    await queueStore.setItem(QUEUE_KEY, updatedQueue);
    console.log('✅ Marked as synced:', operationId);
  } catch (error) {
    console.error('Failed to mark as synced:', error);
  }
};

export const markAsFailed = async (operationId: string): Promise<void> => {
  try {
    const queue = await getQueue();
    const updatedQueue = queue.map(op => {
      if (op.id === operationId) {
        return {
          ...op,
          status: 'failed' as const,
          retryCount: op.retryCount + 1
        };
      }
      return op;
    });
    await queueStore.setItem(QUEUE_KEY, updatedQueue);
    console.log('❌ Marked as failed:', operationId);
  } catch (error) {
    console.error('Failed to mark as failed:', error);
  }
};

export const updateOperationStatus = async (operationId: string, status: QueuedOperation['status']): Promise<void> => {
  try {
    const queue = await getQueue();
    const updatedQueue = queue.map(op => {
      if (op.id === operationId) {
        return { ...op, status };
      }
      return op;
    });
    await queueStore.setItem(QUEUE_KEY, updatedQueue);
  } catch (error) {
    console.error('Failed to update operation status:', error);
  }
};

export const clearQueue = async (): Promise<void> => {
  try {
    await queueStore.removeItem(QUEUE_KEY);
    console.log('🧹 Queue cleared');
  } catch (error) {
    console.error('Failed to clear queue:', error);
  }
};

export const getPendingCount = async (): Promise<number> => {
  const queue = await getQueue();
  return queue.filter(op => op.status === 'pending').length;
};

export const processQueue = async (): Promise<void> => {
  // This function is implemented in backgroundSync.ts to avoid circular dependency
  // Import and call from backgroundSync instead
  console.warn('processQueue called from syncQueue - should be called from backgroundSync');
};

// Helper functions for file conversion
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

export const base64ToFile = async (
  base64: string,
  fileName: string,
  mimeType: string
): Promise<File> => {
  const response = await fetch(base64);
  const blob = await response.blob();
  return new File([blob], fileName, { type: mimeType });
};

export const addMediaToQueue = async (
  file: File,
  metadata: {
    projectId: string;
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
): Promise<string> => {
  // Convert File to base64 for storage in IndexedDB
  const base64 = await fileToBase64(file);
  
  const operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'status'> = {
    type: 'media_upload',
    timestamp: Date.now(),
    payload: {
      fileData: base64,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      ...metadata
    }
  };
  
  await addToQueue(operation);
  const queue = await getQueue();
  const queuedOp = queue.find(op => op.timestamp === operation.timestamp && op.type === 'media_upload');
  return queuedOp?.id || crypto.randomUUID();
};
