import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getPendingCount } from '@/utils/syncQueue';
import { processQueue } from '@/utils/backgroundSync';

export const SyncStatusBanner = () => {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const checkQueue = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    checkQueue();
    const interval = setInterval(checkQueue, 2000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const handleRetry = async () => {
    setSyncing(true);
    try {
      await processQueue();
      const count = await getPendingCount();
      setPendingCount(count);
    } finally {
      setSyncing(false);
    }
  };

  // Don't show banner when online and fully synced
  if (isOnline && pendingCount === 0 && !syncing) {
    return null;
  }

  return (
    <div
      className={`px-3 py-2 text-xs font-medium flex items-center justify-between ${
        !isOnline
          ? 'bg-yellow-500 text-yellow-950'
          : syncing
          ? 'bg-blue-500 text-blue-950'
          : pendingCount > 0
          ? 'bg-orange-500 text-orange-950'
          : 'bg-green-500 text-green-950'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Offline Mode - {pendingCount} entries pending</span>
          </>
        ) : syncing ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Syncing {pendingCount} entries...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <AlertCircle className="w-3 h-3" />
            <span>{pendingCount} entries waiting to sync</span>
          </>
        ) : (
          <>
            <Wifi className="w-3 h-3" />
            <span>All synced</span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && !syncing && (
        <button
          onClick={handleRetry}
          className="text-xs underline hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  );
};
