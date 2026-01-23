import { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyBranding } from '@/utils/companyBranding';
import { useActivityTracker } from '@/hooks/useActivityTracker';

// Mobile menu trigger component (must be inside SidebarProvider)
function MobileMenuTrigger() {
  const { toggleSidebar } = useSidebar();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 text-slate-300 hover:text-white hover:bg-slate-800 shrink-0"
      onClick={toggleSidebar}
    >
      <Menu className="h-6 w-6" />
      <span className="sr-only">Open menu</span>
    </Button>
  );
}

const logoIconDefault = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Large%20Icon%20Only.png';

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  // Remove query params and hash
  const path = pathname.split('?')[0].split('#')[0];
  
  // Exact matches first
  const exactMatches: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/projects': 'Projects',
    '/work-orders': 'Work Orders',
    '/time-tracker': 'Time Tracker',
    '/time-entries': 'Time Entries',
    '/estimates': 'Estimates',
    '/quotes': 'Quotes',
    '/expenses': 'Expenses & Invoices',
    '/profit-analysis': 'Profit Analysis',
    '/reports': 'Reports',
    '/clients': 'Clients',
    '/payees': 'Payees',
    '/field-media': 'Field Media',
    '/branch-bids': 'Bids',
    '/role-management': 'Role Management',
    '/send-sms': 'Send SMS',
    '/training': 'My Training',
    '/settings': 'Settings',
    '/kpi-guide': 'KPI Guide',
  };
  
  if (exactMatches[path]) {
    return exactMatches[path];
  }
  
  // Pattern matches for dynamic routes (check more specific patterns first)
  if (path.startsWith('/training/admin')) {
    return 'Training Admin';
  }
  if (path.startsWith('/training/')) {
    return 'Training';
  }
  if (path.startsWith('/projects/')) {
    return 'Project Details';
  }
  if (path.startsWith('/field-media/')) {
    return 'Field Media';
  }
  if (path.startsWith('/field-schedule/')) {
    return 'Field Schedule';
  }
  if (path.startsWith('/branch-bids/')) {
    return 'Bid Details';
  }
  
  // Default fallback
  return 'RCG Work';
};

export default function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isFieldWorker, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [logoIcon, setLogoIcon] = useState(logoIconDefault);
  const [companyAbbr, setCompanyAbbr] = useState('RCG');
  
  // Track user activity
  useActivityTracker();
  
  // Get current page title
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    const loadBranding = async () => {
      const branding = await getCompanyBranding();
      if (branding) {
        if (branding.logo_icon_url) setLogoIcon(branding.logo_icon_url);
        if (branding.company_abbreviation) setCompanyAbbr(branding.company_abbreviation);
      }
    };
    loadBranding();
  }, []);

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
      <div className="flex min-h-screen w-full overflow-x-hidden max-w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 bg-slate-50/50">
          {/* Mobile header with trigger */}
          {isMobile && (
            <header className="flex h-16 items-center gap-3 border-b border-slate-700 bg-slate-900 px-4 lg:hidden shadow-sm">
              <img
                src={logoIcon}
                alt={companyAbbr}
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.src = logoIconDefault;
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base text-white truncate">
                  {pageTitle}
                </div>
              </div>
              <MobileMenuTrigger />
            </header>
          )}
          
          {/* Main content area - pages render here */}
          <main className={cn(
            "flex-1 overflow-auto w-full max-w-full box-border min-w-0",
            (location.pathname === '/time-tracker' || location.pathname === '/reports' || location.pathname.startsWith('/reports/')) ? '' : 'p-3 sm:p-4 md:p-6 lg:p-5'
          )} style={{ width: '100%', maxWidth: '100%' }}>
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

