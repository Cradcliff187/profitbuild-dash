/**
 * "Your last site" hero fallback for the Today home page.
 *
 * Shown when dispatch has NO assignment for today but the worker has time
 * entries — the hero slot must always answer "where am I going?", so it falls
 * back to the most recently worked active project (see useLastWorkedProject).
 * Same anatomy as AssignmentHeroCard: the identity region is ONE navigation
 * button to the field-safe schedule route (Rule 18); the address locator is a
 * SIBLING below it (never nested interactive); an "All projects" ghost link
 * covers the multi-site case.
 *
 * Read-only + navigation only — no writes from this surface.
 */

import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectAddressLocator } from "@/components/projects/ProjectAddressLocator";
import { parseDateOnly } from "@/utils/dateUtils";
import { LastWorkedProject } from "./todayData";

interface LastProjectCardProps {
  project: LastWorkedProject;
}

export function LastProjectCard({ project }: LastProjectCardProps) {
  const navigate = useNavigate();

  const lastWorkedLabel = parseDateOnly(
    project.lastWorkedDate
  ).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-2">
      {/* Dispatch truth stays visible — the fallback never pretends to be an
          assignment. */}
      <p className="text-sm text-muted-foreground px-1">
        No assignment for today — pick up where you left off:
      </p>

      <div className="rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => navigate(`/projects/${project.id}/schedule`)}
          className="w-full text-left p-4 pb-3 hover:bg-accent/50 active:bg-accent transition-colors min-h-[44px]"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Your last site
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-xs font-semibold shrink-0">
              <CalendarDays className="h-3 w-3" />
              {lastWorkedLabel}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-muted-foreground">
                {project.project_number}
              </div>
              <div className="font-semibold truncate text-lg">
                {project.project_name}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </button>

        <div className="px-4 pb-4 pt-1">
          <ProjectAddressLocator address={project.address} variant="card" />
        </div>
      </div>

      <Button
        variant="ghost"
        className="w-full min-h-[44px] text-sm font-medium text-muted-foreground"
        onClick={() => navigate("/my-projects")}
      >
        <HardHat className="h-4 w-4 mr-2" />
        All projects
      </Button>
    </div>
  );
}
