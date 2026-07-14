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
 * FieldTimeLanding; the timer lives on at /time-tracker/timer (TimerPage).
 * Everyone else — admins, managers, and flag-off field workers — gets the
 * unchanged timer-first MobileTimeTracker, exactly as before.
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
