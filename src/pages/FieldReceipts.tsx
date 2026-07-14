/**
 * Field-worker Receipts page (`/receipts`).
 *
 * Thin shell over the existing time-tracker receipt machinery: a primary
 * "Add receipt" button opening the shared `AddReceiptModal`, with the user's
 * receipts below via the shared `ReceiptsList` (self-contained: search,
 * filters, windowed rendering, its own edit/delete flows).
 *
 * Gate: DB feature flag `field_worker_v2` (per-user override aware). While
 * flag/roles resolve → render nothing (no flash). Flag off → field-worker-only
 * users go to `/time-tracker`, everyone else to `/`.
 *
 * Auth-loop danger zone rules (Gotchas #53–56/#63): no realtime, no
 * `supabase.auth.getUser()` — the flag hook reads `useAuth()` internally.
 * Layout is Tailwind-breakpoint driven (mobile 390px AND iPad 768/1024px),
 * never `useIsMobile()`.
 */

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { useRoles } from "@/contexts/RoleContext";
import { useDbFeatureFlag } from "@/hooks/useDbFeatureFlag";
import { receiptQueryKeys } from "@/hooks/useReceiptsData";
import { AddReceiptModal } from "@/components/time-tracker/AddReceiptModal";
import { ReceiptsList } from "@/components/time-tracker/ReceiptsList";

export default function FieldReceipts() {
  const queryClient = useQueryClient();
  const { enabled: flagEnabled, isLoading: flagLoading } =
    useDbFeatureFlag("field_worker_v2");
  const { isFieldWorkerOnly, loading: rolesLoading } = useRoles();
  const [showAddModal, setShowAddModal] = useState(false);

  if (flagLoading || rolesLoading) return null;
  if (!flagEnabled) {
    return <Navigate to={isFieldWorkerOnly ? "/time-tracker" : "/"} replace />;
  }

  return (
    // pb-24 keeps the last rows clear of the fixed FieldTabBar the
    // orchestrator mounts as a sibling (Gotcha #41 / Rule 14 padding pattern).
    <MobilePageWrapper className="pb-24">
      <div className="max-w-2xl md:max-w-3xl mx-auto space-y-4">
        <header className="px-4 sm:px-0">
          <h1 className="text-2xl font-bold leading-tight">Receipts</h1>
          <p className="text-sm text-muted-foreground">
            Snap and file receipts for your purchases
          </p>
        </header>

        {/* Primary capture affordance — big, thumb-reachable */}
        <div className="px-4 sm:px-0">
          <Button
            className="w-full h-14 text-base font-semibold"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add receipt
          </Button>
        </div>

        {/* Shared receipts list — self-contained (search/filter/sort/edit) */}
        <ReceiptsList />
      </div>

      <AddReceiptModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          // Gotcha #27 fanout: the list reads ['field-receipts']; the admin
          // surfaces read the receiptQueryKeys.all prefix. Invalidate both —
          // same pair ReceiptsList's own loadReceipts() covers.
          queryClient.invalidateQueries({ queryKey: ["field-receipts"] });
          queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all });
          setShowAddModal(false);
        }}
      />
    </MobilePageWrapper>
  );
}
