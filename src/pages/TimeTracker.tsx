import { lazy, Suspense } from 'react';
import { MobileTimeTracker } from '@/components/time-tracker/MobileTimeTracker';
import { useRoles } from '@/contexts/RoleContext';
import { useDbFeatureFlag } from '@/hooks/useDbFeatureFlag';
import { BrandedLoader } from '@/components/ui/branded-loader';

const FieldTimeLanding = lazy(() => import('./FieldTimeLanding'));

/**
 * /time-tracker (PR 3, field-worker redesign).
 *
 * Field-only users with field_worker_v2 ON get the entry-first
 * FieldTimeLanding. Everyone else — admins, managers, and flag-off field
 * workers — gets MobileTimeTracker (Entries + Receipts). The live timer and
 * its /time-tracker/timer escape hatch were retired Sep 9 2026 (Gotcha #79).
 *
 * Auth-loop discipline (Gotchas #53-56): the flag hook is a plain TanStack
 * query; no realtime, no getUser on this path.
 */
const TimeTracker = () => {
  const { isFieldWorkerOnly } = useRoles();
  const { enabled, isLoading } = useDbFeatureFlag('field_worker_v2');

  if (isFieldWorkerOnly) {
    if (isLoading) return <BrandedLoader message="Loading..." />;
    if (enabled) {
      return (
        <Suspense fallback={<BrandedLoader message="Loading..." />}>
          <FieldTimeLanding />
        </Suspense>
      );
    }
  }

  return <MobileTimeTracker />;
};

export default TimeTracker;
