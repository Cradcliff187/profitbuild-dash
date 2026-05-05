const STORAGE_KEY = "showSandboxProject";

export const SANDBOX_PROJECT_NUMBER = "SYS-TEST";

export const getShowSandboxProject = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) === "true";
};

export const setShowSandboxProject = (show: boolean): void => {
  localStorage.setItem(STORAGE_KEY, show ? "true" : "false");
};

/**
 * PostgREST `.or()` filter string scoping a `projects` query to:
 *   - category = 'construction' (always)
 *   - category IN ('construction', 'overhead') when `includeOverhead` is true
 *   - project_number = 'SYS-TEST' when the sandbox toggle is on (regardless of category)
 *
 * Use with the `.or()` builder, NOT `.eq()` — multiple `.or()` calls and
 * surrounding `.eq()` clauses still compose with AND semantics.
 *
 * Example:
 *   supabase.from('projects').select('*').or(getProjectCategoryOrFilter())
 *   supabase.from('projects').select('*').or(getProjectCategoryOrFilter({ includeOverhead: true }))
 *
 * For joined-table filters (e.g. `.eq('projects.category', 'construction')`)
 * pass the result through `.or(filter, { foreignTable: 'projects' })`.
 */
export const getProjectCategoryOrFilter = (
  opts: { includeOverhead?: boolean } = {}
): string => {
  const includeOverhead = opts.includeOverhead ?? false;
  const baseClause = includeOverhead
    ? "category.in.(construction,overhead)"
    : "category.eq.construction";

  return getShowSandboxProject()
    ? `${baseClause},project_number.eq.${SANDBOX_PROJECT_NUMBER}`
    : baseClause;
};

/**
 * Client-side predicate for filtering an already-fetched array of projects.
 * Mirrors `getProjectCategoryOrFilter` semantics for in-memory lists.
 */
export const isProjectVisibleByCategory = (
  project: { category?: string | null; project_number?: string | null },
  opts: { includeOverhead?: boolean } = {}
): boolean => {
  const includeOverhead = opts.includeOverhead ?? false;
  if (project.category === "construction") return true;
  if (includeOverhead && project.category === "overhead") return true;
  if (
    getShowSandboxProject() &&
    project.project_number === SANDBOX_PROJECT_NUMBER
  ) {
    return true;
  }
  return false;
};
