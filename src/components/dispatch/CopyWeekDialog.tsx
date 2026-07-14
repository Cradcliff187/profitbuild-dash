/**
 * "Copy last week" merge-preview dialog.
 *
 * Fetches the prior week's assignments, projects each onto work_date + 7, and
 * marks it "Will copy" or "Already present" (an identical user_id + project_id
 * + target date already exists this week — skipped, never overwritten or
 * silently duplicated). Confirm bulk-inserts only the "will copy" rows with
 * created_by/updated_by set from useAuth(), toasts a summary, and invalidates
 * the crew-day-assignments prefix.
 *
 * Layout follows Gotcha #40: single scroll zone (flex-1 overflow-y-auto),
 * footer pinned outside it.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateOnly, parseDateOnly } from "@/utils/scheduleNotes";
import { addDays, addDaysISO, formatWeekLabel } from "./weekUtils";
import {
  CREW_ASSIGNMENTS_KEY,
  CrewAssignment,
  DispatchProject,
  DispatchWorker,
  formatStartTime,
} from "./dispatchTypes";

interface CopyWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Monday of the CURRENT (target) week. */
  weekStart: Date;
  workers: DispatchWorker[];
  projectsById: Map<string, DispatchProject>;
}

interface CopyPlanRow {
  source: CrewAssignment;
  targetDate: string;
  alreadyPresent: boolean;
}

export function CopyWeekDialog({
  open,
  onOpenChange,
  weekStart,
  workers,
  projectsById,
}: CopyWeekDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCopying, setIsCopying] = useState(false);

  const weekStartISO = formatDateOnly(weekStart);
  const weekEndISO = formatDateOnly(addDays(weekStart, 6));
  const prevWeekStartISO = formatDateOnly(addDays(weekStart, -7));
  const prevWeekEndISO = formatDateOnly(addDays(weekStart, -1));

  const preview = useQuery({
    queryKey: ["crew-week-copy-preview", weekStartISO],
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const [priorRes, currentRes] = await Promise.all([
        supabase
          .from("crew_day_assignments")
          .select("*")
          .gte("work_date", prevWeekStartISO)
          .lte("work_date", prevWeekEndISO),
        supabase
          .from("crew_day_assignments")
          .select("id, user_id, project_id, work_date")
          .gte("work_date", weekStartISO)
          .lte("work_date", weekEndISO),
      ]);
      if (priorRes.error) throw priorRes.error;
      if (currentRes.error) throw currentRes.error;
      return {
        prior: (priorRes.data ?? []) as CrewAssignment[],
        current: currentRes.data ?? [],
      };
    },
  });

  const plan: CopyPlanRow[] = useMemo(() => {
    if (!preview.data) return [];
    const existing = new Set(
      preview.data.current.map((c) => `${c.user_id}|${c.project_id}|${c.work_date}`)
    );
    return preview.data.prior.map((source) => {
      const targetDate = addDaysISO(source.work_date, 7);
      return {
        source,
        targetDate,
        alreadyPresent: existing.has(
          `${source.user_id}|${source.project_id}|${targetDate}`
        ),
      };
    });
  }, [preview.data]);

  const toCopy = plan.filter((row) => !row.alreadyPresent);
  const skippedCount = plan.length - toCopy.length;

  const planByWorker = useMemo(() => {
    const map = new Map<string, CopyPlanRow[]>();
    for (const row of plan) {
      const bucket = map.get(row.source.user_id);
      if (bucket) bucket.push(row);
      else map.set(row.source.user_id, [row]);
    }
    for (const bucket of map.values()) {
      bucket.sort(
        (a, b) =>
          a.targetDate.localeCompare(b.targetDate) ||
          (a.source.start_time ?? "99").localeCompare(b.source.start_time ?? "99")
      );
    }
    // Order sections by roster order, unknown workers last.
    const rosterOrder = new Map(workers.map((w, i) => [w.user_id, i]));
    return Array.from(map.entries()).sort(
      (a, b) =>
        (rosterOrder.get(a[0]) ?? Number.MAX_SAFE_INTEGER) -
        (rosterOrder.get(b[0]) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [plan, workers]);

  const workerName = (userId: string) =>
    workers.find((w) => w.user_id === userId)?.payee_name ?? "Unknown worker";

  const projectLabel = (projectId: string) => {
    const project = projectsById.get(projectId);
    return project
      ? `${project.project_number} - ${project.project_name}`
      : "Unknown project";
  };

  const handleConfirm = async () => {
    if (!user?.id) {
      toast.error("You must be signed in to copy assignments");
      return;
    }
    if (toCopy.length === 0) {
      onOpenChange(false);
      return;
    }
    setIsCopying(true);
    const { error } = await supabase.from("crew_day_assignments").insert(
      toCopy.map((row) => ({
        user_id: row.source.user_id,
        project_id: row.source.project_id,
        work_date: row.targetDate,
        start_time: row.source.start_time,
        task_note: row.source.task_note,
        admin_notes: row.source.admin_notes,
        // Schedule-activity link carries over (at most one is set on the
        // source, per the DB CHECK — copying both columns preserves that).
        estimate_line_item_id: row.source.estimate_line_item_id,
        change_order_line_item_id: row.source.change_order_line_item_id,
        created_by: user.id,
        updated_by: user.id,
      }))
    );
    setIsCopying(false);
    if (error) {
      toast.error("Failed to copy assignments", { description: error.message });
      return;
    }
    toast.success(
      `Copied ${toCopy.length} assignment${toCopy.length === 1 ? "" : "s"}`,
      skippedCount > 0
        ? { description: `${skippedCount} already present — skipped.` }
        : undefined
    );
    queryClient.invalidateQueries({ queryKey: [CREW_ASSIGNMENTS_KEY] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Copy last week</DialogTitle>
          <DialogDescription>
            Copies last week's assignments into {formatWeekLabel(weekStart)}.
            Identical assignments already on the target day are skipped — nothing
            is overwritten or duplicated.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-1">
          {preview.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {preview.isError && (
            <p className="text-sm text-destructive">
              Failed to load last week's assignments. Close and try again.
            </p>
          )}

          {preview.isSuccess && plan.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No assignments found last week — nothing to copy.
            </p>
          )}

          {preview.isSuccess &&
            planByWorker.map(([userId, rows]) => {
              const copyCount = rows.filter((r) => !r.alreadyPresent).length;
              return (
                <div key={userId} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{workerName(userId)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {copyCount} to copy
                      {rows.length - copyCount > 0 &&
                        ` · ${rows.length - copyCount} already present`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {rows.map((row) => (
                      <div
                        key={row.source.id}
                        className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
                      >
                        <span className="w-[72px] shrink-0 text-muted-foreground tabular-nums">
                          {format(parseDateOnly(row.targetDate), "EEE MMM d")}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {projectLabel(row.source.project_id)}
                        </span>
                        {formatStartTime(row.source.start_time) && (
                          <span className="shrink-0 text-muted-foreground tabular-nums">
                            {formatStartTime(row.source.start_time)}
                          </span>
                        )}
                        {row.alreadyPresent ? (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            Already present
                          </Badge>
                        ) : (
                          <Badge className="shrink-0 text-[10px]">Will copy</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCopying || preview.isLoading || toCopy.length === 0}
          >
            {isCopying ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-1.5 h-4 w-4" />
            )}
            Copy {toCopy.length} assignment{toCopy.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
