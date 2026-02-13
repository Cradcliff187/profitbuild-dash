import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  Clock,
  Calculator,
  FileText,
  Package,
  Wrench,
  ClipboardCheck,
  Receipt,
  TrendingUp,
  BarChart3,
  UserCheck,
  Users,
  Camera,
  Settings,
  Shield,
  MessageSquare,
  GraduationCap,
  BookOpen,
  LogOut,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/contexts/RoleContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getCompanyBranding } from "@/utils/companyBranding";
import { supabase } from "@/integrations/supabase/client";
import { usePendingCounts } from "@/hooks/usePendingCounts";

const logoIconDefault = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/large%20icon%20only%20(2).png';
const logoHorizontalDefault = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/glossy%20full%20horizontal.png';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: boolean;
  badgeCount?: number;
}

interface NavGroup {
  label: string;
  abbrev: string; // For collapsed state
  items: NavItem[];
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const { isAdmin, isManager, isFieldWorker, roles } = useRoles();
  const { total: pendingCount } = usePendingCounts();

  const collapsed = state === "collapsed";
  
  // Dynamic Branding State
  const [logoIcon, setLogoIcon] = useState(logoIconDefault);
  const [companyAbbr, setCompanyAbbr] = useState('RCG');
  const [userFullName, setUserFullName] = useState<string | null>(null);

  useEffect(() => {
    // Load company branding
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
    const loadUserProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (data?.full_name) {
        setUserFullName(data.full_name);
      }
    };
    loadUserProfile();
  }, [user?.id]);

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Role-based access
  const hasFinancialAccess = roles.length === 0 || isAdmin || isManager;
  const hasClientAccess = roles.length === 0 || isAdmin || isManager;

  const navGroups: NavGroup[] = [
    {
      label: "CORE",
      abbrev: "C",
      items: [
        { title: "Dashboard", url: "/", icon: LayoutDashboard, show: hasFinancialAccess },
        { title: "Time Tracker", url: "/time-tracker", icon: Clock, show: true },
        { title: "My Training", url: "/training", icon: GraduationCap, show: true },
      ],
    },
    {
      label: "ESTIMATING",
      abbrev: "E",
      items: [
        { title: "Estimates", url: "/estimates", icon: Calculator, show: hasFinancialAccess },
        { title: "Quotes", url: "/quotes", icon: FileText, show: hasFinancialAccess },
        { title: "Bids", url: "/branch-bids", icon: Package, show: isAdmin || isManager },
      ],
    },
    {
      label: "OPERATIONS",
      abbrev: "O",
      items: [
        { title: "Projects", url: "/projects", icon: Building2, show: hasFinancialAccess },
        { title: "Work Orders", url: "/work-orders", icon: Wrench, show: hasFinancialAccess },
        { title: "Time Approvals", url: "/time-entries", icon: ClipboardCheck, show: isAdmin || isManager, badgeCount: pendingCount },
        { title: "Field Media", url: "/field-media", icon: Camera, show: true },
      ],
    },
    {
      label: "FINANCIALS",
      abbrev: "F",
      items: [
        { title: "Expenses & Invoices", url: "/expenses", icon: Receipt, show: hasFinancialAccess },
        { title: "Profit Analysis", url: "/profit-analysis", icon: TrendingUp, show: hasFinancialAccess },
        { title: "Reports", url: "/reports", icon: BarChart3, show: hasFinancialAccess },
      ],
    },
    {
      label: "CONTACTS",
      abbrev: "CO",
      items: [
        { title: "Clients", url: "/clients", icon: UserCheck, show: hasClientAccess },
        { title: "Payees", url: "/payees", icon: Users, show: hasClientAccess },
      ],
    },
  ];

  // Admin-only group - keep separate for role gating
  const adminGroup: NavGroup = {
    label: "ADMIN",
    abbrev: "A",
    items: [
      { title: "Role Management", url: "/role-management", icon: Shield, show: isAdmin },
      { title: "Send SMS", url: "/sms", icon: MessageSquare, show: isAdmin },
      { title: "Training Admin", url: "/training/admin", icon: GraduationCap, show: isAdmin },
    ],
  };

  const handleNavigation = (url: string) => {
    navigate(url);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const renderNavGroup = (group: NavGroup, showSeparator: boolean = true) => {
    const visibleItems = group.items.filter((item) => item.show !== false);
    if (visibleItems.length === 0) return null;

    return (
      <div key={group.label}>
        <SidebarGroup className={cn(collapsed && "p-1")}>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs uppercase text-slate-400 mb-1">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const active = isActive(item.url);
                const Icon = item.icon;
                const showBadge = !!(item.badgeCount && item.badgeCount > 0);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.url)}
                      isActive={active}
                      tooltip={collapsed && !isMobile ? `${item.title}${showBadge ? ` (${item.badgeCount})` : ''}` : undefined}
                      className={cn(
                        "cursor-pointer text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-150",
                        collapsed ? "min-h-[36px] py-1.5" : "min-h-[44px] py-2.5",
                        active && "font-semibold bg-orange-500/10 text-white border-l-[3px] border-orange-500"
                      )}
                    >
                      <div className="relative">
                        <Icon className="h-5 w-5 shrink-0" />
                        {collapsed && !isMobile && showBadge && (
                          <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-orange-500" />
                        )}
                      </div>
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="text-sm flex-1">{item.title}</span>
                          {showBadge && (
                            <Badge className="ml-auto h-5 min-w-[1.25rem] px-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white border-0">
                              {item.badgeCount}
                            </Badge>
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {showSeparator && !collapsed && <SidebarSeparator className="my-2 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />}
      </div>
    );
  };

  // Get user initials for avatar - prefer full name, fall back to email
  const userInitials = userFullName
    ? getInitials(userFullName)
    : user?.email
      ? user.email.substring(0, 2).toUpperCase()
      : "??";

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950">
      <SidebarRail />
      {/* Header with Logo */}
      <SidebarHeader className={cn(
        "border-b border-slate-700/50",
        collapsed ? "px-1 py-3" : "px-3 py-3"
      )}>
        <div className={cn(
          "flex items-center justify-between",
          collapsed && !isMobile && "flex-col gap-2 items-center"
        )}>
          {isMobile ? (
            <div className="flex items-center justify-center flex-1 min-w-0 h-10 overflow-hidden">
              <img
                src={logoHorizontalDefault}
                alt={companyAbbr}
                className="w-auto max-h-[72px] max-w-[90%] object-contain drop-shadow-md"
                onError={(e) => {
                  e.currentTarget.src = logoIconDefault;
                }}
              />
            </div>
          ) : collapsed ? (
            <div className="flex flex-col gap-1.5 items-center">
              <img
                src={logoIcon}
                alt={companyAbbr}
                className="shrink-0 rounded-lg object-cover h-9 w-9"
                onError={(e) => {
                  e.currentTarget.src = logoIconDefault;
                }}
              />
              <span className="font-bold text-xs text-white text-center leading-tight">
                {companyAbbr}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <img
                src={logoIcon}
                alt={companyAbbr}
                className="shrink-0 rounded-lg object-cover h-9 w-9"
                onError={(e) => {
                  e.currentTarget.src = logoIconDefault;
                }}
              />
              <span className="font-bold text-base text-white">RCG Work</span>
            </div>
          )}
          {!collapsed && (
            <SidebarTrigger className="h-7 w-7 text-slate-400 hover:text-white shrink-0" />
          )}
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="px-2 py-2">
        {/* Main navigation groups */}
        {navGroups.map((group, idx) =>
          renderNavGroup(group, idx < navGroups.length - 1)
        )}

        {/* Admin section - only shows if user has admin items visible */}
        {adminGroup.items.some(item => item.show) && (
          <>
            {!collapsed && <SidebarSeparator className="my-2" />}
            {renderNavGroup(adminGroup, false)}
          </>
        )}
      </SidebarContent>

      {/* Footer with User */}
      <SidebarFooter className="border-t border-slate-700 bg-slate-800/30">
        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full justify-start gap-3 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-slate-700 text-white text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {(!collapsed || isMobile) && (
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-medium truncate w-full text-white">
                    {userFullName || user?.email?.split("@")[0] || "User"}
                  </span>
                  <span className="text-xs text-slate-400 truncate w-full">
                    {user?.email}
                  </span>
                </div>
              )}
              {!collapsed && <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 z-[100]" 
            sideOffset={4}
            onCloseAutoFocus={(e) => {
              // Prevent focus issues on mobile
              if (isMobile) {
                e.preventDefault();
              }
            }}
          >
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                handleNavigation("/settings");
              }}
              className="cursor-pointer min-h-[44px]"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                handleNavigation("/kpi-guide");
              }}
              className="cursor-pointer min-h-[44px]"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              KPI Guide
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                signOut();
              }}
              className="cursor-pointer min-h-[44px]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

