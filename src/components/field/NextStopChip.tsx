/**
 * Persistent "Next stop" chip for the field-worker shell.
 *
 * Self-contained styling (sticky top bar); the orchestrator decides where it
 * mounts. Consumes the shared `useMyDayAssignments` hook — no realtime, no
 * auth round-trips, plain TanStack Query underneath (auth-loop danger zone
 * rules, Gotchas #53–56/#63).
 *
 * Tap the chip → bottom Sheet listing ALL of today's stops in dispatch order;
 * tapping a stop navigates to the field-safe schedule route
 * (`/projects/:id/schedule`, Rule 18). Renders in all states:
 * - loading → skeleton shimmer line
 * - no stops today → faded pin + "No assignment today" (non-interactive)
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMyDayAssignments } from "@/hooks/useMyDayAssignments";
import { firstLine, formatStartTime12h } from "@/components/today/todayData";

export function NextStopChip({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { today, currentStop, isLoading } = useMyDayAssignments();
  const [sheetOpen, setSheetOpen] = useState(false);

  const barShell = cn(
    "sticky top-0 z-30 w-full",
    "bg-background/95 backdrop-blur-sm border-b",
    // Mount-site override slot. NOTE: sticky offsets resolve against the
    // scroll container's padding-inset content edge — if the mount's scroll
    // container already pads for a fixed header (AppLayout main pt-[67px]),
    // top-0 is correct and an extra top offset double-counts (§5.4 bug).
    className
  );
  // Inner row is width-capped so the chip reads comfortably on iPad
  // (768–1024px) — Tailwind breakpoints only, never useIsMobile() for layout.
  const barRow = "mx-auto w-full max-w-2xl px-3 py-2";

  if (isLoading) {
    return (
      <div className={barShell}>
        <div className={barRow}>
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!currentStop) {
    return (
      <div className={barShell}>
        <div className={cn(barRow, "flex items-center gap-2 min-h-[44px]")}>
          <MapPin className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <span className="text-sm text-muted-foreground/60">
            No assignment today
          </span>
        </div>
      </div>
    );
  }

  const time = formatStartTime12h(currentStop.start_time);
  const projectLabel = currentStop.project
    ? `${currentStop.project.project_number} ${currentStop.project.project_name}`
    : "Project";

  return (
    <>
      <div className={barShell}>
        <div className={barRow}>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              "w-full flex items-center gap-2 min-h-[44px] px-2 -mx-2 rounded-lg",
              "text-left hover:bg-accent/50 active:bg-accent transition-colors"
            )}
            aria-label="Show today's stops"
          >
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 min-w-0 text-sm truncate">
              <span className="text-muted-foreground">Next stop: </span>
              <span className="font-semibold">{projectLabel}</span>
            </span>
            {time && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold shrink-0">
                <Clock className="h-3 w-3" />
                {time}
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      </div>

      {/* Today's stops, in dispatch order */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] overflow-y-auto rounded-t-2xl sm:max-w-lg sm:mx-auto sm:inset-x-0 pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Today's stops</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-2">
            {today.map((stop, i) => {
              const stopTime = formatStartTime12h(stop.start_time);
              const notePreview = firstLine(stop.task_note);
              const isCurrent = stop.id === currentStop.id;
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => {
                    setSheetOpen(false);
                    navigate(`/projects/${stop.project_id}/schedule`);
                  }}
                  className={cn(
                    "w-full text-left rounded-lg border bg-card px-3 py-2.5",
                    "flex items-start gap-3 min-h-[44px]",
                    "hover:bg-accent/50 active:bg-accent transition-colors",
                    isCurrent ? "border-primary/40 shadow-sm" : "border-border"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-mono text-muted-foreground">
                      {stop.project?.project_number ?? ""}
                    </span>
                    <span className="block text-sm font-semibold truncate">
                      {stop.project?.project_name ?? "Project"}
                    </span>
                    {notePreview && (
                      <span className="block text-xs text-muted-foreground truncate mt-0.5">
                        {notePreview}
                      </span>
                    )}
                  </span>
                  {stopTime && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold shrink-0 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {stopTime}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
