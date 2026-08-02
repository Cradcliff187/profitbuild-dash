/**
 * Field-worker Notes page (`/notes`) — thread-per-project shell.
 *
 * Two-level UI: pick a project (same active-projects list as `/my-projects`,
 * via the shared `useFieldActiveProjects` hook) → the project's notes thread
 * rendered by the existing `ProjectNotesTimeline`.
 *
 * `ProjectNotesTimeline` prop choice: `inSheet` is the ONE combo that renders
 * composer + list on a phone — the component's default mobile branch
 * (isMobile && !inSheet) is display-only regardless of `hideComposer`, and
 * the desktop branch is gated on !isMobile. `inSheet` = NoteComposer pinned
 * on top + the notes feed below, exactly one composer (this route lives
 * outside ProjectDetailView, so no FieldQuickActionBar double-composer risk).
 *
 * Gate: DB feature flag `field_worker_v2`; loading → null; off →
 * field-worker-only users to `/time-tracker`, everyone else to `/`.
 * Auth-loop rules per Gotchas #53–56/#63 (no realtime, no getUser()).
 * Layout via Tailwind breakpoints (390px phones AND 768/1024 iPads) — never
 * `useIsMobile()` for layout decisions.
 */

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { useRoles } from "@/contexts/RoleContext";
import { useDbFeatureFlag } from "@/hooks/useDbFeatureFlag";
import { ProjectNotesTimeline } from "@/components/ProjectNotesTimeline";
import {
  FieldActiveProject,
  useFieldActiveProjects,
} from "@/components/field/fieldProjects";

export default function FieldNotes() {
  const { enabled: flagEnabled, isLoading: flagLoading } =
    useDbFeatureFlag("field_worker_v2");
  const { isFieldWorkerOnly, loading: rolesLoading } = useRoles();
  const [selectedProject, setSelectedProject] =
    useState<FieldActiveProject | null>(null);
  const projectsQuery = useFieldActiveProjects();

  if (flagLoading || rolesLoading) return null;
  if (!flagEnabled) {
    return <Navigate to={isFieldWorkerOnly ? "/time-tracker" : "/"} replace />;
  }

  // --- Selected project: back header + notes thread (composer + feed) ---
  if (selectedProject) {
    return (
      <MobilePageWrapper className="pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-0">
          <header className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 -ml-2"
              onClick={() => setSelectedProject(null)}
              aria-label="Back to project list"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="text-xs font-mono text-muted-foreground">
                {selectedProject.project_number}
              </div>
              <h1 className="text-base font-semibold truncate leading-tight">
                {selectedProject.project_name}
              </h1>
            </div>
          </header>

          {/* inSheet ⇒ composer on top + feed below (see file header). The
              feed's ScrollArea sizes to content here, so the page scrolls
              naturally — same as the schedule Notes tab. */}
          <ProjectNotesTimeline projectId={selectedProject.id} inSheet />
        </div>
      </MobilePageWrapper>
    );
  }

  // --- Unselected: project picker ---
  const projects = projectsQuery.data ?? [];

  return (
    <MobilePageWrapper className="pb-24">
      <div className="max-w-2xl md:max-w-4xl mx-auto space-y-4 px-4 sm:px-0">
        <header>
          <h1 className="text-2xl font-bold leading-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">
            Pick a project to read or add notes
          </p>
        </header>

        {projectsQuery.isPending ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : projectsQuery.isError ? (
          <Card className="p-6 text-center">
            <p className="text-sm font-medium mb-1">Couldn't load projects</p>
            <p className="text-xs text-muted-foreground mb-3">
              Check your connection and try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => projectsQuery.refetch()}
            >
              Try again
            </Button>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
              <StickyNote className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              No active projects
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Once a project is underway, its notes thread will live here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProject(project)}
                className="w-full text-left bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-accent/50 active:bg-accent transition-colors min-h-[44px]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <StickyNote className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-muted-foreground">
                    {project.project_number}
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {project.project_name}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </MobilePageWrapper>
  );
}
