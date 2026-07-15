/**
 * Field-worker assignment detail (`/my-day/:assignmentId`).
 *
 * The single canonical "what is this job?" screen. It is the destination for
 * BOTH an assignment notification tap (Mentions.tsx) AND the Today cards
 * (AssignmentHeroCard / TomorrowSection) — so tapping an assignment always
 * lands somewhere that shows the assignment, regardless of its date. Before
 * this screen, the notification linked to "/" and the cards jumped straight to
 * the project schedule, which never renders the dispatch note/time.
 *
 * Shows: date · start time · project identity · the FULL dispatcher note
 * (never truncated — may carry gate codes) · address with one-tap directions ·
 * call the owner · and an explicit "Open project schedule" action.
 *
 * House rules (shared with the Today home — the auth-loop danger zone,
 * Gotchas #53/#54/#55/#56/#63): ZERO realtime, user from useAuth() context
 * (never supabase.auth.getUser()), plain useQuery, errors thrown. Read-only +
 * navigation/tel only — this surface writes nothing.
 *
 * Responsive per the iPad-first directive: phones stack; iPad (md:) sets the
 * address + call actions side-by-side. Tailwind breakpoints only, never
 * useIsMobile() (it breaks at 768px and buckets iPads as desktop).
 */

import { Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Phone,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { ProjectAddressLocator } from "@/components/projects/ProjectAddressLocator";
import { useAuth } from "@/contexts/AuthContext";
import { parseDateOnly } from "@/utils/dateUtils";
import {
  useAssignmentById,
  useTodayProjects,
  formatStartTime12h,
} from "@/components/today/todayData";

export default function AssignmentDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const assignmentQuery = useAssignmentById(assignmentId, { enabled: !!user });
  const assignment = assignmentQuery.data ?? null;

  // Reuse the Today projects hook (project identity + owner phone for Call).
  const projectsQuery = useTodayProjects(
    assignment ? [assignment.project_id] : [],
    { enabled: !!assignment }
  );
  const project = projectsQuery.data?.[0];

  // Natural "back": return to wherever they tapped in from (Today, the
  // Notifications list, ...). location.key === 'default' means they landed
  // here cold with no in-app history — fall back to the Today home.
  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  };

  if (!assignmentId) return <Navigate to="/" replace />;

  const friendlyDate = assignment
    ? parseDateOnly(assignment.work_date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;
  const time = assignment ? formatStartTime12h(assignment.start_time) : null;

  return (
    <MobilePageWrapper>
      <div className="mx-auto max-w-2xl">
        {/* Header row — back + title */}
        <div className="flex items-center gap-1 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 -ml-2"
            onClick={goBack}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Assignment</h1>
        </div>

        {assignmentQuery.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : assignmentQuery.isError ? (
          <Card className="p-6 text-center">
            <p className="text-sm font-medium mb-1">Couldn't load this assignment</p>
            <p className="text-xs text-muted-foreground mb-3">
              Check your connection and try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => assignmentQuery.refetch()}
            >
              Try again
            </Button>
          </Card>
        ) : !assignment ? (
          <Card className="p-8 text-center border-dashed">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
              <CalendarDays className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="text-base font-semibold mb-1">Assignment not found</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
              It may have been changed or canceled by the office.
            </p>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => navigate("/")}
            >
              Back to Today
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Identity + schedule + dispatcher note */}
            <Card className="p-4 border-primary/40">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {friendlyDate}
                </span>
                {time && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold shrink-0">
                    <Clock className="h-3 w-3" />
                    {time}
                  </span>
                )}
              </div>

              {project?.project_number ? (
                <div className="text-xs font-mono text-muted-foreground">
                  {project.project_number}
                </div>
              ) : projectsQuery.isPending ? (
                <Skeleton className="h-3 w-16 mb-1" />
              ) : null}
              <div className="text-lg font-semibold">
                {project?.project_name ?? "Project"}
              </div>

              {/* The payload: the dispatcher's instruction — full, wrapped,
                  line breaks preserved (gate codes etc. must never truncate). */}
              {assignment.task_note && (
                <div className="mt-3 rounded-lg border-l-2 border-primary bg-primary/5 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    From the office
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {assignment.task_note}
                  </p>
                </div>
              )}
            </Card>

            {/* Location + contact */}
            {project && (
              <div
                className={
                  project.owner_phone
                    ? "space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 md:items-start"
                    : "space-y-3"
                }
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

            {/* Primary action — into the project's field schedule */}
            <Button
              className="w-full min-h-[48px] justify-between"
              onClick={() =>
                navigate(`/projects/${assignment.project_id}/schedule`)
              }
            >
              <span>Open project schedule</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </MobilePageWrapper>
  );
}
