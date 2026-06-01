import { SchedulePhase } from '@/types/schedule';

/**
 * Categories that represent schedulable WORK and therefore appear on the
 * Gantt / field schedule as tasks.
 *
 * Deliberately excluded:
 *  - `materials`  — procurement, not a work activity. Materials live on the
 *    dedicated Materials & Procurement surface (need-by / delivery dates +
 *    status), and long-lead items surface as delivery milestones instead of
 *    duration bars.
 *  - `management` — overhead that is assumed present for the whole project;
 *    it isn't a discrete scheduled activity.
 */
export const SCHEDULABLE_CATEGORIES = [
  'subcontractors',
  'labor_internal',
  'permits',
  'equipment',
  'other',
] as const;

export function isSchedulableCategory(category?: string | null): boolean {
  return !!category && (SCHEDULABLE_CATEGORIES as readonly string[]).includes(category);
}

export interface ParsedScheduleNotes {
  phases?: SchedulePhase[];
  completed?: boolean;
  notes?: string;
}

/**
 * Single source of truth for reading the `schedule_notes` column.
 *
 * `schedule_notes` is a text column that stores scheduling state as JSON:
 *   - single task   → { "completed": boolean, "notes"?: string }
 *   - multi-phase    → { "phases": SchedulePhase[], "notes"?: string }
 * Legacy / hand-entered values may be plain text, which we treat as `notes`.
 *
 * Both schedule loaders (the mobile `useScheduleTasks` hook and the desktop
 * `ProjectScheduleView`) MUST parse through this helper so their notion of
 * "completed" can never drift again. (A prior bug had the desktop loader
 * silently dropping the single-phase `completed` flag, so completions set on
 * mobile never showed on desktop and the edit panel reverted them.)
 */
export function parseScheduleNotes(raw?: string | null): ParsedScheduleNotes {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const result: ParsedScheduleNotes = {};
    if (parsed && Array.isArray(parsed.phases)) {
      result.phases = parsed.phases;
    }
    if (typeof parsed?.completed === 'boolean') {
      result.completed = parsed.completed;
    }
    if (typeof parsed?.notes === 'string') {
      result.notes = parsed.notes;
    }
    return result;
  } catch {
    // Not JSON — treat the whole value as plain-text notes.
    return { notes: raw };
  }
}
