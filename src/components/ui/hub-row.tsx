import type { ElementType } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One peer row on a mobile hub (Rule 37: hub + drill-downs, one navigation
 * layer per screen). Shared by the project hub (MobileScheduleView) and the
 * lead hub (BranchBidDetail) so the two can't drift visually. Count is context
 * on the row, not a nav badge; hidden at 0.
 */
export function HubRow({
  icon: Icon,
  label,
  blurb,
  count,
  withDivider,
  onClick,
}: {
  icon: ElementType;
  label: string;
  blurb: string;
  count?: number;
  withDivider: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left",
        "hover:bg-accent/50 active:bg-accent transition-colors",
        withDivider && "border-t border-border",
      )}
    >
      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium truncate">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{blurb}</div>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-sm font-semibold text-muted-foreground tabular-nums shrink-0">
          {count}
        </span>
      )}
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
