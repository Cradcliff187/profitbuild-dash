import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  pullProgress: number;
  isRefreshing: boolean;
  threshold?: number;
}

/**
 * Visual indicator for pull-to-refresh.
 * Shows pull progress and spinning loader when refreshing.
 */
export function PullToRefreshIndicator({
  pullDistance,
  pullProgress,
  isRefreshing,
  threshold = 60,
}: PullToRefreshIndicatorProps) {
  // Only show if there's pull distance or refreshing
  if (pullDistance === 0 && !isRefreshing) return null;

  const rotation = isRefreshing ? 0 : pullProgress * 360;
  const scale = Math.min(0.5 + pullProgress * 0.5, 1);
  const opacity = Math.min(pullProgress * 1.5, 1);

  return (
    <div
      className={cn(
        "flex items-center justify-center transition-all duration-150 ease-out overflow-hidden",
        isRefreshing && "pb-2"
      )}
      style={{
        height: isRefreshing ? 48 : Math.min(pullDistance, threshold + 20),
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-background border border-border shadow-sm",
          "w-9 h-9 transition-transform duration-150"
        )}
        style={{
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <RefreshCw
          className={cn(
            "w-4 h-4 text-primary transition-transform",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
          }}
        />
      </div>
    </div>
  );
}
