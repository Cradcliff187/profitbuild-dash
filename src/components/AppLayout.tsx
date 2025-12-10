import { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { supabase } from '@/integrations/supabase/client';

export default function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isFieldWorker, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

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
    return <BrandedLoader message="Loading..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 bg-slate-50/50">
          {/* Mobile header with trigger */}
          {isMobile && (
            <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:hidden">
              <SidebarTrigger />
              <span className="font-semibold">RCG Work</span>
            </header>
          )}
          
          {/* Main content area - pages render here */}
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

