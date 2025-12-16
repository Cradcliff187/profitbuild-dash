import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobilePageWrapperProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean; // Skip mobile-safe-padding
  fullWidth?: boolean; // Use full width instead of container
}

/**
 * Universal mobile-first page wrapper component.
 * - Enforces mobile-safe container and padding
 * - Prevents horizontal scrolling
 * - Provides consistent page layout across application
 * - Follows construction industry data-dense standards
 */
export function MobilePageWrapper({
  children,
  className,
  noPadding = false,
  fullWidth = false,
}: MobilePageWrapperProps) {
  return (
    <div
      className={cn(
        "no-horizontal-scroll min-h-screen w-full max-w-full overflow-x-hidden",
        !fullWidth && "container mx-auto px-0 sm:px-4 md:px-6 lg:px-8 max-w-[100vw]",
        !noPadding && "py-4 sm:py-6",
        className
      )}
    >
      {children}
    </div>
  );
}
