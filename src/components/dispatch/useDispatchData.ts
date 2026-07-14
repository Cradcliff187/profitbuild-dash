/**
 * Data layer for the Crew Dispatch board.
 *
 * - Roster: labor-providing active payees linked to an auth user (keyed by user_id).
 * - Projects: dispatchable picker set (approved/in_progress construction + sandbox
 *   visibility, per Rule 6 / sandboxPreferences), PLUS any project referenced by
 *   an assignment even if outside the picker set (e.g. a completed project's chip).
 * - Assignments: one query per visible week, keyed [CREW_ASSIGNMENTS_KEY, weekStartISO].
 * - Mutations: writer-set created_by/updated_by from useAuth() (Gotcha #63 — never
 *   supabase.auth.getUser()); every write invalidates the [CREW_ASSIGNMENTS_KEY]
 *   prefix (Gotcha #27). NO realtime subscriptions (Gotcha #53).
 */

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProjectCategoryOrFilter,
  isProjectVisibleByCategory,
} from "@/utils/sandboxPreferences";
import {
  CREW_ASSIGNMENTS_KEY,
  CrewAssignment,
  DispatchProject,
  DispatchWorker,
  ScheduleTaskLink,
  taskLinkToColumns,
} from "./dispatchTypes";

const PROJECT_FIELDS = "id, project_number, project_name, status, category, client_name";

interface HookOptions {
  enabled?: boolean;
}

export function useDispatchRoster(options: HookOptions = {}) {
  return useQuery({
    queryKey: ["dispatch-roster"],
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DispatchWorker[]> => {
      const { data, error } = await supabase
        .from("payees")
        .select("user_id, payee_name")
        .eq("provides_labor", true)
        .eq("is_active", true)
        .not("user_id", "is", null)
        .order("payee_name");
      if (error) throw error;

      // Key rows by user_id. A user can have more than one labor-providing payee
      // (internal shadow record + linked sub record — the unique partial index only
      // covers internal payees), so dedup defensively; first alphabetical name wins.
      const seen = new Set<string>();
      const workers: DispatchWorker[] = [];
      for (const row of data ?? []) {
        if (!row.user_id || seen.has(row.user_id)) continue;
        seen.add(row.user_id);
        workers.push({ user_id: row.user_id, payee_name: row.payee_name });
      }
      return workers;
    },
  });
}

export function useDispatchProjects(options: HookOptions = {}) {
  return useQuery({
    queryKey: ["dispatch-projects"],
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DispatchProject[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_FIELDS)
        .in("status", ["approved", "in_progress"])
        .or(getProjectCategoryOrFilter())
        .order("project_number", { ascending: false })
        .range(0, 499); // matches MobileTimeTracker's cap — well beyond active-project scale
      if (error) throw error;
      // Defense-in-depth: re-apply the visibility predicate client-side (same
      // pattern as MobileTimeTracker.loadInitialData).
      return ((data ?? []) as DispatchProject[]).filter((p) => isProjectVisibleByCategory(p));
    },
  });
}

export function useWeekAssignments(
  weekStartISO: string,
  weekEndISO: string,
  options: HookOptions = {}
) {
  return useQuery({
    queryKey: [CREW_ASSIGNMENTS_KEY, weekStartISO],
    enabled: options.enabled ?? true,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<CrewAssignment[]> => {
      // One week × roster size — far below the 1,000-row PostgREST cap (Gotcha #23).
      const { data, error } = await supabase
        .from("crew_day_assignments")
        .select("*")
        .gte("work_date", weekStartISO)
        .lte("work_date", weekEndISO);
      if (error) throw error;
      return (data ?? []) as CrewAssignment[];
    },
  });
}

/**
 * Projects referenced by this week's assignments but missing from the picker
 * set (completed / on-hold projects still carrying chips). Fetched by id so
 * chips always render a real project number.
 */
export function useReferencedProjects(
  assignments: CrewAssignment[],
  pickerProjects: DispatchProject[],
  options: HookOptions = {}
) {
  const missingIds = useMemo(() => {
    const known = new Set(pickerProjects.map((p) => p.id));
    return Array.from(
      new Set(assignments.map((a) => a.project_id).filter((id) => !known.has(id)))
    ).sort();
  }, [assignments, pickerProjects]);

  return useQuery({
    queryKey: ["dispatch-projects-referenced", missingIds],
    enabled: (options.enabled ?? true) && missingIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DispatchProject[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_FIELDS)
        .in("id", missingIds);
      if (error) throw error;
      return (data ?? []) as DispatchProject[];
    },
  });
}

export interface SaveAssignmentInput {
  /** Present = update this row; absent = insert a new one. */
  id?: string;
  user_id: string;
  project_id: string;
  work_date: string;
  start_time: string | null;
  task_note: string | null;
  admin_notes: string | null;
  /**
   * Optional schedule-activity link. Projected onto the two FK columns via
   * `taskLinkToColumns` (at most one set, per the DB CHECK); null clears both.
   * Independent of `task_note` — the note is a text snapshot and survives unlink.
   */
  task_link: ScheduleTaskLink | null;
}

export function useDispatchMutations(weekStartISO: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [CREW_ASSIGNMENTS_KEY] });

  /** Insert or update; returns true on success (caller closes the sheet). */
  const saveAssignment = async (input: SaveAssignmentInput): Promise<boolean> => {
    if (!user?.id) {
      toast.error("You must be signed in to save assignments");
      return false;
    }
    const linkColumns = taskLinkToColumns(input.task_link);
    if (input.id) {
      const { error } = await supabase
        .from("crew_day_assignments")
        .update({
          user_id: input.user_id,
          project_id: input.project_id,
          work_date: input.work_date,
          start_time: input.start_time,
          task_note: input.task_note,
          admin_notes: input.admin_notes,
          ...linkColumns,
          updated_by: user.id,
        })
        .eq("id", input.id);
      if (error) {
        toast.error("Failed to update assignment", { description: error.message });
        return false;
      }
      toast.success("Assignment updated");
    } else {
      const { error } = await supabase.from("crew_day_assignments").insert({
        user_id: input.user_id,
        project_id: input.project_id,
        work_date: input.work_date,
        start_time: input.start_time,
        task_note: input.task_note,
        admin_notes: input.admin_notes,
        ...linkColumns,
        created_by: user.id,
        updated_by: user.id,
      });
      if (error) {
        toast.error("Failed to create assignment", { description: error.message });
        return false;
      }
      toast.success("Assignment created");
    }
    invalidate();
    return true;
  };

  /**
   * Drag move: optimistic UPDATE of user_id/work_date ONLY — start_time,
   * task_note, and the schedule-link FK columns (estimate_line_item_id /
   * change_order_line_item_id) are deliberately untouched so a move preserves
   * the link. Rollback on error, then prefix invalidation either way.
   */
  const moveAssignment = async (
    assignmentId: string,
    toUserId: string,
    toDateISO: string
  ): Promise<void> => {
    if (!user?.id) return;
    const weekKey = [CREW_ASSIGNMENTS_KEY, weekStartISO];
    const previous = queryClient.getQueryData<CrewAssignment[]>(weekKey);
    queryClient.setQueryData<CrewAssignment[]>(weekKey, (old) =>
      (old ?? []).map((a) =>
        a.id === assignmentId ? { ...a, user_id: toUserId, work_date: toDateISO } : a
      )
    );

    const { error } = await supabase
      .from("crew_day_assignments")
      .update({ user_id: toUserId, work_date: toDateISO, updated_by: user.id })
      .eq("id", assignmentId);

    if (error) {
      queryClient.setQueryData(weekKey, previous);
      toast.error("Failed to move assignment", { description: error.message });
      return;
    }
    invalidate();
  };

  /** DELETE is admin-only at RLS; callers gate the UI (grid remove zone + sheet). */
  const deleteAssignment = async (assignmentId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("crew_day_assignments")
      .delete()
      .eq("id", assignmentId);
    if (error) {
      toast.error("Failed to remove assignment", { description: error.message });
      return false;
    }
    toast.success("Assignment removed");
    invalidate();
    return true;
  };

  return { saveAssignment, moveAssignment, deleteAssignment };
}
