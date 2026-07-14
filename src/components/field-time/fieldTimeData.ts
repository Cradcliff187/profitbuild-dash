/**
 * Data layer + display helpers for the field-worker time landing
 * (`/time-tracker` when the `field_worker_v2` flag is ON — mounted by the
 * route orchestrator; see FieldTimeLanding.tsx).
 *
 * House rules — this page sits on the field-worker post-login critical path,
 * i.e. the auth-loop danger zone (Gotchas #53/#54/#55/#56/#63):
 * - ZERO realtime subscriptions. Freshness comes from staleTime (60s) +
 *   refetchOnWindowFocus (workers reopen their phone → focus refetch).
 * - The user id comes from the in-memory `useAuth()` context at the call
 *   site — NEVER `supabase.auth.getUser()` on a mount path.
 * - Plain `useQuery` everywhere; keys namespaced `['field-time-...']`.
 * - Assignment reads go through `crew_day_assignments_field_view` (Rule 34) —
 *   RLS scopes it to the signed-in user's own rows. Never the base table.
 * - A time entry is `is_time_entry = true` (generated column:
 *   `category = 'labor_internal' OR start_time IS NOT NULL`) — never
 *   `category = 'labor_internal'` alone (Gotcha #68).
 * - Errors are destructured and thrown (Gotcha #16).
 * - Row volume: one worker × ≤1 week (or LIMIT 10) — nowhere near the
 *   1,000-row PostgREST cap (Gotcha #23).
 */

import { useQuery, type QueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const STALE_TIME = 60 * 1000;

/**
 * Own time-entry row as this page reads it — a superset of the `TimeEntry`
 * shape `EditTimeEntryDialog` accepts, plus the embedded project label and
 * the hours columns for display (Paid Hours = `hours`, Gross = `gross_hours`
 * — Gotcha #17; always display the DB values, never recompute).
 */
export interface FieldTimeEntry {
  id: string;
  payee_id: string;
  project_id: string;
  /** YYYY-MM-DD (Postgres date — compare as strings). */
  expense_date: string;
  amount: number;
  description: string | null;
  user_id: string | null;
  start_time: string | null;
  end_time: string | null;
  attachment_url: string | null;
  approval_status: string | null;
  is_locked: boolean | null;
  rejection_reason: string | null;
  lunch_taken: boolean | null;
  lunch_duration_minutes: number | null;
  /** Paid Hours (after lunch deduction). */
  hours: number | null;
  /** Gross Hours (total shift duration). */
  gross_hours: number | null;
  created_at: string | null;
  project: { project_number: string; project_name: string } | null;
}

const ENTRY_SELECT = `
  id,
  payee_id,
  project_id,
  expense_date,
  amount,
  description,
  user_id,
  start_time,
  end_time,
  attachment_url,
  approval_status,
  is_locked,
  rejection_reason,
  lunch_taken,
  lunch_duration_minutes,
  hours,
  gross_hours,
  created_at,
  projects(project_number, project_name)
`;

interface RawEntryRow extends Omit<FieldTimeEntry, "project"> {
  projects: { project_number: string; project_name: string } | null;
}

function mapEntryRows(rows: unknown): FieldTimeEntry[] {
  return ((rows ?? []) as RawEntryRow[]).map(({ projects, ...rest }) => ({
    ...rest,
    project: projects ?? null,
  }));
}

interface HookOptions {
  enabled?: boolean;
}

/**
 * Own time entries for a Mon–Sun week window (inclusive date strings).
 * Mirrors MobileTimeTracker's `loadTodayEntries` scoping: own `user_id` only.
 */
export function useMyWeekTimeEntries(
  userId: string | undefined,
  weekStartISO: string,
  weekEndISO: string,
  options: HookOptions = {}
) {
  return useQuery({
    queryKey: ["field-time-week-entries", userId, weekStartISO],
    enabled: !!userId && (options.enabled ?? true),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FieldTimeEntry[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select(ENTRY_SELECT)
        .eq("user_id", userId)
        .eq("is_time_entry", true)
        .gte("expense_date", weekStartISO)
        .lte("expense_date", weekEndISO)
        .order("expense_date")
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return mapEntryRows(data);
    },
  });
}

/**
 * Own time entries for a single day — the source list for the
 * "Copy yesterday" / "Copy last Friday" flows. When yesterday IS last
 * Friday (Saturdays), both callers share this key and only one fetch fires.
 */
export function useMyDayTimeEntries(
  userId: string | undefined,
  dateISO: string,
  options: HookOptions = {}
) {
  return useQuery({
    queryKey: ["field-time-day-entries", userId, dateISO],
    enabled: !!userId && (options.enabled ?? true),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FieldTimeEntry[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select(ENTRY_SELECT)
        .eq("user_id", userId)
        .eq("is_time_entry", true)
        .eq("expense_date", dateISO)
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return mapEntryRows(data);
    },
  });
}

/** Own 10 most recent time entries, newest first. */
export function useMyRecentTimeEntries(
  userId: string | undefined,
  options: HookOptions = {}
) {
  return useQuery({
    queryKey: ["field-time-recent-entries", userId],
    enabled: !!userId && (options.enabled ?? true),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FieldTimeEntry[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select(ENTRY_SELECT)
        .eq("user_id", userId)
        .eq("is_time_entry", true)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return mapEntryRows(data);
    },
  });
}

/**
 * Dates (YYYY-MM-DD) within the week window on which the signed-in user has
 * at least one crew assignment. Read from `crew_day_assignments_field_view`
 * per Rule 34 — never the base `crew_day_assignments` table from field code.
 */
export function useMyWeekAssignmentDates(
  userId: string | undefined,
  weekStartISO: string,
  weekEndISO: string,
  options: HookOptions = {}
) {
  return useQuery({
    queryKey: ["field-time-week-assignments", userId, weekStartISO],
    enabled: !!userId && (options.enabled ?? true),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("crew_day_assignments_field_view")
        .select("work_date")
        .eq("user_id", userId)
        .gte("work_date", weekStartISO)
        .lte("work_date", weekEndISO);
      if (error) throw error;
      const dates = new Set<string>();
      for (const row of data ?? []) {
        if (row.work_date) dates.add(row.work_date);
      }
      return Array.from(dates);
    },
  });
}

/**
 * Invalidate every query this page owns. Called after any write (create /
 * edit / delete / copy-batch) so the summary dots, per-project subtotals,
 * recent list, and copy-source lists all refresh without F5 (Gotcha #27 —
 * cache fanout must cover every key reading the underlying table).
 */
export function invalidateFieldTimeQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" &&
      (query.queryKey[0] as string).startsWith("field-time-"),
  });
}

/** "7:00 AM – 3:30 PM", or null when the entry has no clock times (PTO). */
export function formatEntryTimeRange(entry: FieldTimeEntry): string | null {
  if (!entry.start_time || !entry.end_time) return null;
  return `${format(new Date(entry.start_time), "h:mm a")} – ${format(
    new Date(entry.end_time),
    "h:mm a"
  )}`;
}

/**
 * Approval-status badge classes — same map `TimeEntriesCardView` uses (that
 * copy is component-local, so it can't be imported without editing a shared
 * file; keep the two in visual lockstep).
 */
export function getApprovalBadgeClass(status: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
      return "border-success text-success bg-success/10";
    case "rejected":
      return "border-destructive text-destructive bg-destructive/10";
    case "pending":
      return "border-warning text-warning bg-warning/10";
    default:
      return "border-primary text-primary bg-primary/10";
  }
}

/** Total Paid Hours across entries (`expenses.hours` — Gotcha #17). */
export function sumPaidHours(entries: FieldTimeEntry[]): number {
  const total = entries.reduce((acc, e) => acc + (e.hours ?? 0), 0);
  return Math.round(total * 100) / 100;
}

export interface ProjectHoursRollup {
  projectId: string;
  projectNumber: string;
  projectName: string;
  paidHours: number;
}

/** Paid Hours grouped by project, largest first. */
export function paidHoursByProject(
  entries: FieldTimeEntry[]
): ProjectHoursRollup[] {
  const byProject = new Map<string, ProjectHoursRollup>();
  for (const e of entries) {
    const existing = byProject.get(e.project_id);
    if (existing) {
      existing.paidHours += e.hours ?? 0;
    } else {
      byProject.set(e.project_id, {
        projectId: e.project_id,
        projectNumber: e.project?.project_number ?? "—",
        projectName: e.project?.project_name ?? "Unknown project",
        paidHours: e.hours ?? 0,
      });
    }
  }
  return Array.from(byProject.values())
    .map((r) => ({ ...r, paidHours: Math.round(r.paidHours * 100) / 100 }))
    .sort((a, b) => b.paidHours - a.paidHours);
}
