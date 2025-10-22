import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/contexts/RoleContext';

/**
 * Smart navigation hook that routes users based on their roles
 * Field workers use /field-media routes, others use /projects routes
 */
export function useSmartNavigation() {
  const navigate = useNavigate();
  const { isFieldWorker } = useRoles();
  
  const navigateToProjectMedia = (projectId: string) => {
    const path = isFieldWorker 
      ? `/field-media/${projectId}` 
      : `/projects/${projectId}/media`;
    navigate(path);
  };
  
  const navigateToProjectDetail = (projectId: string) => {
    const path = isFieldWorker 
      ? `/field-media/${projectId}` 
      : `/projects/${projectId}`;
    navigate(path);
  };
  
  return { 
    navigateToProjectMedia, 
    navigateToProjectDetail 
  };
}
