import { lazy, Suspense } from "react";
import Dashboard from "./Dashboard";
import { useRoles } from "@/contexts/RoleContext";
import { useDbFeatureFlag } from "@/hooks/useDbFeatureFlag";
import { BrandedLoader } from "@/components/ui/branded-loader";

const TodayHome = lazy(() => import("./TodayHome"));

/**
 * Route gate for "/" (PR 3, field-worker redesign).
 *
 * Field-only users with field_worker_v2 ON get the Today home AT "/" (their
 * post-login landing, per the locked IA: Today / Time / Receipts / Projects /
 * Notes). Everyone else gets the Dashboard exactly as before.
 *
 * AppLayout already blocks render until roles load, so isFieldWorkerOnly is
 * settled here. While the flag resolves for a field-only user we show the
 * loader instead of flashing the Dashboard (which they'd bounce off anyway).
 * Auth-loop discipline (Gotchas #53-56): no realtime, no getUser — the flag
 * hook is a plain TanStack query.
 */
const IndexGate = () => {
  const { isFieldWorkerOnly } = useRoles();
  const { enabled, isLoading } = useDbFeatureFlag("field_worker_v2");

  if (isFieldWorkerOnly) {
    if (isLoading) return <BrandedLoader message="Loading..." />;
    if (enabled) {
      return (
        <Suspense fallback={<BrandedLoader message="Loading..." />}>
          <TodayHome />
        </Suspense>
      );
    }
    // Flag off: AppLayout's allowlist effect bounces to /time-tracker.
    // Render nothing to avoid a Dashboard flash in the interim.
    return null;
  }

  return <Dashboard />;
};

export default IndexGate;
