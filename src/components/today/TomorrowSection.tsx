/**
 * Compact preview of tomorrow's assignments on the Today home page.
 * Quietly says "No assignment yet" when the dispatcher hasn't planned
 * tomorrow — that's a normal state, not an error.
 */

import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FieldAssignment,
  TodayProject,
  firstLine,
  formatStartTime12h,
} from "./todayData";

interface TomorrowSectionProps {
  assignments: FieldAssignment[];
  projectById: Map<string, TodayProject>;
  loading?: boolean;
}

export function TomorrowSection({
  assignments,
  projectById,
  loading,
}: TomorrowSectionProps) {
  const navigate = useNavigate();

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Tomorrow
      </h2>

      {loading ? (
        <Skeleton className="h-12 w-full rounded-lg" />
      ) : assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground/70 px-1">
          No assignment yet.
        </p>
      ) : (
        // Two-up on iPad (md:) — denser without shrinking the 44px targets.
        <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-2">
          {assignments.map((a) => {
            const project = projectById.get(a.project_id);
            const time = formatStartTime12h(a.start_time);
            const note = firstLine(a.task_note);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(`/my-day/${a.id}`)}
                className="w-full text-left bg-card border border-border rounded-lg px-3 py-2.5 flex items-center gap-3 hover:bg-accent/50 active:bg-accent transition-colors min-h-[44px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {project?.project_number && (
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {project.project_number}
                      </span>
                    )}
                    <span className="text-sm font-medium truncate">
                      {project?.project_name ?? "Project"}
                    </span>
                  </div>
                  {note && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {note}
                    </p>
                  )}
                </div>
                {time && (
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">
                    {time}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
