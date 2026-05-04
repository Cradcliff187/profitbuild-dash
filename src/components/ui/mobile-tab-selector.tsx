import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TabOption {
  value: string;
  label: string;
  icon: LucideIcon;
  /**
   * Optional numeric badge to render after the label (e.g. unread count,
   * pending approvals). Omitted or 0 = no badge.
   */
  count?: number;
}

interface MobileTabSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  options: TabOption[];
  className?: string;
}

/**
 * Mobile horizontal pill-strip tab selector. All options visible inline
 * with active-state and badge counts — no disclosure click needed.
 *
 * Replaces the previous Select-dropdown implementation (R2). Matches the
 * canonical pattern from MobileScheduleView and BranchBidDetail mobile
 * tabs so the app uses one mobile-tab pattern across every list page,
 * detail page, and schedule view.
 *
 * Overflow strategy: horizontal scroll when tabs exceed viewport width,
 * with `scrollbar-hide` so it stays clean on iOS. Min touch target 44px.
 */
export function MobileTabSelector({
  value,
  onValueChange,
  options,
  className,
}: MobileTabSelectorProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 bg-muted/40 rounded-xl p-1 overflow-x-auto scrollbar-hide",
        className
      )}
    >
      {options.map((tab) => {
        const Icon = tab.icon;
        const isActive = value === tab.value;
        const showBadge = typeof tab.count === "number" && tab.count > 0;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onValueChange(tab.value)}
            className={cn(
              // flex-1 lets short-label cases (e.g. Tasks/Notes/Media/Docs)
              // expand to fill the strip evenly; min-w-fit prevents long
              // labels from being squeezed to the point of truncation. When
              // total natural width exceeds viewport, the parent's
              // `overflow-x-auto` enables horizontal scroll instead.
              "flex-1 min-w-fit flex items-center justify-center gap-1.5",
              "py-2.5 px-3 rounded-lg transition-all min-h-[44px]",
              "whitespace-nowrap",
              isActive
                ? "bg-background shadow-sm text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-xs">{tab.label}</span>
            {showBadge && (
              <Badge
                variant={isActive ? "default" : "secondary"}
                className="h-4 min-w-[16px] px-1 text-[9px] font-medium shrink-0"
              >
                {tab.count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
