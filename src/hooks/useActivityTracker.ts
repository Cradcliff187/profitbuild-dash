import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MIN_UPDATE_INTERVAL = 30 * 1000; // Don't update more than once per 30 seconds

export function useActivityTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const lastUpdateRef = useRef(0);
  const lastSuccessfulUpdateRef = useRef(0);
  const isOnlineRef = useRef(navigator.onLine);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateActivity = useCallback(async () => {
    if (!user) return;

    // Check online status
    if (!navigator.onLine) {
      isOnlineRef.current = false;
      return;
    }
    isOnlineRef.current = true;

    const now = Date.now();
    
    // Debounce: Don't update if we just updated
    if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
      return;
    }

    lastUpdateRef.current = now;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        console.warn('Failed to update last_active_at:', error);
        // Don't throw - this is non-critical
      } else {
        lastSuccessfulUpdateRef.current = now;
      }
    } catch (error) {
      console.warn('Error updating activity:', error);
      // Silently fail - activity tracking shouldn't break the app
    }
  }, [user]);

  // Update on route change (immediate)
  useEffect(() => {
    if (user && navigator.onLine) {
      // Clear any pending timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Update after a short delay to batch rapid navigation
      updateTimeoutRef.current = setTimeout(() => {
        updateActivity();
      }, 500);
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [location.pathname, user, updateActivity]);

  // Heartbeat while app is active
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Only update if online and app is visible
      if (navigator.onLine && document.visibilityState === 'visible') {
        updateActivity();
      }
    }, HEARTBEAT_INTERVAL);

    // Update when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        // Update immediately when tab becomes visible
        updateActivity();
      }
    };

    // Handle online/offline events
    const handleOnline = () => {
      isOnlineRef.current = true;
      // Update immediately when coming back online
      updateActivity();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [user, updateActivity]);
}
