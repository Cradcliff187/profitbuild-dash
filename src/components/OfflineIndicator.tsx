import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showOfflineAlert) return null;

  return (
    <Alert 
      className={`fixed top-16 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 shadow-lg ${
        isOnline ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Back online! Your changes will sync automatically.
          </AlertDescription>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            No internet connection. You can continue working - changes will sync when back online.
          </AlertDescription>
        </>
      )}
    </Alert>
  );
};
