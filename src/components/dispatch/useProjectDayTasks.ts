/**
 * Schedule tie-in for the assignment sheet: which of a project's schedulable
 * lines are ACTIVE on a given date?
 *
 * Sources mirror the schedule loaders (Rule 32): the approved estimate's
 * `estimate_line_items` UNION approved change orders' `change_order_line_items`,
 * filtered to SCHEDULABLE_CATEGORIES. A line "matches" the date when
 * `scheduled_start_date <= date AND coalesce(scheduled_end_date, scheduled_start_date) >= date`
 * — compared as YYYY-MM-DD strings (lexicographic order is calendar order).
 *
 * The sheet renders matching descriptions as tap-to-insert chips; the inserted
 * text is a SNAPSHOT stored in `task_note` (deliberately text, not an FK).
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SCHEDULABLE_CATEGORIES } from "@/utils/scheduleNotes";

export interface ProjectDayTask {
  id: string;
  description: string;
  category: string;
  source: "estimate" | "change_order";
  scheduledStart: string | null;
  scheduledEnd: string | null;
}

const LINE_FIELDS = "id, category, description, scheduled_start_date, scheduled_end_date";

interface RawLine {
  id: string;
  category: string | null;
  description: string | null;
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
}

function isSchedulable(line: RawLine): boolean {
  return (
    !!line.category &&
    (SCHEDULABLE_CATEGORIES as readonly string[]).includes(line.category)
  );
}

function mapLine(line: RawLine, source: ProjectDayTask["source"]): ProjectDayTask {
  return {
    id: line.id,
    description: line.description ?? "",
    category: line.category ?? "",
    source,
    scheduledStart: line.scheduled_start_date,
    scheduledEnd: line.scheduled_end_date,
  };
}

export function useProjectDayTasks(projectId: string | null, isoDate: string | null) {
  const query = useQuery({
    queryKey: ["dispatch-project-day-tasks", projectId],
    enabled: !!projectId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ProjectDayTask[]> => {
      // Approved estimate (latest — same scoping as useProjectMaterials) + lines
      const { data: estimate, error: estError } = await supabase
        .from("estimates")
        .select(`id, estimate_line_items (${LINE_FIELDS})`)
        .eq("project_id", projectId!)
        .eq("status", "approved")
        .order("date_created", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (estError) throw estError;

      // Approved change orders + lines
      const { data: changeOrders, error: coError } = await supabase
        .from("change_orders")
        .select(`id, change_order_line_items (${LINE_FIELDS})`)
        .eq("project_id", projectId!)
        .eq("status", "approved");
      if (coError) throw coError;

      const estLines = (((estimate?.estimate_line_items as RawLine[] | null) ?? [])
        .filter(isSchedulable)
        .map((l) => mapLine(l, "estimate")));

      const coLines = (
        ((changeOrders ?? []) as { change_order_line_items: RawLine[] | null }[])
      ).flatMap((co) =>
        (co.change_order_line_items ?? [])
          .filter(isSchedulable)
          .map((l) => mapLine(l, "change_order"))
      );

      return [...estLines, ...coLines].filter((t) => t.description.trim().length > 0);
    },
  });

  const allTasks = useMemo(() => query.data ?? [], [query.data]);

  const matchingTasks = useMemo(() => {
    if (!isoDate) return [];
    return allTasks.filter(
      (t) =>
        !!t.scheduledStart &&
        t.scheduledStart <= isoDate &&
        (t.scheduledEnd ?? t.scheduledStart) >= isoDate
    );
  }, [allTasks, isoDate]);

  return { allTasks, matchingTasks, isLoading: query.isLoading };
}
