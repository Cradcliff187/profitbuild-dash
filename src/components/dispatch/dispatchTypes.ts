/**
 * Shared types for the admin Crew Dispatch board (`/dispatch`).
 *
 * `crew_day_assignments` contract (Rule 34):
 *  - multiple rows per (user_id, work_date) are VALID by design
 *  - RLS: admins/managers read all + insert/update; DELETE is ADMIN ONLY
 *  - created_by / updated_by are writer-set from the useAuth() user id
 */

export interface CrewAssignment {
  id: string;
  user_id: string;
  project_id: string;
  /** YYYY-MM-DD (date-only — compare as strings, never through `new Date()`). */
  work_date: string;
  /** HH:MM:SS or null. */
  start_time: string | null;
  task_note: string | null;
  admin_notes: string | null;
  /**
   * Optional link to a schedule activity — at most ONE of these is set (DB CHECK).
   * The link drives the DB trigger that auto-allocates a worker's time entries
   * when their (person, project, day) has exactly one task-linked assignment
   * with a matching category. `task_note` stays a TEXT SNAPSHOT regardless —
   * unlinking never clears the note, and editing the note never changes the link.
   * FKs are ON DELETE SET NULL, so a deleted/superseded line nulls these silently.
   */
  estimate_line_item_id: string | null;
  change_order_line_item_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

/** In-memory reference to the schedule activity an assignment is linked to. */
export interface ScheduleTaskLink {
  id: string;
  source: "estimate" | "change_order";
}

/**
 * Project a task link onto the two FK columns. Deriving both columns from the
 * single `source` discriminant structurally enforces the DB CHECK ("at most
 * one set") — callers can never write both.
 */
export function taskLinkToColumns(link: ScheduleTaskLink | null): {
  estimate_line_item_id: string | null;
  change_order_line_item_id: string | null;
} {
  return {
    estimate_line_item_id: link?.source === "estimate" ? link.id : null,
    change_order_line_item_id: link?.source === "change_order" ? link.id : null,
  };
}

/** Inverse of `taskLinkToColumns` — read an assignment row's link (or null). */
export function assignmentTaskLink(
  a: Pick<CrewAssignment, "estimate_line_item_id" | "change_order_line_item_id">
): ScheduleTaskLink | null {
  if (a.estimate_line_item_id) {
    return { id: a.estimate_line_item_id, source: "estimate" };
  }
  if (a.change_order_line_item_id) {
    return { id: a.change_order_line_item_id, source: "change_order" };
  }
  return null;
}

/** True when the assignment row carries a schedule-activity link. */
export function isTaskLinked(
  a: Pick<CrewAssignment, "estimate_line_item_id" | "change_order_line_item_id">
): boolean {
  return !!(a.estimate_line_item_id || a.change_order_line_item_id);
}

/** Dispatchable worker — a labor-providing, active payee linked to an auth user. */
export interface DispatchWorker {
  user_id: string;
  payee_name: string;
}

/** Lightweight project projection for chips + pickers. */
export interface DispatchProject {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  category: string | null;
  client_name?: string | null;
}

/** Page-owned typed filter state (Rule 33 — the bar only sees the value bag). */
export interface DispatchFilterState {
  workerIds: string[];
  projectIds: string[];
}

export const EMPTY_DISPATCH_FILTERS: DispatchFilterState = {
  workerIds: [],
  projectIds: [],
};

/**
 * TanStack cache key prefix for the assignments table. Every write invalidates
 * this prefix (Gotcha #27) — nothing else reads crew_day_assignments yet.
 */
export const CREW_ASSIGNMENTS_KEY = "crew-day-assignments";

/**
 * Cell droppable id: `${userId}|${isoDate}` — both parts are `|`-free
 * (uuid + YYYY-MM-DD). Lives here (not in DispatchCell.tsx) so component
 * files stay component-only for fast refresh.
 */
const CELL_ID_SEPARATOR = "|";

export function cellDroppableId(userId: string, isoDate: string): string {
  return `${userId}${CELL_ID_SEPARATOR}${isoDate}`;
}

export function parseCellDroppableId(
  droppableId: string
): { userId: string; isoDate: string } | null {
  const [userId, isoDate] = droppableId.split(CELL_ID_SEPARATOR);
  if (!userId || !isoDate) return null;
  return { userId, isoDate };
}

/** Chip stack order inside a cell: start_time ascending NULLS LAST, then created_at. */
export function sortAssignments(list: CrewAssignment[]): CrewAssignment[] {
  return [...list].sort((a, b) => {
    if (a.start_time && b.start_time) {
      const cmp = a.start_time.localeCompare(b.start_time);
      if (cmp !== 0) return cmp;
    } else if (a.start_time) {
      return -1;
    } else if (b.start_time) {
      return 1;
    }
    return a.created_at.localeCompare(b.created_at);
  });
}

/** `time` column value → display "HH:MM" (or null when unset). */
export function formatStartTime(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}
