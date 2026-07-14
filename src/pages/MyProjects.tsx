/**
 * Field-worker "My Projects" page (`/my-projects`).
 *
 * Slim read-only list of active construction projects (approved /
 * in_progress, sandbox-toggle aware). Tap → the field-safe schedule route
 * `/projects/:id/schedule` (Rule 18). No create/edit affordances — this is a
 * navigation surface, not a management one.
 *
 * Card shape mirrors the field-worker slim variant inside `ProjectsList`
 * (number / name / address one-liner / chevron); that variant isn't cleanly
 * importable (it's inline in the big list component), so the compact card is
 * reproduced here. Two-column at md+ so iPad doesn't render a stretched
 * single column — Tailwind breakpoints only, never `useIsMobile()`.
 *
 * Gate: DB feature flag `field_worker_v2`; loading → null; off →
 * field-worker-only users to `/time-tracker`, everyone else to `/`.
 */

import { Navigate, useNavigate } from "react-router-dom";
import { ChevronRight, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { useRoles } from "@/contexts/RoleContext";
import { useDbFeatureFlag } from "@/hooks/useDbFeatureFlag";
import { useFieldActiveProjects } from "@/components/field/fieldProjects";

export default function MyProjects() {
  const navigate = useNavigate();
  const { enabled: flagEnabled, isLoading: flagLoading } =
    useDbFeatureFlag("field_worker_v2");
  const { isFieldWorkerOnly, loading: rolesLoading } = useRoles();
  const projectsQuery = useFieldActiveProjects();

  if (flagLoading || rolesLoading) return null;
  if (!flagEnabled) {
    return <Navigate to={isFieldWorkerOnly ? "/time-tracker" : "/"} replace />;
  }

  const projects = projectsQuery.data ?? [];

  return (
    // pb-24 keeps the last row clear of the fixed FieldTabBar sibling.
    <MobilePageWrapper className="pb-24">
      <div className="max-w-2xl md:max-w-4xl mx-auto space-y-4 px-4 sm:px-0">
        <header>
          <h1 className="text-2xl font-bold leading-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Active jobs — tap one to open its schedule
          </p>
        </header>

        {projectsQuery.isPending ? (
          <div className="grid gap-2 md:grid-cols-2">
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
              <HardHat className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              No active projects
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Projects will show up here once they're approved and underway.
            </p>
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/projects/${project.id}/schedule`)}
                className="w-full text-left bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-accent/50 active:bg-accent transition-colors min-h-[44px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-muted-foreground">
                    {project.project_number}
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {project.project_name}
                  </div>
                  {project.address && (
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                      {project.address}
                    </p>
                  )}
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
