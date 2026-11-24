/**
 * Data layer for the weekly timesheet screens.
 *
 * House rules are the same as fieldTimeData.ts (this mounts on /time-tracker,
 * the field-worker landing): ZERO realtime, plain `useQuery`, user id from
 * `useAuth()` at the call site, errors thrown. Every key starts with
 * `field-time-` so `invalidateFieldTimeQueries` refreshes these too.
 *
 * - "Me" reads go through the existing own-entry hooks in fieldTimeData.ts.
 * - Team reads are admin/manager only by RLS: a field worker running the same
 *   query gets only their own rows back. The Team tab is hidden for them; RLS
 *   is the boundary.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ENTRY_SELECT,
  STALE_TIME,
  type FieldTimeEntry,
} from "@/components/field-time/fieldTimeData";
import type { WorkerKind } from "./timesheetModel";

const PAGE_SIZE = 1000;

export interface TeamTimeEntry extends FieldTimeEntry {
  payee: { payee_name: string; is_internal: boolean | null } | null;
}

export interface RosterPerson {
  payeeId: string;
  name: string;
  kind: WorkerKind;
}

const kindOf = (isInternal: boolean | null | undefined): WorkerKind =>
  isInternal === false ? "sub" : "employee";

/**
 * Whether the signed-in user is an employee (40-hour target) or a
 * labor-providing subcontractor (plain total). Any linked internal payee makes
 * them an employee; no linked payee at all defaults to employee.
 */
export function useMyWorkerKind(userId: string | undefined) {
  return useQuery({
    queryKey: ["field-time-my-kind", userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<WorkerKind> => {
      const { data, error } = await supabase
        .from("payees")
        .select("id, is_internal")
        .eq("user_id", userId);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return "employee";
      return rows.some((p) => p.is_internal) ? "employee" : "sub";
    },
  });
}

/** Every time entry in the week, with the worker attached. Admin/manager. */
export function useTeamWeekTimeEntries(
  weekStartISO: string,
  weekEndISO: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["field-time-team-week", weekStartISO],
    enabled,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<TeamTimeEntry[]> => {
      const all: TeamTimeEntry[] = [];
      // A week is ~30 rows today, but loop so the 1,000-row cap (Gotcha #23)
      // can never silently drop someone's hours.
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("expenses")
          .select(
            `${ENTRY_SELECT}, payees!expenses_payee_id_fkey(payee_name, is_internal)`
          )
          .eq("is_time_entry", true)
          .gte("expense_date", weekStartISO)
          .lte("expense_date", weekEndISO)
          .order("expense_date")
          .order("id")
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const row of (data ?? []) as any[]) {
          const { projects, payees, ...rest } = row;
          all.push({ ...rest, project: projects ?? null, payee: payees ?? null });
        }
        if ((data ?? []).length < PAGE_SIZE) break;
      }
      return all;
    },
  });
}

/**
 * Everyone who logs time — same set as the time-entry form's worker picker
 * (active, provides labor, linked to a user). The roster starts from this so a
 * person with ZERO hours this week still shows up; that is the row an auditor
 * most needs to see.
 */
export function useLaborRoster(enabled: boolean) {
  return useQuery({
    queryKey: ["field-time-labor-roster"],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<RosterPerson[]> => {
      const { data, error } = await supabase
        .from("payees")
        .select("id, payee_name, is_internal")
        .eq("provides_labor", true)
        .eq("is_active", true)
        .not("user_id", "is", null)
        .order("payee_name");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        payeeId: p.id,
        name: p.payee_name,
        kind: kindOf(p.is_internal),
      }));
    },
  });
}

/** Roster people plus anyone with entries this week who is not on the roster. */
export function mergeRoster(
  roster: RosterPerson[],
  entries: TeamTimeEntry[]
): RosterPerson[] {
  const people = new Map(roster.map((p) => [p.payeeId, p]));
  for (const e of entries) {
    if (!people.has(e.payee_id)) {
      people.set(e.payee_id, {
        payeeId: e.payee_id,
        name: e.payee?.payee_name ?? "Unknown worker",
        kind: kindOf(e.payee?.is_internal),
      });
    }
  }
  return Array.from(people.values());
}

/** Approve time entries — same write as the Time Approvals page. */
export async function approveTimeEntries(
  entryIds: string[],
  approverId: string | undefined
) {
  if (entryIds.length === 0) return;
  const { error } = await supabase
    .from("expenses")
    .update({
      approval_status: "approved",
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .in("id", entryIds);
  if (error) throw error;
}
