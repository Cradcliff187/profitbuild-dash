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
import { NotificationBell } from '@/components/notifications/NotificationBell';

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

const logoIconDefault = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/large%20icon%20only%20(2).png';

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
    '/leads': 'Leads',
    '/mentions': 'Mentions',
    '/role-management': 'Role Management',
    '/sms': 'Send SMS',
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
  if (path.startsWith('/leads/') || path.startsWith('/branch-bids/')) {
    return 'Lead Details';
  }
  
  // Default fallback
  return 'RCG Work';
};

export default function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  // Use isFieldWorkerOnly for redirects: an admin who happens to also have
  // the field_worker role attached (rare but possible) should not be bounced
  // to /time-tracker — they're an admin first. Only pure field workers get
  // role-based redirects.
  const { isFieldWorkerOnly, loading: rolesLoading } = useRoles();
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
    if (!user) return;
    const loadBranding = async () => {
      const branding = await getCompanyBranding();
      if (branding) {
        if (branding.logo_icon_url) setLogoIcon(branding.logo_icon_url);
        if (branding.company_abbreviation) setCompanyAbbr(branding.company_abbreviation);
      }
    };
    loadBranding();
  }, [user]);

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

  // Field-worker route allowlist (F2 May 2026).
  //
  // Switched from a denylist ("block /dashboard and /projects/...") to an
  // allowlist ("allow ONLY these routes; bounce everything else to
  // /time-tracker"). Future-proof: any new admin/manager route added later
  // is automatically blocked for field workers without touching this file.
  //
  // Allowed for field workers:
  //   /time-tracker[?tab=...]            — primary daily surface
  //   /training, /training/:id           — My Training + viewer
  //   /mentions                          — @mention notifications
  //   /field-media[/:id]                 — photo gallery + capture flows
  //   /projects                          — list (slim card variant)
  //   /projects/:id/schedule[?tab=...]   — canonical mobile schedule
  //   /projects/:id/capture(-video)?     — photo/video capture flows
  //   /settings                          — profile + preferences
  //   /change-password, /reset-password  — auth flows
  //
  // Everything else (/, /dashboard, /quotes, /expenses, /leads,
  // /profit-analysis, /reports, /clients, /payees, /estimates,
  // /work-orders, /role-management, /sms, /kpi-guide, /time-entries,
  // /projects/:id (overview), /projects/:id/expenses, /control, etc.)
  // → bounces to /time-tracker. App-layer enforcement only; the
  // canonical security boundary is database RLS, which is queued as a
  // separate hardening session per F2 finding.
  const isFieldWorkerAllowed = (path: string): boolean => {
    if (path === '/time-tracker') return true;
    if (path === '/mentions') return true;
    if (path === '/training') return true;
    if (path.startsWith('/training/')) return true;
    if (path === '/field-media') return true;
    if (path.startsWith('/field-media/')) return true;
    if (path === '/projects') return true;
    if (/^\/projects\/[^/]+\/schedule(\/|$)/.test(path)) return true;
    if (/^\/projects\/[^/]+\/capture(-video)?(\/|$)/.test(path)) return true;
    if (path === '/settings') return true;
    if (path === '/change-password') return true;
    if (path === '/reset-password') return true;
    return false;
  };

  useEffect(() => {
    if (!authLoading && !rolesLoading && user && isFieldWorkerOnly) {
      if (!isFieldWorkerAllowed(location.pathname)) {
        navigate('/time-tracker', { replace: true });
      }
    }
  }, [user, authLoading, rolesLoading, isFieldWorkerOnly, location.pathname, navigate]);

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
          {/* Mobile fixed header - stays pinned at top of viewport */}
          {isMobile && (
            <header className="fixed top-0 left-0 right-0 flex flex-col lg:hidden shadow-md z-40">
              <div className="flex h-16 items-center gap-3 border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4">
                <img
                  src={logoIcon}
                  alt={companyAbbr}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-md"
                  onError={(e) => {
                    e.currentTarget.src = logoIconDefault;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-white truncate tracking-tight">
                    {pageTitle}
                  </div>
                </div>
                <NotificationBell />
                <MobileMenuTrigger />
              </div>
              <div className="h-[3px] bg-gradient-to-r from-primary to-orange-400" />
            </header>
          )}

          {/* Main content area - pages render here */}
          <main className={cn(
            "flex-1 overflow-auto w-full max-w-full box-border min-w-0",
            (location.pathname === '/time-tracker' || location.pathname === '/reports' || location.pathname.startsWith('/reports/')) ? '' : 'p-3 sm:p-4 md:p-6 lg:p-5',
            isMobile && "pt-[67px]"
          )} style={{ width: '100%', maxWidth: '100%' }}>
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

