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
        "no-horizontal-scroll min-h-screen",
        !fullWidth && "container mx-auto",
        !noPadding && "mobile-safe-padding py-4 sm:py-6",
        className
      )}
    >
      {children}
    </div>
  );
}
