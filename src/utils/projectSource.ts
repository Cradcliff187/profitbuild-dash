import { LEAD_SOURCES, LEAD_SOURCE_LABELS, type LeadSource } from '@/types/bid';

/**
 * Where a job came from (CLAUDE.md Rule 45). A project shares the lead source
 * vocabulary, minus "unknown": on a project, not knowing is simply NULL, shown
 * as "Not set". The DB CHECK still accepts 'unknown' so a value copied from a
 * lead can never fail, but the UI never offers it.
 */
export const PROJECT_SOURCES = LEAD_SOURCES.filter((s) => s !== 'unknown') as Exclude<LeadSource, 'unknown'>[];
export type ProjectSource = (typeof PROJECT_SOURCES)[number];

/** Filter value for "no source recorded". Not a DB value. */
export const SOURCE_NOT_SET = '__not_set__';

export const isSourceSet = (source: string | null | undefined): boolean =>
  !!source && source !== 'unknown';

export const formatProjectSource = (source: string | null | undefined): string | null => {
  if (!isSourceSet(source)) return null;
  return (
    LEAD_SOURCE_LABELS[source as LeadSource] ??
    source!.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  );
};

/**
 * One readable line: "Referral · Dana Reyes · met at the AIA mixer".
 * Returns null when nothing at all is recorded, so callers can render one
 * empty state instead of a row of dashes.
 */
export const formatProjectSourceLine = (input: {
  source: string | null | undefined;
  sourceDetail?: string | null;
  sourceContactName?: string | null;
}): string | null => {
  const parts = [
    formatProjectSource(input.source),
    input.sourceContactName?.trim() || null,
    input.sourceDetail?.trim() || null,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' · ') : null;
};

export interface ProjectPeopleValues {
  primary_contact_id: string | null;
  source: string | null;
  source_contact_id: string | null;
  source_detail: string | null;
}

/**
 * The write payload for the project's contact + source. Normalises blanks to
 * NULL and never writes 'unknown' (NULL is "not set" on a project).
 */
export const buildProjectPeoplePatch = (v: ProjectPeopleValues): ProjectPeopleValues => ({
  primary_contact_id: v.primary_contact_id || null,
  source: isSourceSet(v.source) ? v.source : null,
  source_contact_id: v.source_contact_id || null,
  source_detail: v.source_detail?.trim() || null,
});

/** Does a project pass the list's Source facet? Empty selection = everything. */
export const matchesSourceFilter = (
  projectSource: string | null | undefined,
  selected: string[],
): boolean => {
  if (selected.length === 0) return true;
  if (!isSourceSet(projectSource)) return selected.includes(SOURCE_NOT_SET);
  return selected.includes(projectSource!);
};

/**
 * Are the Rule 45 columns live in the database yet? Project rows are read with
 * `select('*')`, so before the migration the keys are simply absent
 * (`undefined`); after it they are present (`null` when empty). Every surface
 * that reads or writes these fields gates on this, so the app is safe to ship
 * ahead of the migration and lights up by itself once it is applied.
 */
export const hasProjectPeopleColumns = (project: object | null | undefined): boolean =>
  !!project && 'primary_contact_id' in project && 'source' in project;
