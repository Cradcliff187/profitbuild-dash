/**
 * Compact "This week" summary card on the Today home page.
 *
 * - Paid Hours logged Mon..Sun (Gotcha #17: `expenses.hours` = Paid Hours —
 *   never "total"/"worked" hours), own rows only (`user_id = auth user`,
 *   `is_time_entry = true` — Gotcha #68: is_time_entry, not category).
 * - 7 day-dots Mon..Sun, states defined once in `field-time/weekDayState.ts`
 *   and shared with the Time tab's `WeeklySummary`: filled = time logged;
 *   amber outline = a FINISHED day with nothing logged (weekday, or any day
 *   with an assignment via `crew_day_assignments_field_view`, Rule 34); muted
 *   otherwise. Today is never amber — it's still in progress. Today gets a
 *   subtle ring.
 * - Each dot is a ≥44px tap target that opens that day on the Time tab
 *   (`/time-tracker?date=…`). Today surfaces the gap; Time owns the fix, so
 *   the approval/lock rules live in exactly one place. Nothing is edited here.
 * - Receipts pending: own receipts with approval_status NULL or 'pending'.
 * - Unread: `useUnreadMentions` (realtime already disabled in that hook).
 *   Interpretation note: there is no per-note read tracking in the schema —
 *   mention notifications ARE the "unread notes" concept, so the unread count
 *   here is the unread-mention count.
 *
 * All plain useQuery, staleTime 60s, refetchOnWindowFocus — zero realtime,
 * zero writes (the counts links only navigate).
 *
 * Responsive: stacked on phones; on iPad (md:) hours / dots / counts share
 * one row; back to stacked inside the narrow lg: side rail. Tailwind
 * breakpoints only — no useIsMobile().
 */

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AtSign, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMentions } from "@/hooks/useUnreadMentions";
import { formatDateForDB, parseDateOnly } from "@/utils/dateUtils";
import {
  getWeekDayState,
  WEEK_DAY_DOT_CLASS,
  WEEK_DAY_STATE_LABEL,
} from "@/components/field-time/weekDayState";
import {
  TODAY_RECEIPTS_PENDING_KEY,
  TODAY_WEEK_ASSIGNMENTS_KEY,
  TODAY_WEEK_TIME_KEY,
} from "./todayData";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Month/day for the spoken label, e.g. "Jul 21". */
function shortDate(iso: string): string {
  return parseDateOnly(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Mon..Sun of the week containing `todayISO`, as YYYY-MM-DD strings. */
function getWeekDays(todayISO: string): string[] {
  const today = parseDateOnly(todayISO);
  const daysSinceMonday = (today.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDateForDB(d);
  });
}

interface ThisWeekStripProps {
  userId: string | undefined;
  /** YYYY-MM-DD for today (page already computes it — keeps the two in sync). */
  todayISO: string;
}

export function ThisWeekStrip({ userId, todayISO }: ThisWeekStripProps) {
  const navigate = useNavigate();
  const weekDays = getWeekDays(todayISO);
  const mondayISO = weekDays[0];
  const sundayISO = weekDays[6];

  // Own time entries this week (one worker-week — far below the row cap).
  const timeQuery = useQuery({
    queryKey: [TODAY_WEEK_TIME_KEY, userId, mondayISO],
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("expense_date, hours")
        .eq("user_id", userId)
        .eq("is_time_entry", true)
        .gte("expense_date", mondayISO)
        .lte("expense_date", sundayISO);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Own assignments this week (RLS scopes the view; .eq is belt-and-suspenders).
  const assignmentsQuery = useQuery({
    queryKey: [TODAY_WEEK_ASSIGNMENTS_KEY, userId, mondayISO],
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crew_day_assignments_field_view")
        .select("work_date")
        .eq("user_id", userId)
        .gte("work_date", mondayISO)
        .lte("work_date", sundayISO);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Own receipts awaiting approval (count only — head request).
  const receiptsQuery = useQuery({
    queryKey: [TODAY_RECEIPTS_PENDING_KEY, userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("receipts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .or("approval_status.is.null,approval_status.eq.pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { unreadCount } = useUnreadMentions();

  const paidHours = (timeQuery.data ?? []).reduce(
    (sum, row) => sum + (row.hours ?? 0),
    0
  );
  const daysWithEntries = new Set(
    (timeQuery.data ?? []).map((r) => r.expense_date).filter(Boolean)
  );
  const daysWithAssignments = new Set(
    (assignmentsQuery.data ?? []).map((r) => r.work_date).filter(Boolean)
  );

  const loading = timeQuery.isPending || assignmentsQuery.isPending;

  return (
    <Card className="p-4">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <div className="md:flex md:items-center md:justify-between md:gap-6 lg:block">
          {/* Paid Hours headline */}
          <div className="flex items-baseline justify-between mb-3 md:mb-0 md:block lg:flex lg:mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              This week
            </h2>
            <div>
              <span className="text-xl font-bold tabular-nums">
                {paidHours.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                paid hrs
              </span>
            </div>
          </div>

          {/* Day dots Mon..Sun. Today SIGNALS the gap; the Time tab fixes it —
              tapping a day opens it there rather than editing in place, so the
              approval/lock rules live in exactly one surface. */}
          <div
            className="flex items-stretch justify-between gap-1 mb-3 md:mb-0 md:flex-1 md:max-w-xs lg:max-w-none lg:mb-3"
            role="group"
            aria-label="Days this week"
          >
            {weekDays.map((iso, i) => {
              const state = getWeekDayState({
                day: iso,
                todayISO,
                hasEntry: daysWithEntries.has(iso),
                hasAssignment: daysWithAssignments.has(iso),
              });
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => navigate(`/time-tracker?date=${iso}`)}
                  aria-label={`${DAY_NAMES[i]}, ${shortDate(iso)} — ${
                    WEEK_DAY_STATE_LABEL[state]
                  }`}
                  className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-lg transition-colors hover:bg-accent/50 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-full",
                      WEEK_DAY_DOT_CLASS[state],
                      isToday &&
                        "ring-2 ring-primary/40 ring-offset-1 ring-offset-card"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px]",
                      isToday
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {DAY_LETTERS[i]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pending counts — navigation-only taps */}
          <div className="grid grid-cols-2 gap-2 md:w-64 lg:w-auto">
            <button
              type="button"
              onClick={() => navigate("/receipts")}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 min-h-[44px] text-left hover:bg-accent/50 active:bg-accent transition-colors"
            >
              <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs">
                <span className="font-semibold tabular-nums">
                  {receiptsQuery.data ?? 0}
                </span>{" "}
                <span className="text-muted-foreground">
                  receipt{(receiptsQuery.data ?? 0) === 1 ? "" : "s"} pending
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/mentions")}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 min-h-[44px] text-left hover:bg-accent/50 active:bg-accent transition-colors"
            >
              <AtSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs">
                <span className="font-semibold tabular-nums">{unreadCount}</span>{" "}
                <span className="text-muted-foreground">unread</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
