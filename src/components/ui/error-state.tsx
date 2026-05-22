import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  /** Defaults to "Something went wrong". */
  title?: string;
  /** Short description of the failure. Keep it user-readable; don't surface raw stack traces. */
  description?: string;
  /** Required retry handler. The button always renders. */
  onRetry: () => void;
  /** Optional retry button label. Defaults to "Try again". */
  retryLabel?: string;
  /** Visual size — see EmptyState. */
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Visually mirrors EmptyState but uses a destructive border + AlertCircle icon
 * so a failed fetch is unambiguously distinguishable from a true empty.
 */
export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ title = "Something went wrong", description, onRetry, retryLabel = "Try again", variant = "default", className }, ref) => {
    const isCompact = variant === "compact";
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 text-center",
          isCompact ? "py-6 px-4" : "py-12 px-4",
          className,
        )}
      >
        <AlertCircle
          className={cn(
            "text-destructive",
            isCompact ? "mb-2 h-8 w-8" : "mb-3 h-12 w-12",
          )}
          aria-hidden="true"
        />
        <p className={cn("font-medium text-foreground", isCompact ? "text-xs" : "text-sm")}>
          {title}
        </p>
        {description && (
          <p className={cn("mt-1 max-w-xs text-muted-foreground", isCompact ? "text-[11px]" : "text-xs")}>
            {description}
          </p>
        )}
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          {retryLabel}
        </Button>
      </div>
    );
  },
);
ErrorState.displayName = "ErrorState";
