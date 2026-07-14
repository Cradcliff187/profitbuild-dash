/**
 * Field-worker "Today" home page (`/today`).
 *
 * The future post-login landing for field workers — i.e. the auth-loop danger
 * zone (Gotchas #53/#54/#55/#56/#63). Hard rules honored here:
 * - ZERO realtime subscriptions; plain `useQuery` only (see todayData.ts).
 * - User comes from `useAuth()` context — never `supabase.auth.getUser()`.
 * - Reads + navigation, plus two IN-PLACE capture dialogs reused from the
 *   time tracker (AddReceiptModal / CreateTimeEntryDialog) owned by
 *   QuickActionsRow. The page itself writes nothing.
 * - Route-agnostic: no assumptions about mounting at `/today` vs `/` —
 *   everything is derived from auth/roles/flag, never from the location.
 *
 * Gate: DB feature flag `field_worker_v2`. While it (or roles) resolves →
 * render nothing (no flash). Flag off → field-worker-only users go to
 * `/time-tracker`, everyone else to `/`. Any authenticated role with the flag
 * ON may view (admins dogfood it).
 *
 * Responsive (per the iPad-first directive): phones stack; iPad portrait
 * (md:) widens + densifies rows; iPad landscape / desktop (lg:) goes
 * two-column — Next Stop + Tomorrow in the main column, This Week + Quick
 * actions in the side rail. Tailwind breakpoints only — never useIsMobile()
 * for layout (it breaks at 768px and buckets iPads as desktop).
 */

import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/contexts/RoleContext";
import { useDbFeatureFlag } from "@/hooks/useDbFeatureFlag";
import { formatDateForDB, parseDateOnly } from "@/utils/dateUtils";
import { AssignmentHeroCard } from "@/components/today/AssignmentHeroCard";
import { TomorrowSection } from "@/components/today/TomorrowSection";
import { ThisWeekStrip } from "@/components/today/ThisWeekStrip";
import { QuickActionsRow } from "@/components/today/QuickActionsRow";
import {
  TodayProject,
  useMyDayAssignments,
  useTodayProjects,
} from "@/components/today/todayData";

export default function TodayHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enabled: flagEnabled, isLoading: flagLoading } =
    useDbFeatureFlag("field_worker_v2");
  const { isFieldWorkerOnly, loading: rolesLoading } = useRoles();

  // Date-only strings computed from local time via the house helper (never
  // `new Date('YYYY-MM-DD')` — Gotcha class in dateUtils.ts). `work_date` is
  // a Postgres date; it compares as a YYYY-MM-DD string. Recomputed each
  // render, so a focus refetch after midnight rolls the query key forward.
  const now = new Date();
  const todayISO = formatDateForDB(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowISO = formatDateForDB(tomorrowDate);

  const gateSettled = !flagLoading && !rolesLoading;

  // All hooks run unconditionally (rules of hooks); the data queries are
  // gated via `enabled` so nothing fetches until the flag says yes.
  const assignmentsQuery = useMyDayAssignments(user?.id, todayISO, tomorrowISO, {
    enabled: gateSettled && flagEnabled,
  });
  const assignments = useMemo(
    () => assignmentsQuery.data ?? [],
    [assignmentsQuery.data]
  );
  const todayAssignments = assignments.filter((a) => a.work_date === todayISO);
  const tomorrowAssignments = assignments.filter(
    (a) => a.work_date === tomorrowISO
  );

  const projectIds = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.project_id))),
    [assignments]
  );
  const projectsQuery = useTodayProjects(projectIds, {
    enabled: gateSettled && flagEnabled,
  });
  const projectById = useMemo(() => {
    const map = new Map<string, TodayProject>();
    for (const p of projectsQuery.data ?? []) map.set(p.id, p);
    return map;
  }, [projectsQuery.data]);

  // --- Gates (after all hooks) ---
  if (!gateSettled) return null;
  if (!flagEnabled) {
    return <Navigate to={isFieldWorkerOnly ? "/time-tracker" : "/"} replace />;
  }

  const friendlyDate = parseDateOnly(todayISO).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // `isPending` = no data yet (TanStack v5). The query is enabled by the time
  // we get here (gate passed + authenticated route ⇒ user exists).
  const assignmentsLoading = assignmentsQuery.isPending;

  return (
    <MobilePageWrapper>
      <div className="mx-auto max-w-2xl md:max-w-3xl lg:max-w-5xl">
        {/* Header — calm, glanceable */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold leading-tight">Today</h1>
          <p className="text-sm text-muted-foreground">{friendlyDate}</p>
        </header>

        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
          {/* Main column: Next Stop hero + Tomorrow */}
          <div className="space-y-6 lg:col-span-2">
            {assignmentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : assignmentsQuery.isError ? (
              <Card className="p-6 text-center">
                <p className="text-sm font-medium mb-1">
                  Couldn't load your schedule
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Check your connection and try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => assignmentsQuery.refetch()}
                >
                  Try again
                </Button>
              </Card>
            ) : todayAssignments.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
                  <CalendarDays className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <p className="text-base font-semibold text-foreground mb-1">
                  No assignment for today yet
                </p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                  Check with the office, or browse your projects.
                </p>
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => navigate("/projects")}
                >
                  Browse projects
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {todayAssignments.map((a, i) => (
                  <AssignmentHeroCard
                    key={a.id}
                    assignment={a}
                    project={projectById.get(a.project_id)}
                    variant={i === 0 ? "next" : "then"}
                  />
                ))}
              </div>
            )}

            <TomorrowSection
              assignments={tomorrowAssignments}
              projectById={projectById}
              loading={assignmentsLoading}
            />
          </div>

          {/* Side rail on lg; stacked below Tomorrow on phones/iPad portrait */}
          <div className="space-y-6 lg:col-span-1">
            <ThisWeekStrip userId={user?.id} todayISO={todayISO} />
            <QuickActionsRow />
          </div>
        </div>
      </div>
    </MobilePageWrapper>
  );
}
