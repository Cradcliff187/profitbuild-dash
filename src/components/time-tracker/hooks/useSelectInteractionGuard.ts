import { useState, useCallback, useRef } from 'react';

export function useSelectInteractionGuard() {
  const [isInteracting, setIsInteracting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startInteraction = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsInteracting(true);
  }, []);

  const endInteraction = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 300);
  }, []);

  return { isInteracting, startInteraction, endInteraction };
}
