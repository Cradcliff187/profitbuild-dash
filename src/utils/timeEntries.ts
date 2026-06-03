/**
 * Shared definitions for the time-approval domain.
 *
 * Single source of truth so the table, the sidebar badge, and the page-tab badge
 * can never drift apart again (they previously used three different filters and
 * disagreed on what counted as a pending time entry).
 *
 * "Is this row a time/labor entry vs. a money expense?" is answered by the
 * DB-canonical generated column `expenses.is_time_entry`
 * (= category = 'labor_internal' OR start_time IS NOT NULL). Frontend code only
 * reads that column via `.eq('is_time_entry', true)` — it never re-derives the rule.
 */

/**
 * The overhead projects that represent paid time off (PTO). Single source of truth.
 * Previously hardcoded in six separate files. PTO entries are duration-only:
 * category 'labor_internal', no start_time/end_time, an hours value.
 */
export const PTO_PROJECT_NUMBERS = ['006-SICK', '007-VAC', '008-HOL'] as const;

/** True when a project number is one of the PTO overhead projects (Sick/Vacation/Holiday). */
export function isPTOProject(projectNumber?: string | null): boolean {
  return !!projectNumber && (PTO_PROJECT_NUMBERS as readonly string[]).includes(projectNumber);
}

/**
 * PostgREST `.or()` clause that excludes in-progress (running) timers from the
 * time-approval surfaces. An active timer is `start_time IS NOT NULL AND end_time IS NULL`
 * (clocked in, not yet clocked out) — a phantom "0h / $0.00" row that can't be
 * meaningfully approved. This clause keeps completed clocked entries (end_time set)
 * and PTO/manual entries (start_time null), and drops only active timers.
 * Always pair with `.eq('is_time_entry', true)`.
 */
export const EXCLUDE_ACTIVE_TIMERS_OR = 'end_time.not.is.null,start_time.is.null';

/** PostgREST `.or()` clause matching unapproved records (pending or null approval_status). */
export const PENDING_APPROVAL_OR = 'approval_status.is.null,approval_status.eq.pending';
