import type { ConfirmDialogOptions } from '@/components/ui/confirm-dialog';
import type { OverlapCheckResult } from '@/utils/timeEntryValidation';

/**
 * Builds the ConfirmDialogOptions for an overlap warning so every time-entry
 * surface (create/edit wrappers, admin sheets, clock-out) renders the same
 * dialog. `question` is the surface-specific ask ("Continue saving?" etc.).
 *
 * When checkTimeOverlap's query itself failed (checkFailed — fail-closed
 * path), there are no structured entries to show; use honest copy instead of
 * pretending an overlap was found.
 */
export function overlapConfirmOptions(
  result: OverlapCheckResult,
  question: string
): ConfirmDialogOptions {
  if (result.checkFailed) {
    return {
      title: "Couldn't verify overlaps",
      description:
        "We couldn't check this entry against existing time entries. Save anyway?",
      confirmLabel: 'Save anyway',
    };
  }

  return {
    title: 'Overlapping time entry',
    description: question,
    body: (
      <ul className="space-y-1.5 text-sm">
        {(result.overlappingEntries ?? []).map((entry) => (
          <li
            key={entry.id}
            className="rounded-md border bg-muted/40 px-3 py-2"
          >
            <span className="font-medium tabular-nums">
              {entry.startTime} – {entry.endTime}
            </span>
            {entry.projectName && (
              <span className="text-muted-foreground"> · {entry.projectName}</span>
            )}
            <div className="truncate text-xs text-muted-foreground">
              {entry.description}
            </div>
          </li>
        ))}
      </ul>
    ),
    confirmLabel: 'Save anyway',
  };
}
