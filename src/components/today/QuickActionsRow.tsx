/**
 * Action-first quick actions on the Today home page.
 *
 * - "Log time" opens the existing field `CreateTimeEntryDialog` in place —
 *   the dialog owns restrict-to-current-user semantics internally
 *   (`restrictToCurrentUser={!isAdmin && !isManager}`), matching the
 *   MobileTimeTracker invocation.
 * - "Receipt" opens the existing `AddReceiptModal` in place (same contract
 *   MobileTimeTracker uses: open / onClose / onSuccess).
 * - "Note" navigates to the Notes tab page.
 * - "Time clock" keeps the live timer one tap away (navigation only — this
 *   page never embeds MobileTimeTracker; Gotcha #55).
 *
 * Gotcha #27: the in-place dialogs WRITE (expenses / receipts), so their
 * success callbacks invalidate the ThisWeekStrip query keys.
 *
 * Responsive: 2×2 grid on phones, one 4-across row on iPad (md:), back to
 * 2×2 inside the narrow lg: side rail. Tailwind breakpoints only — no
 * useIsMobile() (it breaks at 768px and mis-buckets iPads).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Receipt, StickyNote, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddReceiptModal } from "@/components/time-tracker/AddReceiptModal";
import { CreateTimeEntryDialog } from "@/components/time-tracker/CreateTimeEntryDialog";
import {
  TODAY_RECEIPTS_PENDING_KEY,
  TODAY_WEEK_TIME_KEY,
} from "./todayData";

export function QuickActionsRow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  // Defer-mount: AddReceiptModal fires its project queries on MOUNT (not on
  // open), and this page is a future post-login landing — keep first paint
  // free of dialog prefetches. Once opened, stay mounted so the Sheet's
  // close animation isn't cut off.
  const [receiptMounted, setReceiptMounted] = useState(false);
  const [logTimeMounted, setLogTimeMounted] = useState(false);

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Quick actions
      </h2>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-2">
        <Button
          className="h-14 min-h-[44px] text-sm font-semibold"
          onClick={() => {
            setLogTimeMounted(true);
            setLogTimeOpen(true);
          }}
        >
          <Clock className="h-5 w-5 mr-2" />
          Log time
        </Button>
        <Button
          variant="outline"
          className="h-14 min-h-[44px] text-sm font-semibold"
          onClick={() => {
            setReceiptMounted(true);
            setReceiptOpen(true);
          }}
        >
          <Receipt className="h-5 w-5 mr-2" />
          Receipt
        </Button>
        <Button
          variant="outline"
          className="h-14 min-h-[44px] text-sm font-semibold"
          onClick={() => navigate("/notes")}
        >
          <StickyNote className="h-5 w-5 mr-2" />
          Note
        </Button>
        <Button
          variant="outline"
          className="h-14 min-h-[44px] text-sm font-semibold"
          onClick={() => navigate("/time-tracker")}
        >
          <Timer className="h-5 w-5 mr-2" />
          Time clock
        </Button>
      </div>

      {/* In-place capture dialogs (existing components, reused untouched) */}
      {receiptMounted && (
        <AddReceiptModal
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: [TODAY_RECEIPTS_PENDING_KEY],
            });
            setReceiptOpen(false);
          }}
        />
      )}
      {logTimeMounted && (
        <CreateTimeEntryDialog
          open={logTimeOpen}
          onOpenChange={setLogTimeOpen}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: [TODAY_WEEK_TIME_KEY] });
            setLogTimeOpen(false);
          }}
        />
      )}
    </section>
  );
}
