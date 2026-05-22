import * as React from "react";
import { LucideIcon, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: React.ComponentProps<typeof Button>["variant"];
}

export interface EmptyStateProps {
  /** Icon component from lucide-react. Defaults to FileQuestion. */
  icon?: LucideIcon;
  /** Required short title. ~3-6 words. */
  title: string;
  /** Optional supporting copy. Kept narrow (max-w-xs) — keep it short. */
  description?: string;
  /** Primary CTA. */
  action?: EmptyStateAction;
  /** Optional secondary CTA below the primary. */
  secondaryAction?: EmptyStateAction;
  /** Visual size. `default` = py-12 + h-12 icon. `compact` = py-6 + h-8 icon (for nested-in-table use). */
  variant?: "default" | "compact";
  /** Optional extra classes (e.g., width overrides). */
  className?: string;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon = FileQuestion, title, description, action, secondaryAction, variant = "default", className }, ref) => {
    const isCompact = variant === "compact";
    return (
      <div
        ref={ref}
        role="status"
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 text-center",
          isCompact ? "py-6 px-4" : "py-12 px-4",
          className,
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
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
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant ?? "default"}
            size="sm"
            className="mt-4"
          >
            {action.icon && <action.icon className="w-4 h-4 mr-2" aria-hidden="true" />}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant={secondaryAction.variant ?? "ghost"}
            size="sm"
            className="mt-2"
          >
            {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 mr-2" aria-hidden="true" />}
            {secondaryAction.label}
          </Button>
        )}
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";
