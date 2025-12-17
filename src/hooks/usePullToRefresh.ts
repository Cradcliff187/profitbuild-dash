import { useState, useCallback, useRef, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Minimum pull distance to trigger refresh (default 60px)
  maxPull?: number; // Maximum visual pull distance (default 120px)
}

interface UsePullToRefreshReturn {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number; // 0-1 for visual indicator
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * Pull-to-refresh hook for mobile PWA.
 * 
 * Safety measures:
 * - Only activates when scrolled to top (scrollTop === 0)
 * - Disabled when modal/sheet/drawer is open
 * - Requires minimum vertical pull distance (threshold)
 * - Ignores pulls with significant horizontal movement
 * - Debounced to prevent rapid multiple refreshes
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  maxPull = 120,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const lastRefreshTime = useRef(0);

  // Find the scroll container (first scrollable parent)
  const getScrollContainer = useCallback((): HTMLElement | null => {
    if (scrollContainerRef.current) return scrollContainerRef.current;
    
    // Try to find the main scrollable container
    const container = document.querySelector('.no-horizontal-scroll') as HTMLElement;
    if (container) {
      scrollContainerRef.current = container;
      return container;
    }
    
    return document.documentElement;
  }, []);

  // Check if a modal/sheet/drawer is open
  const isModalOpen = useCallback((): boolean => {
    // Check for common modal indicators
    const modalSelectors = [
      '[role="dialog"]',
      '[data-state="open"]',
      '.fixed[data-vaul-drawer]',
      '[data-radix-dialog-overlay]',
      '[data-radix-alert-dialog-overlay]',
    ];

    return modalSelectors.some(selector => document.querySelector(selector) !== null);
  }, []);

  // Check if we're at the top of the scroll container
  const isAtTop = useCallback((): boolean => {
    const container = getScrollContainer();
    if (!container) return false;
    
    return container.scrollTop <= 0 || window.scrollY <= 0;
  }, [getScrollContainer]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't start if refreshing, modal is open, or not at top
    if (isRefreshing || isModalOpen() || !isAtTop()) return;

    // Debounce: prevent rapid refreshes (1 second cooldown)
    if (Date.now() - lastRefreshTime.current < 1000) return;

    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    setIsPulling(true);
  }, [isRefreshing, isModalOpen, isAtTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    // Re-check conditions during pull
    if (isModalOpen() || !isAtTop()) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - touchStartY.current;
    const deltaX = Math.abs(currentX - touchStartX.current);

    // If horizontal movement is significant, cancel pull (user might be swiping)
    if (deltaX > 30 && deltaX > Math.abs(deltaY)) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    // Only respond to downward pulls
    if (deltaY > 0) {
      // Apply resistance for natural feel (diminishing returns after threshold)
      const resistance = deltaY > threshold ? 0.5 : 1;
      const distance = Math.min(deltaY * resistance, maxPull);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing, isModalOpen, isAtTop, threshold, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    const shouldRefresh = pullDistance >= threshold && !isRefreshing;
    
    setIsPulling(false);

    if (shouldRefresh) {
      setIsRefreshing(true);
      lastRefreshTime.current = Date.now();
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  // Clean up pull state if component becomes blocked
  useEffect(() => {
    if (isPulling && isModalOpen()) {
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [isPulling, isModalOpen]);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
