import { QueryClient } from "@tanstack/react-query";

/**
 * The app's single TanStack Query client. Lives in its own module (not App.tsx)
 * so non-component code — utils, direct-write handlers — can invalidate cached
 * data without needing a hook.
 */
export const queryClient = new QueryClient();

/**
 * Call after ANY write that creates a project or changes one's status /
 * identity (status selector, bulk status, estimate approval, edit form, new
 * project / work order).
 *
 * A project's status decides where it shows up — time-entry and receipt
 * pickers, the field project list, dispatch, Today, dashboards, counts — and
 * those surfaces each cache under their own query key. Rather than maintain a
 * list of keys that silently goes stale every time someone adds a picker
 * (Gotcha #27's fanout class), mark EVERYTHING stale: queries on screen refetch
 * now, everything else refetches the next time it is shown. Project status
 * changes are rare, deliberate admin actions, so the cost is a handful of
 * requests a few times a day.
 */
export function refreshProjectDependentData(): void {
  void queryClient.invalidateQueries();
}

// --- Resume refresh -------------------------------------------------------
// A phone PWA is rarely "opened" — it is resumed from the background with
// every screen still mounted. TanStack already refetches a query on focus once
// its staleTime has passed, but several queries hold data for 5–30 minutes. If
// the app has been in the background for a while, treat everything as stale so
// the user never has to close and reopen the app to see a change made
// elsewhere (another device, another person). No realtime channel involved
// (Gotchas #53/#55) — this is plain refetch-on-return.
const RESUME_REFRESH_AFTER_MS = 2 * 60 * 1000;
let hiddenAt: number | null = null;

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    const awayMs = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    if (awayMs >= RESUME_REFRESH_AFTER_MS) {
      void queryClient.invalidateQueries();
    }
  });
}
