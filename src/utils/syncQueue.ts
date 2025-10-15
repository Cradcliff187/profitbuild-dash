import localforage from 'localforage';

export interface QueuedOperation {
  id: string;
  type: 'clock_in' | 'clock_out' | 'edit_entry' | 'delete_entry';
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
