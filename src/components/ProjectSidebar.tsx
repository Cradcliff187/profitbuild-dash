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
  Play
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

const sections = [
  { title: "Overview", url: "", icon: Building2 },
  { title: "Estimates & Quotes", url: "estimates", icon: FileText },
  { title: "Expenses", url: "expenses", icon: DollarSign },
  { title: "Line Item Control", url: "control", icon: Target },
  { title: "Expense Matching", url: "matching", icon: Link2 },
  { title: "Change Orders", url: "changes", icon: FileEdit },
  { title: "Media", url: "media", icon: Camera },
];

const actions = [
  { title: "Edit Project", url: "edit", icon: Edit },
  { title: "Start Project", action: "start", icon: Play },
];

export function ProjectSidebar() {
  const { state } = useSidebar();
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
  };

  return (
    <Sidebar collapsible="icon" className="h-screen flex flex-col overflow-hidden">
      <SidebarContent className="flex-1 overflow-auto">
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
