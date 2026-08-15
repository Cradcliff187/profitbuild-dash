/**
 * Field-worker bottom tab bar — five persistent destinations.
 *
 * Pure presentational: no role/flag gating inside (the orchestrator mounts it
 * conditionally), no data fetching, no writes.
 *
 * Per Gotcha #41: built `position: fixed bottom-0` and fully self-contained —
 * it must be mounted as a SIBLING of any scroll container / MobilePageWrapper,
 * never as a child, or iOS Safari anchors it to the wrapper instead of the
 * viewport. Content behind it needs bottom padding (pb-20/pb-24) on the page.
 *
 * Note: `pb-safe` is now a real utility (defined in index.css, Aug 2026) that
 * emits the same env(safe-area-inset-bottom) as the arbitrary value below —
 * both are equivalent for standalone use on a fixed bottom bar.
 */

import { useLocation, useNavigate } from "react-router-dom";
import { Clock, HardHat, Home, Receipt, StickyNote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldTab {
  label: string;
  path: string;
  icon: LucideIcon;
  /** '/' must match exactly; everything else matches by prefix. */
  exact?: boolean;
}

const TABS: FieldTab[] = [
  { label: "Today", path: "/", icon: Home, exact: true },
  { label: "Time", path: "/time-tracker", icon: Clock },
  { label: "Receipts", path: "/receipts", icon: Receipt },
  { label: "Projects", path: "/my-projects", icon: HardHat },
  { label: "Notes", path: "/notes", icon: StickyNote },
];

function isTabActive(tab: FieldTab, pathname: string): boolean {
  if (tab.exact) return pathname === tab.path;
  return pathname === tab.path || pathname.startsWith(`${tab.path}/`);
}

export function FieldTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Field navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-background/95 backdrop-blur-sm border-t shadow-lg",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      {/* Tab row is width-capped and centered so the bar reads as a tab
          cluster on iPad (768–1024px) instead of a stretched phone strip.
          Layout is pure Tailwind breakpoints — never useIsMobile() (it breaks
          at 768, putting iPads on the desktop side). */}
      <div className="grid grid-cols-5 mx-auto w-full max-w-md md:max-w-xl">
        {TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5",
                "min-h-[56px] py-1.5 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground active:bg-accent/50"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
