import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'manager' | 'field_worker';

interface RoleContextType {
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isFieldWorker: boolean;
  /**
   * True only when the user has the field_worker role AND has neither admin
   * nor manager. Use this for UI gates that should restrict an admin from
   * seeing the field-worker-only experience even if they happen to also have
   * the field_worker role attached (e.g. an admin who clocks time
   * occasionally). The bare `isFieldWorker` check is the wrong gate for those
   * cases — it would hide admin tools from someone who is in fact an admin.
   */
  isFieldWorkerOnly: boolean;
  loading: boolean;
  refreshRoles: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      const roles = data?.map(r => r.role as AppRole) || [];
      setRoles(roles);
      setLoading(false); // Set loading false AFTER setting roles
    } catch (error) {
      console.error('🔒 RoleContext: Error loading roles:', error);
      setRoles([]);
      setLoading(false); // Set loading false AFTER setting empty roles
    }
  };

  useEffect(() => {
    loadRoles();
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);

  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');
  const isFieldWorker = hasRole('field_worker');

  return (
    <RoleContext.Provider
      value={{
        roles,
        hasRole,
        isAdmin,
        isManager,
        isFieldWorker,
        isFieldWorkerOnly: isFieldWorker && !isAdmin && !isManager,
        loading,
        refreshRoles: loadRoles,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRoles = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRoles must be used within RoleProvider');
  }
  return context;
};
