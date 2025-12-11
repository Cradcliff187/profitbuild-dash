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
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getCompanyBranding } from "@/utils/companyBranding";
import { supabase } from "@/integrations/supabase/client";

const logoIconDefault = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Large%20Icon%20Only.png';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: boolean;
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
        { title: "Time Approvals", url: "/time-entries", icon: ClipboardCheck, show: isAdmin || isManager },
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
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.url)}
                      isActive={active}
                      tooltip={collapsed && !isMobile ? item.title : undefined}
                      className={cn(
                        "cursor-pointer text-slate-300 hover:text-white hover:bg-slate-800",
                        collapsed ? "min-h-[36px] py-1.5" : "min-h-[44px] py-2.5",
                        active && "font-semibold bg-slate-800 text-white border-l-2 border-orange-500"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {(!collapsed || isMobile) && <span className="text-sm">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {showSeparator && !collapsed && <SidebarSeparator className="my-2 bg-slate-700" />}
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
    <Sidebar collapsible="icon" className="border-r border-slate-700 bg-slate-900">
      <SidebarRail />
      {/* Header with Logo */}
      <SidebarHeader className={cn(
        "border-b border-slate-700",
        collapsed ? "px-1 py-3" : "px-3 py-3"
      )}>
        <div className={cn(
          "flex items-center justify-between",
          collapsed && "flex-col gap-2 items-center"
        )}>
          <div className={cn(
            "flex items-center gap-2",
            collapsed && "flex-col gap-1.5 items-center"
          )}>
            <img
              src={logoIcon}
              alt={companyAbbr}
              className={cn(
                "shrink-0 rounded-lg object-cover",
                collapsed ? "h-8 w-8" : "h-7 w-7"
              )}
              onError={(e) => {
                e.currentTarget.src = logoIconDefault;
              }}
            />
            {collapsed ? (
              <span className="font-bold text-xs text-white text-center leading-tight">
                {companyAbbr}
              </span>
            ) : (
              <span className="font-bold text-base text-white">RCG Work</span>
            )}
          </div>
          {!collapsed && (
            <SidebarTrigger className="h-7 w-7 text-slate-400 hover:text-white" />
          )}
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="px-2 py-2 bg-slate-900">
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
      <SidebarFooter className="border-t border-slate-700 bg-slate-900">
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
              {!collapsed && (
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-medium truncate w-full text-white">
                    {user?.email?.split("@")[0] || "User"}
                  </span>
                  <span className="text-xs text-slate-400 truncate w-full">
                    {user?.email}
                  </span>
                </div>
              )}
              {!collapsed && <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => handleNavigation("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation("/kpi-guide")}>
              <BookOpen className="mr-2 h-4 w-4" />
              KPI Guide
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

