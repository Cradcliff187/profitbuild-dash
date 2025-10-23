import { useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
}

/**
 * Hook for handling touch swipe gestures on mobile
 * Used for navigating between media items in lightboxes
 */
export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 50
  } = options;

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    const absDistance = Math.abs(distance);

    if (absDistance < minSwipeDistance) return;

    if (distance > 0) {
      // Swiped left
      onSwipeLeft?.();
    } else {
      // Swiped right
      onSwipeRight?.();
    }
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}
