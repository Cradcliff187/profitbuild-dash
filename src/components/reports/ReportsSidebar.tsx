import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { BarChart3, FileEdit, TrendingUp, Building2, Receipt, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReportCategory = 
  | 'standard' 
  | 'custom' 
  | 'financial' 
  | 'operational' 
  | 'cost' 
  | 'labor' 
  | 'other';

interface ReportsSidebarProps {
  selectedCategory: ReportCategory;
  onCategoryChange: (category: ReportCategory) => void;
}

const CATEGORIES = [
  {
    key: 'standard' as ReportCategory,
    label: 'Standard Reports',
    icon: BarChart3, // Matches Reports icon in Navigation
  },
  {
    key: 'custom' as ReportCategory,
    label: 'Custom Reports',
    icon: FileEdit, // Differentiates from standard, suggests editing/creation
  },
  {
    key: 'financial' as ReportCategory,
    label: 'Financial Performance',
    icon: TrendingUp, // Already correct, matches Navigation
  },
  {
    key: 'operational' as ReportCategory,
    label: 'Project Management',
    icon: Building2, // Already correct, matches Navigation
  },
  {
    key: 'cost' as ReportCategory,
    label: 'Cost Analysis',
    icon: Receipt, // Matches Expenses icon in Navigation
  },
  {
    key: 'labor' as ReportCategory,
    label: 'Time & Labor',
    icon: Clock, // Already correct, matches Navigation
  },
  {
    key: 'other' as ReportCategory,
    label: 'Client & Vendor',
    icon: Users, // Matches Contacts section (Payees/Clients) in Navigation
  },
];

export function ReportsSidebar({ selectedCategory, onCategoryChange }: ReportsSidebarProps) {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleCategoryChange = (category: ReportCategory) => {
    onCategoryChange(category);
    // Close mobile sidebar after selection
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase text-muted-foreground mb-1">
            {collapsed ? 'CAT' : 'Categories'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.key;
                
                return (
                  <SidebarMenuItem key={category.key}>
                    <SidebarMenuButton
                      onClick={() => handleCategoryChange(category.key)}
                      isActive={isActive}
                      className={cn(
                        "cursor-pointer min-h-[48px] py-3",
                        isActive 
                          ? 'font-semibold border-l-2 border-orange-600 pl-2 bg-accent/50' 
                          : ''
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {!collapsed && <span className="text-sm">{category.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

