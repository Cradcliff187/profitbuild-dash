import { markAsSynced } from './syncQueue';

/**
 * Conflict resolution strategy: "Server Wins"
 * 
 * In MVP version, server data always takes precedence.
 * Offline changes are discarded if conflicts occur.
 */
export const resolveConflict = async (localId: string, serverData: any): Promise<void> => {
  console.warn(`⚠️ Conflict detected for operation ${localId}`);
  console.warn('📋 Strategy: Server data retained, local changes discarded');

  // Remove from queue - server wins
  await markAsSynced(localId);

  // In future versions, could show UI notification:
  // toast.warning('Your offline changes were overwritten by server updates');
};
