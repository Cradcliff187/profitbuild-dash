import { 
  Building2, 
  FileText, 
  DollarSign, 
  Target, 
  Link2, 
  FileEdit,
  Edit,
  Calendar
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { isFeatureEnabled } from "@/lib/featureFlags";

interface NavigationItem {
  title: string;
  url: string;
  icon: any;
}

interface NavigationGroup {
  label: string;
  abbrev: string;
  items: NavigationItem[];
}

const getNavigationGroups = (): NavigationGroup[] => {
  const projectInfoItems: NavigationItem[] = [
    { title: "Overview", url: "", icon: Building2 },
  ];

  // Add Schedule if feature flag is enabled
  if (isFeatureEnabled('scheduleView')) {
    projectInfoItems.push({ title: "Schedule", url: "schedule", icon: Calendar });
  }

  return [
    {
      label: "PROJECT INFO",
      abbrev: "PI",
      items: projectInfoItems
    },
    {
      label: "CONTRACTS & ESTIMATES",
      abbrev: "CE",
      items: [
        { title: "Estimates & Quotes", url: "estimates", icon: FileText },
        { title: "Change Orders", url: "changes", icon: FileEdit },
      ]
    },
    {
      label: "COST MANAGEMENT",
      abbrev: "CM",
      items: [
        { title: "Expenses", url: "expenses", icon: DollarSign },
        { title: "Expense Matching", url: "matching", icon: Link2 },
        { title: "Line Item Control", url: "control", icon: Target },
      ]
    },
    {
      label: "DOCUMENTATION",
      abbrev: "DOC",
      items: [
        { title: "Documents", url: "documents", icon: FileText },
      ]
    },
    {
      label: "ACTIONS",
      abbrev: "ACT",
      items: [
        { title: "Edit Project", url: "edit", icon: Edit },
      ]
    }
  ];
};

export function ProjectSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const location = useLocation();

  const collapsed = state === "collapsed";
  const currentSection = location.pathname.split('/').pop() || '';
  const navigationGroups = getNavigationGroups();

  const isActive = (sectionUrl: string) => {
    if (sectionUrl === '' && currentSection === projectId) return true;
    return currentSection === sectionUrl;
  };

  const handleNavigation = (sectionUrl: string) => {
    const path = sectionUrl ? `/projects/${projectId}/${sectionUrl}` : `/projects/${projectId}`;
    navigate(path);
    
    // Close mobile sidebar after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label}>
            <SidebarGroup>
              <SidebarGroupLabel className={collapsed ? "text-xs uppercase text-muted-foreground mb-1" : "text-xs uppercase text-muted-foreground mb-1"}>
                {collapsed ? group.abbrev : group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => handleNavigation(item.url)}
                          isActive={active}
                          className={`cursor-pointer min-h-[48px] py-3 ${
                            active 
                              ? 'font-semibold border-l-2 border-orange-600 pl-2 bg-accent/50' 
                              : ''
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                          {!collapsed && <span className="text-sm">{item.title}</span>}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {groupIndex < navigationGroups.length - 1 && (
              <SidebarSeparator className="my-2" />
            )}
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
