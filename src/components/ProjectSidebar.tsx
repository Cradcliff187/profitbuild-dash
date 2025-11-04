import { 
  Building2, 
  FileText, 
  DollarSign, 
  Target, 
  Link2, 
  FileEdit, 
  Camera, 
  Video,
  Edit,
  Play,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { isFeatureEnabled } from "@/lib/featureFlags";

const baseSections = [
  { title: "Overview", url: "", icon: Building2 },
  { title: "Estimates & Quotes", url: "estimates", icon: FileText },
  { title: "Expenses", url: "expenses", icon: DollarSign },
  { title: "Line Item Control", url: "control", icon: Target },
  { title: "Expense Matching", url: "matching", icon: Link2 },
  { title: "Change Orders", url: "changes", icon: FileEdit },
  { title: "Documents", url: "documents", icon: FileText },
];

const scheduleSection = { title: "Schedule", url: "schedule", icon: Calendar };

const actions = [
  { title: "Edit Project", url: "edit", icon: Edit },
  { title: "Start Project", action: "start", icon: Play },
];

export function ProjectSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const location = useLocation();

  const collapsed = state === "collapsed";
  const currentSection = location.pathname.split('/').pop() || '';
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

  // Conditionally include schedule section based on feature flag
  const sections = isFeatureEnabled('scheduleView')
    ? [...baseSections.slice(0, 3), scheduleSection, ...baseSections.slice(3)]
    : baseSections;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "text-xs" : ""}>
            {collapsed ? "Nav" : "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => (
                <SidebarMenuItem key={section.title}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(section.url)}
                    isActive={isActive(section.url)}
                    className="cursor-pointer"
                  >
                    <section.icon className="h-4 w-4" />
                    {!collapsed && <span className="text-sm">{section.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "text-xs" : ""}>
            {collapsed ? "Act" : "Actions"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {actions.map((action) => (
                <SidebarMenuItem key={action.title}>
                  <SidebarMenuButton
                    onClick={() => action.url && handleNavigation(action.url)}
                    className="cursor-pointer"
                  >
                    <action.icon className="h-4 w-4" />
                    {!collapsed && <span className="text-sm">{action.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
