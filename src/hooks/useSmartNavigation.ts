import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/contexts/RoleContext';

/**
 * Smart navigation hook that routes users based on their roles.
 * Field-worker-ONLY users get the simplified /field-media routes; everyone
 * else (admins/managers — including an admin who also has the field_worker
 * role) gets the full /projects routes. Gated on isFieldWorkerOnly, not
 * isFieldWorker, per CLAUDE.md Gotcha #24: an admin who happens to clock time
 * is an admin first and should see admin surfaces.
 */
export function useSmartNavigation() {
  const navigate = useNavigate();
  const { isFieldWorkerOnly } = useRoles();

  const navigateToProjectMedia = (projectId: string) => {
    const path = isFieldWorkerOnly
      ? `/field-media/${projectId}`
      : `/projects/${projectId}/documents`;
    navigate(path);
  };

  const navigateToProjectDetail = (projectId: string) => {
    const path = isFieldWorkerOnly
      ? `/field-media/${projectId}`
      : `/projects/${projectId}`;
    navigate(path);
  };
  
  return { 
    navigateToProjectMedia, 
    navigateToProjectDetail 
  };
}
