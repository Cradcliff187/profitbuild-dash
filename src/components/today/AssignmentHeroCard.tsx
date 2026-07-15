/**
 * Prominent "Next stop" / "Then" card for today's crew assignments.
 *
 * Structure: the top region (label, time chip, project identity, dispatcher
 * note) is ONE navigation button that taps through to the assignment detail
 * screen (`/my-day/:assignmentId`) — the same destination an assignment
 * notification opens, so tapping an assignment is consistent everywhere. The
 * contact/location region
 * below it hosts interactive children — `ProjectAddressLocator` (canonical
 * address affordance) and the optional Call button — as SIBLINGS of the nav
 * button, never nested inside it (no nested-interactive bubbling traps).
 *
 * Responsive: mobile-first stacked; on iPad (md:) the address block and Call
 * button sit side-by-side. Layout via Tailwind breakpoints, not useIsMobile()
 * (the hook breaks at 768px and would treat iPads as desktop).
 *
 * Read-only + navigation/tel only — no writes from this surface.
 */

import { useNavigate } from "react-router-dom";
import { ChevronRight, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectAddressLocator } from "@/components/projects/ProjectAddressLocator";
import {
  FieldAssignment,
  TodayProject,
  formatStartTime12h,
} from "./todayData";

interface AssignmentHeroCardProps {
  assignment: FieldAssignment;
  /** May be undefined for a beat while the projects query resolves. */
  project?: TodayProject;
  variant: "next" | "then";
}

export function AssignmentHeroCard({
  assignment,
  project,
  variant,
}: AssignmentHeroCardProps) {
  const navigate = useNavigate();
  const time = formatStartTime12h(assignment.start_time);
  const isNext = variant === "next";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        isNext ? "border-primary/40 shadow-sm" : "border-border"
      )}
    >
      {/* Navigation region — identity + dispatcher instruction */}
      <button
        type="button"
        onClick={() => navigate(`/my-day/${assignment.id}`)}
        className="w-full text-left p-4 pb-3 hover:bg-accent/50 active:bg-accent transition-colors min-h-[44px]"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              isNext ? "text-primary" : "text-muted-foreground"
            )}
          >
            {isNext ? "Next stop" : "Then"}
          </span>
          {time && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold shrink-0">
              <Clock className="h-3 w-3" />
              {time}
            </span>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {project?.project_number && (
              <div className="text-xs font-mono text-muted-foreground">
                {project.project_number}
              </div>
            )}
            <div
              className={cn(
                "font-semibold truncate",
                isNext ? "text-lg" : "text-base"
              )}
            >
              {project?.project_name ?? "Project"}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
        </div>

        {/* Dispatcher instruction — the payload of this card. May carry gate
            codes etc., so never truncate; preserve line breaks. */}
        {assignment.task_note && (
          <div className="mt-3 rounded-lg border-l-2 border-primary bg-primary/5 px-3 py-2">
            <p className="text-sm whitespace-pre-wrap break-words">
              {assignment.task_note}
            </p>
          </div>
        )}
      </button>

      {/* Contact & location — interactive children, siblings of the nav
          button. Gated on the project row so the locator's "No address on
          file" state doesn't flash while the projects query resolves. */}
      {project && (
        <div
          className={cn(
            "px-4 pb-4 pt-1 space-y-3",
            "md:grid md:gap-3 md:space-y-0 md:items-start",
            project.owner_phone ? "md:grid-cols-2" : "md:grid-cols-1"
          )}
        >
          <ProjectAddressLocator address={project.address} variant="card" />
          {project.owner_phone && (
            <Button
              asChild
              variant="outline"
              className="w-full min-h-[44px] justify-center"
            >
              <a
                href={`tel:${project.owner_phone.tel}`}
                aria-label={`Call ${project.owner_name ?? "project owner"}`}
              >
                <Phone className="h-4 w-4 mr-2" />
                <span className="truncate">
                  Call {project.owner_name ?? "project owner"}
                </span>
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
