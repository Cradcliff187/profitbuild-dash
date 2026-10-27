import { useEffect, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scroll a container (and the window) back to the top whenever the route
 * changes by a user-initiated navigation (PUSH / REPLACE).
 *
 * Why this exists: the app's pages render inside their own scroll containers
 * (`AppLayout`'s `<main class="overflow-auto">`, and `ProjectDetailView`'s
 * inner scroller), NOT the document — so the browser's default "new page
 * starts at the top" never applies, and React Router v6 doesn't reset scroll
 * on its own. Tapping Receipts from the bottom of the Time page used to open
 * Receipts scrolled to the same offset.
 *
 * Browser Back/Forward (POP) is deliberately left alone so returning to a long
 * list keeps the reader's place.
 *
 * Keyed on pathname + search so `?tab=` sub-pages (field hub, Expenses tabs)
 * also start at the top.
 */
export function useScrollToTopOnNavigate(containerRef?: RefObject<HTMLElement | null>): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const key = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (navigationType === 'POP') return;
    const el = containerRef?.current;
    if (el) {
      try {
        el.scrollTo({ top: 0, left: 0 });
      } catch {
        el.scrollTop = 0;
      }
    }
    try {
      window.scrollTo({ top: 0, left: 0 });
    } catch {
      // jsdom / very old browsers
    }
    // Intentionally keyed on the route key, not navigationType, so a pure
    // navigationType change never re-fires this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
