/**
 * "Own time entries" resolution — shared by every field-facing reader of the
 * signed-in user's time (Today week strip, Time tab week/day/recent lists,
 * last-worked-project fallback).
 *
 * Ownership in this app is the LINKED PAYEE, not `expenses.user_id`: every
 * expenses RLS edit policy resolves through `is_linked_payee(auth.uid(),
 * payee_id)` (Rule 11 — the auth user ↔ internal payee bridge is
 * `payees.user_id`). Rows entered by an admin on the worker's behalf, or by
 * the same person under a second auth account (both linked to one payee),
 * carry the right `payee_id` but a DIFFERENT `user_id` — so filtering on
 * `eq('user_id', me)` alone undercounts weekly Paid Hours and shows amber
 * "no time logged" dots on days that were logged.
 *
 * The fix is to match on either: `user_id = me OR payee_id IN (my linked
 * payees)`. A user can have multiple linked payees (internal W-2 shadow AND
 * a labor-providing subcontractor record — Gotcha #68), hence the list.
 *
 * House rules (Gotchas #53/#63): callers pass the user id from `useAuth()`
 * context — never `supabase.auth.getUser()`; errors are thrown (Gotcha #16).
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * The signed-in user's linked payee ids (`payees.user_id = userId`). RLS lets
 * every user read their own linkage; the result is typically 0–2 rows.
 */
export async function fetchMyPayeeIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("payees")
    .select("id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((p) => p.id);
}

/**
 * PostgREST `.or(...)` filter string selecting the user's own time-entry rows:
 * `user_id.eq.<me>,payee_id.in.(<ids>)` — or plain `user_id.eq.<me>` when the
 * user has no linked payees (an empty `in.()` is a PostgREST syntax error).
 *
 * Use via `.or(ownTimeEntriesOrFilter(userId, payeeIds))` — never rebuild this
 * string inline, so the readers can't drift.
 */
export function ownTimeEntriesOrFilter(
  userId: string,
  payeeIds: string[]
): string {
  if (payeeIds.length === 0) return `user_id.eq.${userId}`;
  return `user_id.eq.${userId},payee_id.in.(${payeeIds.join(",")})`;
}
