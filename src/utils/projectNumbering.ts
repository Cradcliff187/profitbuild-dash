/**
 * Project numbering helpers (CLAUDE.md Rule 43).
 *
 * The database owns the sequence: `get_next_project_number()` mints, the
 * `advance_project_counter` trigger keeps `system_settings.project_counter`
 * in step with every number assigned outside the RPC, and
 * `set_next_project_number()` is the admin's "start the next project at …"
 * control. These helpers only parse what an admin types and format what the
 * DB returns — they never decide a number.
 */

export const PROJECT_NUMBER_PREFIX = '225';
/** The counter stores 225000 + sequence; 225205 ⇒ 225-205. */
export const PROJECT_COUNTER_BASE = 225000;

export interface ProjectNumberingStatus {
  counter: number;
  highest_sequence: number;
  highest_in_use: string | null;
  next_number: string;
}

/** 205 → "225-205"; 1000 → "225-1000" (never wraps at 999). */
export const formatProjectSequence = (sequence: number): string =>
  `${PROJECT_NUMBER_PREFIX}-${String(sequence).padStart(3, '0')}`;

/** 225205 → "225-205". */
export const formatProjectCounter = (counter: number): string =>
  formatProjectSequence(counter - PROJECT_COUNTER_BASE);

/**
 * Accepts what an admin would naturally type and returns the sequence, or
 * null when it isn't a project number:
 *   "225-210" → 210   "225 210" → 210   "210" → 210   "225210" → 210
 */
export const parseProjectSequenceInput = (raw: string): number | null => {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(new RegExp(`^${PROJECT_NUMBER_PREFIX}[-\\s](\\d{1,5})$`));
  if (m) return Number(m[1]);
  m = s.match(/^(\d{1,5})$/);
  if (m) return Number(m[1]);
  m = s.match(new RegExp(`^${PROJECT_NUMBER_PREFIX}(\\d{3,5})$`));
  if (m) return Number(m[1]);
  return null;
};

/**
 * Client-side mirror of set_next_project_number()'s guard so the Save button
 * can explain itself before the round-trip. The DB check is the real one.
 */
export const validateNextSequence = (
  sequence: number | null,
  highestInUse: number,
): string | null => {
  if (sequence === null) return `Enter a project number like ${formatProjectSequence(highestInUse + 1)}`;
  if (sequence < 1 || sequence > 99999) return 'Project numbers run from 225-001 to 225-99999';
  if (sequence <= highestInUse) {
    return `${formatProjectSequence(highestInUse)} is already in use — pick something higher`;
  }
  return null;
};
