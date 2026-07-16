/**
 * Data layer + display helpers for the field-worker "Today" home page (`/today`).
 *
 * House rules — this page is the future post-login landing for field workers,
 * i.e. the auth-loop danger zone (Gotchas #53/#54/#55/#56/#63):
 * - ZERO realtime subscriptions. Freshness comes from staleTime +
 *   refetchOnWindowFocus (workers reopen their phone → focus refetch).
 * - The user id comes from the in-memory `useAuth()` context at the call site —
 *   NEVER `supabase.auth.getUser()` on a mount path.
 * - Plain `useQuery` everywhere.
 * - Field-worker code paths read the `crew_day_assignments_field_view` view
 *   (Rule 34) — RLS scopes it to the signed-in user's own rows. Never query
 *   the base `crew_day_assignments` table from field code.
 * - Errors are destructured and thrown (Gotcha #16).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getShowSandboxProject,
  isProjectVisibleByCategory,
} from "@/utils/sandboxPreferences";

/**
 * Query-key constants shared between the ThisWeekStrip reads and the
 * QuickActionsRow in-place dialogs (Gotcha #27 — a write from those dialogs
 * must invalidate every key that reads the same table).
 */
export const TODAY_WEEK_TIME_KEY = "today-week-time-entries";
export const TODAY_WEEK_ASSIGNMENTS_KEY = "today-week-assignments";
export const TODAY_RECEIPTS_PENDING_KEY = "today-receipts-pending";

/**
 * Field-facing assignment row from `crew_day_assignments_field_view`.
 * The generated view types are all-nullable; rows missing identity columns
 * are dropped in the query fn before this shape is asserted.
 */
export interface FieldAssignment {
  id: string;
  user_id: string;
  project_id: string;
  /** YYYY-MM-DD (date-only — compare as strings, never through `new Date()`). */
  work_date: string;
  /** Postgres `time` — "HH:MM:SS" — or null when the dispatcher didn't set one. */
  start_time: string | null;
  /** Dispatcher's instruction for the worker (may contain gate codes etc.). */
  task_note: string | null;
  estimate_line_item_id: string | null;
  change_order_line_item_id: string | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

/** Resolved, dialable phone for the Call affordance. */
export interface ResolvedPhone {
  /** The raw token as entered (shown to the user if needed). */
  display: string;
  /** Digits (+ optional leading "+") for the tel: href. */
  tel: string;
}

/** Lightweight project projection for the Today cards. */
export interface TodayProject {
  id: string;
  project_number: string;
  project_name: string;
  /** Single free-text column on `projects` (no separate city/state columns). */
  address: string | null;
  /** Project owner's payee_name (projects.owner_id → payees), when resolvable. */
  owner_name: string | null;
  /** First usable number parsed from the owner's phone_numbers text, or null. */
  owner_phone: ResolvedPhone | null;
}

interface HookOptions {
  enabled?: boolean;
}

/**
 * Today's + tomorrow's assignments for the signed-in user, ordered
 * work_date → start_time (nulls last) → created_at. One query covers both
 * days; callers split by comparing `work_date` against the ISO strings.
 */
export function useMyDayAssignments(
  userId: string | undefined,
  todayISO: string,
  tomorrowISO: string,
  options: HookOptions = {}
) {
  return useQuery({
    queryKey: ["my-day-assignments", userId, todayISO],
    enabled: !!userId && (options.enabled ?? true),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FieldAssignment[]> => {
      // Two days × one worker — nowhere near the 1,000-row cap (Gotcha #23).
      const { data, error } = await supabase
        .from("crew_day_assignments_field_view")
        .select("*")
        .eq("user_id", userId)
        .gte("work_date", todayISO)
        .lte("work_date", tomorrowISO)
        .order("work_date")
        .order("start_time", { ascending: true, nullsFirst: false })
        .order("created_at");
      if (error) throw error;
      // View rows are all-nullable in the generated types; drop anything
      // missing its identity columns before asserting the practical shape.
      return (data ?? []).filter(
        (r) => r.id && r.project_id && r.work_date
      ) as FieldAssignment[];
    },
  });
}

/**
 * A single assignment by id, from the field view (RLS scopes it to the
 * signed-in worker's own rows). Powers the `/my-day/:assignmentId` detail
 * screen reached from notifications and the Today cards. Returns null when the
 * row is missing (reassigned/canceled, or not visible to this user).
 */
export function useAssignmentById(
  assignmentId: string | undefined,
  options: HookOptions = {}
) {
  return useQuery({
    queryKey: ["assignment-detail", assignmentId],
    enabled: !!assignmentId && (options.enabled ?? true),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FieldAssignment | null> => {
      const { data, error } = await supabase
        .from("crew_day_assignments_field_view")
        .select("*")
        .eq("id", assignmentId)
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.id || !data.project_id || !data.work_date) return null;
      return data as FieldAssignment;
    },
  });
}

/**
 * The signed-in worker's assignment for ONE project on ONE date — powers the
 * "Today here" hero on the project field view, so the dispatcher's instruction
 * follows the worker from Today → assignment detail → the site itself (before
 * this, the note died at the project header).
 *
 * Multiple rows per (user, project, date) are valid (Rule 34 — a morning and
 * an afternoon block on the same site), so this takes the EARLIEST by
 * start_time and ignores the rest; the full set stays visible on Today.
 * Returns null when the worker isn't dispatched here today — callers omit the
 * hero entirely rather than rendering an empty state (an admin browsing a
 * project would otherwise always see "nothing scheduled").
 */
export function useProjectDayAssignment(
  userId: string | undefined,
  projectId: string | undefined,
  workDateISO: string,
  options: HookOptions = {}
) {
  return useQuery({
    queryKey: ["project-day-assignment", userId, projectId, workDateISO],
    enabled: !!userId && !!projectId && (options.enabled ?? true),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FieldAssignment | null> => {
      const { data, error } = await supabase
        .from("crew_day_assignments_field_view")
        .select("*")
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .eq("work_date", workDateISO)
        .order("start_time", { ascending: true, nullsFirst: false })
        .order("created_at")
        .limit(1);
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row || !row.id || !row.project_id || !row.work_date) return null;
      return row as FieldAssignment;
    },
  });
}

/**
 * Projects referenced by the visible assignments, plus each project's owner
 * contact (projects.owner_id → payees.payee_name / phone_numbers). The owner
 * read is deliberately NON-FATAL: the Call affordance is secondary, and a
 * payees RLS denial must not take down the hero card's project identity.
 */
export function useTodayProjects(projectIds: string[], options: HookOptions = {}) {
  // Sorted copy → stable structural query key regardless of assignment order.
  const ids = [...projectIds].sort();

  return useQuery({
    queryKey: ["today-projects", ids],
    enabled: ids.length > 0 && (options.enabled ?? true),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<TodayProject[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_number, project_name, address, owner_id")
        .in("id", ids);
      if (error) throw error;
      const rows = data ?? [];

      const ownerIds = Array.from(
        new Set(rows.map((r) => r.owner_id).filter(Boolean))
      ) as string[];

      const ownerById = new Map<
        string,
        { payee_name: string | null; phone_numbers: string | null }
      >();
      if (ownerIds.length > 0) {
        const { data: owners, error: ownersError } = await supabase
          .from("payees")
          .select("id, payee_name, phone_numbers")
          .in("id", ownerIds);
        if (ownersError) {
          // Surfaced, not discarded (Gotcha #16) — but non-fatal by design:
          // losing the Call button must not blank the Next Stop card.
          console.error("TodayHome: failed to load project owners", ownersError);
        } else {
          for (const o of owners ?? []) {
            ownerById.set(o.id, {
              payee_name: o.payee_name,
              phone_numbers: o.phone_numbers,
            });
          }
        }
      }

      return rows.map((r) => {
        const owner = r.owner_id ? ownerById.get(r.owner_id) : undefined;
        return {
          id: r.id,
          project_number: r.project_number,
          project_name: r.project_name,
          address: r.address,
          owner_name: owner?.payee_name ?? null,
          owner_phone: firstUsablePhone(owner?.phone_numbers),
        };
      });
    },
  });
}

/**
 * The signed-in worker's most recently worked ACTIVE project — the "Your last
 * site" hero fallback when dispatch has no assignment for today.
 */
export interface LastWorkedProject {
  id: string;
  project_number: string;
  project_name: string;
  address: string | null;
  /** YYYY-MM-DD of the newest time entry on this project (date-only string). */
  lastWorkedDate: string;
}

/**
 * Resolves "where did I last work?" from the worker's own time entries
 * (`expenses.is_time_entry` — the ground truth of where they clocked hours;
 * RLS already scopes field workers to their own rows, and the explicit
 * `eq('user_id')` scopes admins dogfooding `/today`).
 *
 * Walks the newest ~15 entries and returns the first project that is still
 * active (approved / in_progress) AND visible by category (construction, or
 * SYS-TEST with the sandbox toggle — mirrors `useFieldActiveProjects`).
 * Returns null when the worker has no usable history — callers fall back to
 * the browse-projects empty state.
 *
 * Same house rules as everything in this file: plain useQuery, no realtime,
 * no auth calls, bounded reads, errors thrown.
 */
export function useLastWorkedProject(
  userId: string | undefined,
  options: HookOptions = {}
) {
  return useQuery({
    // Keyed on the sandbox toggle like useFieldActiveProjects — visibility of
    // SYS-TEST history depends on it and it's localStorage-backed (not reactive).
    queryKey: ["today-last-worked-project", userId, getShowSandboxProject()],
    enabled: !!userId && (options.enabled ?? true),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<LastWorkedProject | null> => {
      // Admin-entered time carries the WORKER's payee but not necessarily
      // their user_id (Gotcha #68 resolution order: payees.user_id first,
      // expenses.user_id fallback) — so match on either. A user can have
      // multiple linked payees (internal W-2 shadow AND labor-providing
      // subcontractor record), hence the list.
      const { data: myPayees, error: payeesError } = await supabase
        .from("payees")
        .select("id")
        .eq("user_id", userId);
      if (payeesError) throw payeesError;
      const payeeIds = (myPayees ?? []).map((p) => p.id);

      let entriesQuery = supabase
        .from("expenses")
        .select("project_id, expense_date")
        .eq("is_time_entry", true)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(15);
      entriesQuery =
        payeeIds.length > 0
          ? entriesQuery.or(
              `user_id.eq.${userId},payee_id.in.(${payeeIds.join(",")})`
            )
          : entriesQuery.eq("user_id", userId);
      const { data: entries, error } = await entriesQuery;
      if (error) throw error;

      // Newest-first distinct projects + the newest date seen for each.
      const orderedIds: string[] = [];
      const dateById = new Map<string, string>();
      for (const e of entries ?? []) {
        if (e.project_id && !dateById.has(e.project_id)) {
          orderedIds.push(e.project_id);
          dateById.set(e.project_id, e.expense_date);
        }
      }
      if (orderedIds.length === 0) return null;

      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, project_number, project_name, address, status, category")
        .in("id", orderedIds)
        .in("status", ["approved", "in_progress"]);
      if (projectsError) throw projectsError;

      const byId = new Map((projects ?? []).map((p) => [p.id, p]));
      for (const id of orderedIds) {
        const p = byId.get(id);
        if (p && isProjectVisibleByCategory(p)) {
          return {
            id: p.id,
            project_number: p.project_number,
            project_name: p.project_name,
            address: p.address,
            lastWorkedDate: dateById.get(id)!,
          };
        }
      }
      return null;
    },
  });
}

/**
 * `payees.phone_numbers` is a FREE-TEXT column (`string | null` in the
 * generated Supabase types — NOT jsonb; PayeeForm exposes it as a single
 * "Phone" input, plural name notwithstanding). Users sometimes stuff
 * multiple numbers in, so split on common separators and take the first
 * token with at least 7 digits. Returns null when nothing dialable is
 * found — callers omit the Call affordance entirely in that case.
 */
export function firstUsablePhone(
  raw: string | null | undefined
): ResolvedPhone | null {
  if (!raw) return null;
  const candidates = raw.split(/[,;\n/]|\s+or\s+/i);
  for (const candidate of candidates) {
    const display = candidate.trim();
    if (!display) continue;
    const digits = display.replace(/\D/g, "");
    if (digits.length >= 7) {
      const tel = display.startsWith("+") ? `+${digits}` : digits;
      return { display, tel };
    }
  }
  return null;
}

/**
 * Postgres `time` value ("07:30:00") → "7:30 AM". Returns null when unset so
 * callers can skip the chip entirely.
 */
export function formatStartTime12h(t: string | null): string | null {
  if (!t) return null;
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return null;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr ?? "00"} ${period}`;
}

/** First line of a multi-line note (for compact previews). */
export function firstLine(text: string | null): string | null {
  if (!text) return null;
  const line = text.split("\n")[0].trim();
  return line.length > 0 ? line : null;
}
