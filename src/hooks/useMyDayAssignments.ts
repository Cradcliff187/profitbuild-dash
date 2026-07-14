/**
 * Shared field-worker "my day" hook — today's + tomorrow's crew assignments
 * for the signed-in user, with the referenced project joined onto each row,
 * plus the wall-clock "current stop" selection.
 *
 * House rules — consumers of this hook mount on (or near) the post-login
 * critical path, i.e. the auth-loop danger zone (Gotchas #53/#54/#55/#56/#63):
 * - ZERO realtime subscriptions. Freshness = staleTime + refetchOnWindowFocus.
 * - User id comes from the in-memory `useAuth()` context — NEVER
 *   `supabase.auth.getUser()` on a mount path.
 * - Plain `useQuery` only (delegated to the todayData query hooks, which share
 *   the same query keys so the Today page and this hook share one cache).
 * - Field paths read `crew_day_assignments_field_view` (Rule 34 — RLS scopes
 *   it to the caller's own rows); never the base table.
 * - Errors are destructured and thrown inside the query fns (Gotcha #16).
 *
 * Date handling: `work_date` is a Postgres `date` — always compared as a
 * YYYY-MM-DD string built by the house helper `formatDateForDB` (never via
 * `new Date('YYYY-MM-DD')`, which shifts a day in negative-offset timezones —
 * see dateUtils.ts). `start_time` is a Postgres `time` ("HH:MM:SS",
 * zero-padded) so lexicographic comparison against a zero-padded local
 * "HH:MM:SS" string is a correct time comparison.
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateForDB } from "@/utils/dateUtils";
import {
  FieldAssignment as FieldAssignmentRow,
  TodayProject,
  useMyDayAssignments as useAssignmentRowsQuery,
  useTodayProjects,
} from "@/components/today/todayData";

/** Project projection joined onto each assignment (null when lookup misses). */
export type FieldAssignmentProject = TodayProject;

/**
 * A `crew_day_assignments_field_view` row plus its joined project.
 * `project` is null for the brief window while the second (projects-by-id)
 * query resolves, or if the project row is genuinely unreadable.
 */
export interface FieldAssignment extends FieldAssignmentRow {
  project: FieldAssignmentProject | null;
}

export interface MyDayAssignments {
  /** Today's assignments, ordered start_time (nulls last) → created_at. */
  today: FieldAssignment[];
  /** Tomorrow's assignments, same ordering. */
  tomorrow: FieldAssignment[];
  /**
   * Wall-clock current stop among TODAY's rows:
   * - the row with the greatest `start_time` <= current local time;
   * - if nothing has started yet (all start_times in the future) or no row
   *   has a start_time, the first-ordered row;
   * - null when there are no rows today.
   */
  currentStop: FieldAssignment | null;
  isLoading: boolean;
}

/** Local wall-clock as a zero-padded "HH:MM:SS" string (compares vs pg time). */
function localTimeHHMMSS(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Pick the current stop from today's ordered rows (see MyDayAssignments doc).
 * Exported for unit testing; pure function of its inputs.
 */
export function pickCurrentStop(
  todayRows: FieldAssignment[],
  nowTime: string
): FieldAssignment | null {
  if (todayRows.length === 0) return null;

  // Rows arrive ordered start_time asc (nulls last) → created_at, so the LAST
  // row whose start_time has passed is the one with the greatest started
  // start_time (ties resolve to the most recently created, deterministically).
  let started: FieldAssignment | null = null;
  for (const row of todayRows) {
    if (row.start_time !== null && row.start_time <= nowTime) {
      started = row;
    }
  }
  return started ?? todayRows[0];
}

export function useMyDayAssignments(): MyDayAssignments {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  // Recomputed each render so a focus refetch after midnight rolls the query
  // key (which includes todayISO) forward without a reload.
  const now = new Date();
  const todayISO = formatDateForDB(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowISO = formatDateForDB(tomorrowDate);

  // Delegates to the todayData query hooks — queryKey
  // ['my-day-assignments', userId, todayISO], staleTime 60s,
  // refetchOnWindowFocus true — so this hook and the /today page share cache.
  const assignmentsQuery = useAssignmentRowsQuery(userId, todayISO, tomorrowISO);
  const rows = useMemo(
    () => assignmentsQuery.data ?? [],
    [assignmentsQuery.data]
  );

  const projectIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.project_id))),
    [rows]
  );
  const projectsQuery = useTodayProjects(projectIds);
  const projectById = useMemo(() => {
    const map = new Map<string, TodayProject>();
    for (const p of projectsQuery.data ?? []) map.set(p.id, p);
    return map;
  }, [projectsQuery.data]);

  const joined = useMemo<FieldAssignment[]>(
    () =>
      rows.map((r) => ({
        ...r,
        project: projectById.get(r.project_id) ?? null,
      })),
    [rows, projectById]
  );

  const today = useMemo(
    () => joined.filter((a) => a.work_date === todayISO),
    [joined, todayISO]
  );
  const tomorrow = useMemo(
    () => joined.filter((a) => a.work_date === tomorrowISO),
    [joined, tomorrowISO]
  );

  const currentStop = pickCurrentStop(today, localTimeHHMMSS(now));

  // A disabled query (no user yet) is "pending" in TanStack v5 — gate the
  // pending signals on having a user, and fold auth bootstrap in so consumers
  // don't flash the empty state during startup.
  const isLoading =
    authLoading ||
    (!!userId &&
      (assignmentsQuery.isPending ||
        (projectIds.length > 0 && projectsQuery.isPending)));

  return { today, tomorrow, currentStop, isLoading };
}
