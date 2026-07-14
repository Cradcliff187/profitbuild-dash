/**
 * Shared data layer for the field-worker shell's project lists
 * (`/my-projects` and the `/notes` project picker).
 *
 * House rules (auth-loop danger zone — Gotchas #53/#63):
 * - Plain `useQuery`, staleTime + refetchOnWindowFocus. No realtime.
 * - No auth calls — RLS + the category filter scope the rows.
 * - Errors destructured and thrown (Gotcha #16).
 *
 * Visibility mirrors `MobileTimeTracker` / `FieldProjectSelector`:
 * construction projects (plus SYS-TEST when the Settings sandbox toggle is
 * on) via `getProjectCategoryOrFilter()`, active statuses only. Bounded with
 * an explicit `.range()` like MobileTimeTracker's picker (Gotcha #23 class —
 * never rely on the implicit cap).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getProjectCategoryOrFilter,
  getShowSandboxProject,
} from "@/utils/sandboxPreferences";

export interface FieldActiveProject {
  id: string;
  project_number: string;
  project_name: string;
  address: string | null;
}

/** Active (approved / in-progress) construction projects, newest number first. */
export function useFieldActiveProjects() {
  return useQuery({
    // Sandbox toggle is localStorage-backed (not reactive) — key on it so
    // flipping it in Settings changes the cache entry, same pattern as
    // FieldProjectSelector's ['field-accessible-projects', ...] key.
    queryKey: ["field-active-projects", getShowSandboxProject()],
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FieldActiveProject[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_number, project_name, address")
        .in("status", ["approved", "in_progress"])
        .or(getProjectCategoryOrFilter())
        .order("project_number", { ascending: false })
        .range(0, 499);
      if (error) throw error;
      return (data ?? []) as FieldActiveProject[];
    },
  });
}
