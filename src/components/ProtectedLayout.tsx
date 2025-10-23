import { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Navigation from './Navigation';
import { supabase } from '@/integrations/supabase/client';

export default function ProtectedLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isFieldWorker, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Check if user must change password
  useEffect(() => {
    const checkPasswordChange = async () => {
      if (!authLoading && user && location.pathname !== '/change-password') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('id', user.id)
          .single();

        if (profile?.must_change_password) {
          navigate('/change-password', { replace: true });
        }
      }
    };

    checkPasswordChange();
  }, [user, authLoading, location.pathname, navigate]);

  // Redirect field workers from dashboard/projects to time tracker
  useEffect(() => {
    if (!authLoading && !rolesLoading && user && isFieldWorker) {
      // Redirect if they're on the dashboard or root
      if (location.pathname === '/' || location.pathname === '/dashboard') {
        navigate('/time-tracker', { replace: true });
      }
      // Block access to projects page (field workers use /field-media instead)
      if (location.pathname.startsWith('/projects')) {
        navigate('/time-tracker', { replace: true });
      }
    }
  }, [user, authLoading, rolesLoading, isFieldWorker, location.pathname, navigate]);

  if (authLoading || rolesLoading) {
    return <LoadingSpinner variant="page" message="Loading..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navigation />
      <main className="w-full mobile-safe-padding py-4 sm:py-6 md:py-8">
        <Outlet />
      </main>
    </>
  );
}