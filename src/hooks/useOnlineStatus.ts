import { useState, useEffect } from 'react';

interface OnlineStatus {
  isOnline: boolean;
  lastOnlineTime: Date | null;
}

export const useOnlineStatus = (): OnlineStatus => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      console.log('🟢 Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔴 Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastOnlineTime };
};
