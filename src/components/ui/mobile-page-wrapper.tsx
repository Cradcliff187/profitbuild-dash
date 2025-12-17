import { ReactNode, useCallback } from "react";
import { cn } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "./pull-to-refresh-indicator";

interface MobilePageWrapperProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean; // Skip mobile-safe-padding
  fullWidth?: boolean; // Use full width instead of container
  onRefresh?: () => Promise<void>; // Optional refresh callback for pull-to-refresh
  enablePullToRefresh?: boolean; // Enable pull-to-refresh (default false)
}

/**
 * Universal mobile-first page wrapper component.
 * - Enforces mobile-safe container and padding
 * - Prevents horizontal scrolling
 * - Provides consistent page layout across application
 * - Follows construction industry data-dense standards
 * - Optional pull-to-refresh support for mobile PWA
 */
export function MobilePageWrapper({
  children,
  className,
  noPadding = false,
  fullWidth = false,
  onRefresh,
  enablePullToRefresh = false,
}: MobilePageWrapperProps) {
  // Default no-op refresh function
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  const {
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress,
    handlers,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 60,
    maxPull: 120,
  });

  const shouldEnablePullToRefresh = enablePullToRefresh && onRefresh;

  return (
    <div
      className={cn(
        "no-horizontal-scroll min-h-screen w-full max-w-full overflow-x-hidden",
        !fullWidth && "mx-auto px-0 sm:container sm:px-4 md:px-6 lg:px-8 max-w-[100vw]",
        !noPadding && "py-4 sm:py-6",
        className
      )}
      {...(shouldEnablePullToRefresh ? handlers : {})}
      style={shouldEnablePullToRefresh && (isPulling || isRefreshing) ? { overscrollBehavior: 'none' } : undefined}
    >
      {/* Pull-to-refresh indicator */}
      {shouldEnablePullToRefresh && (
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          pullProgress={pullProgress}
          isRefreshing={isRefreshing}
        />
      )}
      {children}
    </div>
  );
}
