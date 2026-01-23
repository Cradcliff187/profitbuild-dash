# Navigation Overhaul Specification

## Executive Summary

Replace the current top header navigation with a persistent left sidebar following construction software standards (Procore, Buildertrend). Project detail pages will use a secondary panel for contextual navigation, and the Reports page will convert to tab-based filtering.

---

## Current State Analysis

### Existing Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Navigation.tsx` | Top of every page | Primary nav + "More" dropdown + Profile |
| `ProjectSidebar.tsx` | `/projects/:id/*` routes | Context nav within project |
| `ReportsSidebar.tsx` | `/reports` route | Category filtering |
| `ProtectedLayout` | Wraps authenticated routes | Auth guard + Navigation header |

### Current Problems

1. **"More" dropdown overload** — 14 items crammed together
2. **Inconsistent mental model** — Header everywhere, sidebars appear/disappear
3. **Duplicate concepts** — "Time Management" vs "Time Tracker"
4. **Admin clutter** — SMS, Training Admin mixed with daily-use items
5. **No information architecture** — Financial items scattered

---

## Target Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────┐  ┌────────────────────────────────────────────┐│
│  │             │  │                                            ││
│  │   APP       │  │  ┌─────────────┐  ┌──────────────────────┐ ││
│  │   SIDEBAR   │  │  │  SECONDARY  │  │                      │ ││
│  │             │  │  │   PANEL     │  │   MAIN CONTENT       │ ││
│  │  (Always)   │  │  │             │  │                      │ ││
│  │             │  │  │ (Project    │  │                      │ ││
│  │             │  │  │  context    │  │                      │ ││
│  │             │  │  │  only)      │  │                      │ ││
│  │             │  │  │             │  │                      │ ││
│  │             │  │  └─────────────┘  └──────────────────────┘ ││
│  │             │  │                                            ││
│  └─────────────┘  └────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Desktop: App Sidebar (240px) + Secondary Panel (200px when active) + Content
Mobile:  Hamburger → Full Sheet with grouped nav
```

---

## New Component Structure

### 1. AppSidebar (`src/components/AppSidebar.tsx`)

**Purpose:** Replaces `Navigation.tsx` as the primary app navigation

```tsx
// src/components/AppSidebar.tsx
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
  
  // Role-based access
  const hasFinancialAccess = roles.length === 0 || isAdmin || isManager;
  const hasClientAccess = roles.length === 0 || isAdmin || isManager;

  const navGroups: NavGroup[] = [
    {
      label: "CORE",
      abbrev: "C",
      items: [
        { title: "Dashboard", url: "/", icon: LayoutDashboard, show: hasFinancialAccess },
        { title: "Projects", url: "/projects", icon: Building2, show: hasFinancialAccess },
        { title: "Time Tracker", url: "/time-tracker", icon: Clock, show: true },
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
        { title: "Work Orders", url: "/work-orders", icon: Wrench, show: hasFinancialAccess },
        { title: "Time Approvals", url: "/time-entries", icon: ClipboardCheck, show: isAdmin || isManager },
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
    {
      label: "FIELD",
      abbrev: "FD",
      items: [
        { title: "Field Media", url: "/field-media", icon: Camera, show: isAdmin || isFieldWorker },
      ],
    },
  ];

  // Admin-only group
  const adminGroup: NavGroup = {
    label: "ADMIN",
    abbrev: "A",
    items: [
      { title: "Settings", url: "/settings", icon: Settings, show: true },
      { title: "Role Management", url: "/role-management", icon: Shield, show: isAdmin },
      { title: "Send SMS", url: "/send-sms", icon: MessageSquare, show: isAdmin },
      { title: "Training Admin", url: "/training-admin", icon: GraduationCap, show: isAdmin },
    ],
  };

  // Help group
  const helpGroup: NavGroup = {
    label: "HELP",
    abbrev: "H",
    items: [
      { title: "KPI Guide", url: "/kpi-guide", icon: BookOpen, show: isAdmin || isManager },
      { title: "My Training", url: "/my-training", icon: GraduationCap, show: true },
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
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase text-muted-foreground mb-1">
            {collapsed ? group.abbrev : group.label}
          </SidebarGroupLabel>
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
                      tooltip={collapsed ? item.title : undefined}
                      className={cn(
                        "cursor-pointer min-h-[44px] py-2.5",
                        active && "font-semibold bg-accent/50 border-l-2 border-primary"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {showSeparator && <SidebarSeparator className="my-2" />}
      </div>
    );
  };

  // Get user initials for avatar
  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "??";

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Header with Logo */}
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src="https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Large%20Icon%20Only.png"
            alt="RCG"
            className="h-8 w-8 shrink-0"
          />
          {!collapsed && (
            <span className="font-bold text-lg text-primary">RCG Work</span>
          )}
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="px-2 py-2">
        {navGroups.map((group, idx) =>
          renderNavGroup(group, idx < navGroups.length - 1)
        )}

        <SidebarSeparator className="my-2" />

        {/* Admin Section */}
        {renderNavGroup(adminGroup, true)}

        {/* Help Section */}
        {renderNavGroup(helpGroup, false)}
      </SidebarContent>

      {/* Footer with User */}
      <SidebarFooter className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full justify-start gap-3 px-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-medium truncate w-full">
                    {user?.email?.split("@")[0] || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-full">
                    {user?.email}
                  </span>
                </div>
              )}
              {!collapsed && <ChevronUp className="h-4 w-4 shrink-0" />}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
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
```

---

### 2. AppLayout (`src/components/AppLayout.tsx`)

**Purpose:** Wraps the entire app in a single SidebarProvider

```tsx
// src/components/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          {/* Mobile header with trigger */}
          {isMobile && (
            <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
              <SidebarTrigger />
              <span className="font-semibold">RCG Work</span>
            </header>
          )}
          
          {/* Main content area - pages render here */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
```

---

### 3. ProjectDetailLayout (`src/components/ProjectDetailLayout.tsx`)

**Purpose:** Replaces the current ProjectDetailView layout with secondary panel

```tsx
// src/components/ProjectDetailLayout.tsx
import { useState } from "react";
import { useNavigate, useParams, useLocation, Outlet } from "react-router-dom";
import {
  Building2,
  FileText,
  DollarSign,
  Target,
  FileEdit,
  Edit,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { isFeatureEnabled } from "@/lib/featureFlags";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const getNavigationGroups = (): NavGroup[] => {
  const groups: NavGroup[] = [
    {
      label: "PROJECT INFO",
      items: [
        { title: "Overview", url: "", icon: Building2 },
      ],
    },
    {
      label: "CONTRACTS & ESTIMATES",
      items: [
        { title: "Estimates & Quotes", url: "estimates", icon: FileText },
        { title: "Change Orders", url: "changes", icon: FileEdit },
      ],
    },
    {
      label: "COST MANAGEMENT",
      items: [
        { title: "Expenses", url: "expenses", icon: DollarSign },
        { title: "Line Item Control", url: "control", icon: Target },
      ],
    },
    {
      label: "DOCUMENTATION",
      items: [
        { title: "Documents", url: "documents", icon: FileText },
      ],
    },
    {
      label: "ACTIONS",
      items: [
        { title: "Edit Project", url: "edit", icon: Edit },
      ],
    },
  ];

  // Add Schedule if feature flag is enabled
  if (isFeatureEnabled("scheduleView")) {
    groups[0].items.push({ title: "Schedule", url: "schedule", icon: Calendar });
  }

  return groups;
};

export function ProjectDetailLayout() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const currentSection = location.pathname.split("/").pop() || "";
  const navigationGroups = getNavigationGroups();

  const isActive = (sectionUrl: string) => {
    if (sectionUrl === "" && currentSection === projectId) return true;
    return currentSection === sectionUrl;
  };

  const handleNavigation = (sectionUrl: string) => {
    const path = sectionUrl
      ? `/projects/${projectId}/${sectionUrl}`
      : `/projects/${projectId}`;
    navigate(path);
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Back to Projects */}
      <div className="p-3 border-b">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft className="h-4 w-4" />
          {!panelCollapsed && "Back to Projects"}
        </Button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label} className="mb-4">
            {!panelCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.url);
                const Icon = item.icon;
                return (
                  <Button
                    key={item.title}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-3 min-h-[44px]",
                      active && "bg-accent font-semibold border-l-2 border-primary",
                      panelCollapsed && "justify-center px-2"
                    )}
                    onClick={() => handleNavigation(item.url)}
                    title={panelCollapsed ? item.title : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!panelCollapsed && <span>{item.title}</span>}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  // Mobile: Use Sheet for navigation
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Mobile Project Header */}
        <header className="flex items-center gap-2 p-3 border-b bg-background">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Building2 className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
          <span className="font-semibold truncate">Project Details</span>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    );
  }

  // Desktop: Secondary panel
  return (
    <div className="flex h-full">
      {/* Secondary Navigation Panel */}
      <aside
        className={cn(
          "border-r bg-muted/30 transition-all duration-200 flex flex-col",
          panelCollapsed ? "w-14" : "w-52"
        )}
      >
        <NavContent />

        {/* Collapse Toggle */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
          >
            {panelCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Collapse
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
```

---

### 4. Reports Page Update

**Purpose:** Replace ReportsSidebar with tab-based filtering

```tsx
// In src/pages/Reports.tsx - replace the sidebar layout with:

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Replace ReportsSidebar with inline tabs
const CATEGORIES = [
  { key: 'standard', label: 'Standard', icon: BarChart3 },
  { key: 'custom', label: 'Custom', icon: FileEdit },
  { key: 'financial', label: 'Financial', icon: TrendingUp },
  { key: 'operational', label: 'Projects', icon: Building2 },
  { key: 'cost', label: 'Cost', icon: Receipt },
  { key: 'labor', label: 'Labor', icon: Clock },
  { key: 'other', label: 'Contacts', icon: Users },
];

// In the component JSX:
<div className="p-4 space-y-4">
  <div className="flex items-center justify-between">
    <h1 className="text-xl font-bold">Reports</h1>
  </div>
  
  {/* Category Tabs - scrollable on mobile */}
  <div className="overflow-x-auto -mx-4 px-4">
    <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
      <TabsList className="inline-flex h-10 w-max">
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <TabsTrigger 
            key={key} 
            value={key}
            className="gap-2 px-4 min-w-max"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  </div>

  {/* Report Grid */}
  <div className="grid gap-4">
    {/* ... existing report cards ... */}
  </div>
</div>
```

---

## Migration Plan

### Phase 1: Foundation (Day 1)

1. **Create new components:**
   - [ ] `src/components/AppSidebar.tsx`
   - [ ] `src/components/AppLayout.tsx`
   - [ ] `src/components/ProjectDetailLayout.tsx`

2. **Update App.tsx routing:**
   ```tsx
   // Replace ProtectedLayout with AppLayout
   <Route path="/" element={<AppLayout />}>
     {/* All existing routes */}
     
     {/* Project routes use ProjectDetailLayout */}
     <Route path="projects/:id" element={<ProjectDetailLayout />}>
       <Route index element={<ProjectOverview />} />
       <Route path="estimates" element={<ProjectEstimatesView />} />
       {/* ... other project sub-routes */}
     </Route>
   </Route>
   ```

### Phase 2: Migration (Day 2)

3. **Remove old components:**
   - [ ] Delete `Navigation.tsx` after AppSidebar is working
   - [ ] Remove `SidebarProvider` from `ProjectDetailView.tsx`
   - [ ] Remove `ReportsSidebar.tsx` after tabs are working

4. **Update Reports page:**
   - [ ] Remove SidebarProvider wrapper
   - [ ] Add tab-based category selection
   - [ ] Test mobile scrolling

### Phase 3: Polish (Day 3)

5. **Mobile testing:**
   - [ ] Test hamburger menu on all screen sizes
   - [ ] Verify 48px touch targets
   - [ ] Test sheet interactions

6. **Visual polish:**
   - [ ] Active state highlighting
   - [ ] Collapsed state icons
   - [ ] Smooth transitions

---

## Files to Modify

| File | Action | Priority |
|------|--------|----------|
| `src/App.tsx` | Update routing structure | High |
| `src/components/Navigation.tsx` | DELETE after migration | High |
| `src/components/ProjectDetailView.tsx` | Simplify (remove sidebar logic) | High |
| `src/components/ProjectSidebar.tsx` | DELETE (merged into ProjectDetailLayout) | High |
| `src/components/reports/ReportsSidebar.tsx` | DELETE | Medium |
| `src/pages/Reports.tsx` | Add tabs, remove sidebar | Medium |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/AppSidebar.tsx` | Main app navigation sidebar |
| `src/components/AppLayout.tsx` | Root layout with SidebarProvider |
| `src/components/ProjectDetailLayout.tsx` | Secondary panel layout for projects |

---

## Testing Checklist

### Desktop
- [ ] Sidebar expands/collapses correctly
- [ ] All nav items route correctly
- [ ] Active state shows on current route
- [ ] User dropdown works
- [ ] Project secondary panel toggles
- [ ] Reports tabs scroll horizontally

### Mobile
- [ ] Hamburger opens full sheet
- [ ] Navigation groups display correctly
- [ ] Sheet closes after navigation
- [ ] Project nav accessible via Building2 icon
- [ ] Touch targets are 48px minimum

### Role-Based Access
- [ ] Field workers see limited nav (Time Tracker, Field Media)
- [ ] Managers see operational items
- [ ] Admins see all items including admin section

---

## Visual Reference

```
┌────────────────────────────────────────────────────────────────────────┐
│ DESKTOP - NORMAL PAGE                                                  │
├──────────────┬─────────────────────────────────────────────────────────┤
│ [Logo]       │                                                         │
│ RCG Work     │  Dashboard / Projects / etc.                            │
│              │                                                         │
│ ─────────────│  ┌─────────────────────────────────────────────────┐    │
│ CORE         │  │                                                 │    │
│ • Dashboard  │  │         PAGE CONTENT                            │    │
│ • Projects   │  │                                                 │    │
│ • Time Track │  │                                                 │    │
│              │  │                                                 │    │
│ ESTIMATING   │  │                                                 │    │
│ • Estimates  │  │                                                 │    │
│ • Quotes     │  │                                                 │    │
│ • Bids       │  └─────────────────────────────────────────────────┘    │
│              │                                                         │
│ ...          │                                                         │
│              │                                                         │
├──────────────┤                                                         │
│ [Avatar]     │                                                         │
│ Chris R.     │                                                         │
└──────────────┴─────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ DESKTOP - PROJECT DETAIL PAGE                                          │
├──────────────┬───────────────┬─────────────────────────────────────────┤
│ [Logo]       │ ← Back        │                                         │
│ RCG Work     │               │  Project: 225-037                       │
│              │ PROJECT INFO  │                                         │
│ ─────────────│ • Overview    │  ┌─────────────────────────────────┐    │
│ CORE         │ • Schedule    │  │                                 │    │
│ • Dashboard  │               │  │    PROJECT CONTENT              │    │
│ ★ Projects   │ CONTRACTS     │  │                                 │    │
│ • Time Track │ • Estimates   │  │    (Overview, Expenses, etc.)   │    │
│              │ • Changes     │  │                                 │    │
│ ESTIMATING   │               │  │                                 │    │
│ • Estimates  │ COST MGMT     │  │                                 │    │
│ • Quotes     │ • Expenses    │  │                                 │    │
│ • Bids       │ • Line Items  │  └─────────────────────────────────┘    │
│              │               │                                         │
│ ...          │ [Collapse]    │                                         │
├──────────────┼───────────────┤                                         │
│ [Avatar]     │               │                                         │
└──────────────┴───────────────┴─────────────────────────────────────────┘

┌─────────────────────────────┐
│ MOBILE - SHEET OPEN         │
├─────────────────────────────┤
│ [X Close]                   │
│                             │
│ CORE                        │
│ ├─ Dashboard                │
│ ├─ Projects                 │
│ └─ Time Tracker             │
│                             │
│ ESTIMATING                  │
│ ├─ Estimates                │
│ ├─ Quotes                   │
│ └─ Bids                     │
│                             │
│ OPERATIONS                  │
│ ├─ Work Orders              │
│ └─ Time Approvals           │
│                             │
│ ... (scrollable)            │
│                             │
├─────────────────────────────┤
│ [Avatar] Chris              │
│ Sign Out                    │
└─────────────────────────────┘
```

---

## Success Metrics

1. **Reduced cognitive load** — No more hunting through "More" dropdown
2. **Consistent navigation** — Same sidebar on every page
3. **Faster project access** — Secondary panel is always visible
4. **Mobile parity** — Same information architecture on all devices
5. **Role clarity** — Admin items clearly separated
