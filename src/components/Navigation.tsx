import { NavLink } from "react-router-dom";
import { Building2, FileText, Calculator, Receipt, TrendingUp, Users, Wrench, Settings, Menu, MoreHorizontal, ChevronDown, LogOut, User, UserCheck, Download, Clock, ClipboardCheck, Camera } from "lucide-react";
import logoFullDefault from '@/assets/branding/logo-full-horizontal.svg';
import logoIconDefault from '@/assets/branding/logo-icon-only.svg';
import { getCompanyBranding } from '@/utils/companyBranding';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { isIOSDevice, isPWAInstalled } from "@/utils/platform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Navigation = () => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin, isManager, isFieldWorker, roles } = useRoles();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  
  // Dynamic Branding State
  const [logoFull, setLogoFull] = useState(logoFullDefault);
  const [logoIcon, setLogoIcon] = useState(logoIconDefault);
  const [companyAbbr, setCompanyAbbr] = useState('RCG');
  const [primaryColor, setPrimaryColor] = useState('#1b2b43');

  useEffect(() => {
    // Load company branding
    const loadBranding = async () => {
      const branding = await getCompanyBranding();
      if (branding) {
        if (branding.logo_full_url) setLogoFull(branding.logo_full_url);
        if (branding.logo_icon_url) setLogoIcon(branding.logo_icon_url);
        if (branding.company_abbreviation) setCompanyAbbr(branding.company_abbreviation);
        if (branding.primary_color) setPrimaryColor(branding.primary_color);
      }
    };
    loadBranding();
  }, []);

  useEffect(() => {
    // Check if already installed
    if (isPWAInstalled()) {
      setIsInstalled(true);
      return;
    }

    // For iOS devices, show install link if not installed
    if (isIOSDevice()) {
      setShowIOSInstall(true);
      return;
    }

    // For non-iOS, use the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Filter navigation based on roles
  const hasFinancialAccess = roles.length === 0 || isAdmin || isManager;
  const hasClientAccess = roles.length === 0 || isAdmin || isManager;
  
  // Primary items (always visible on larger screens)
  const primaryItems = [
    { to: "/", label: "Dashboard", icon: Building2, show: hasFinancialAccess },
    { to: "/projects", label: "Projects", icon: Building2, show: hasFinancialAccess },
    { to: "/time-tracker", label: "Time Tracker", icon: Clock, show: true },
    { to: "/field-media", label: "Field Media", icon: Camera, show: isFieldWorker },
    { to: "/estimates", label: "Estimates", icon: Calculator, show: hasFinancialAccess },
    { to: "/expenses", label: "Expenses", icon: Receipt, show: hasFinancialAccess },
  ].filter(item => item.show);

  // Secondary items (grouped under "More" dropdown)
  const secondaryItems = [
    { to: "/work-orders", label: "Work Orders", icon: Wrench, show: hasFinancialAccess },
    { to: "/time-entries", label: "Time Management", icon: ClipboardCheck, show: isAdmin || isManager },
    { to: "/quotes", label: "Quotes", icon: FileText, show: hasFinancialAccess },
    { to: "/payees", label: "Payees", icon: Users, show: hasClientAccess },
    { to: "/clients", label: "Clients", icon: UserCheck, show: hasClientAccess },
    { to: "/profit-analysis", label: "Profit Analysis", icon: TrendingUp, show: hasFinancialAccess },
    { to: "/settings", label: "Settings", icon: Settings, show: true },
    { to: "/role-management", label: "Role Management", icon: Settings, show: isAdmin },
  ].filter(item => item.show);

  const allItems = [...primaryItems, ...secondaryItems];

  const NavItem = ({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: any; onClick?: () => void }) => (
      <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
          `flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </>
        )}
      </NavLink>
  );

  return (
    <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-card/95" aria-label="Main navigation">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center py-2">
            {/* Desktop: Full horizontal logo */}
            <img 
              src={logoFull} 
              alt="Radcliff Construction Group" 
              className="hidden md:block h-16 w-auto transition-opacity hover:opacity-90"
              style={{ maxWidth: '280px' }}
            />
            
            {/* Tablet: Medium full logo */}
            <img 
              src={logoFull} 
              alt="Radcliff Construction Group" 
              className="hidden sm:block md:hidden h-12 w-auto transition-opacity hover:opacity-90"
              style={{ maxWidth: '220px' }}
            />
            
            {/* Mobile: Icon + brand text */}
            <div className="flex items-center space-x-2 sm:hidden">
              <img 
                src={logoIcon} 
                alt={companyAbbr} 
                className="h-10 w-10"
              />
              <span className="text-sm font-bold" style={{ color: primaryColor }}>{companyAbbr}</span>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          {isMobile ? (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col space-y-2 mt-6">
                {allItems.map(({ to, label, icon: Icon }) => (
                  <NavItem 
                    key={to} 
                    to={to} 
                    label={label} 
                    icon={Icon} 
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
                
                {/* Install Link for Mobile */}
                {!isInstalled && showIOSInstall && (
                  <NavItem 
                    to="/install" 
                    label="Install App" 
                    icon={Download} 
                    onClick={() => setMobileMenuOpen(false)}
                  />
                )}
                
                {/* Mobile User Section */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
              </SheetContent>
            </Sheet>
          ) : (
            /* Desktop Navigation */
            <div className="flex items-center space-x-1">
              {/* Primary Items */}
              {primaryItems.map(({ to, label, icon: Icon }) => (
                <NavItem key={to} to={to} label={label} icon={Icon} />
              ))}
              

              {/* More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground hover:bg-muted hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4 mr-1" />
                    More
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {secondaryItems.map(({ to, label, icon: Icon }) => (
                    <DropdownMenuItem key={to} asChild>
                      <NavLink
                        to={to}
                        className="flex items-center space-x-2 px-2 py-2 text-sm font-medium cursor-pointer w-full"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </NavLink>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground hover:bg-muted hover:text-foreground">
                    <User className="h-4 w-4 mr-1" />
                    Profile
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;