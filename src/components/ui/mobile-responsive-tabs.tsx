import { ReactNode, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabDefinition {
  value: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  showOnMobile?: boolean; // Show this tab on mobile (default: true for first 3)
}

interface MobileResponsiveTabsProps {
  tabs: TabDefinition[];
  defaultTab?: string;
  className?: string;
  maxMobileTabs?: number; // Number of tabs to show on mobile before overflow (default: 3)
}

/**
 * Universal mobile-first tabs component that prevents layout issues.
 * - Automatically handles tab overflow on mobile
 * - Never causes horizontal scrolling
 * - Shows first N tabs inline, rest in dropdown menu
 * - Enforces proper responsive grid layout
 */
export function MobileResponsiveTabs({
  tabs,
  defaultTab,
  className,
  maxMobileTabs = 3,
}: MobileResponsiveTabsProps) {
  const defaultValue = defaultTab || tabs[0]?.value;
  const [activeTab, setActiveTab] = useState(defaultValue);

  // Determine which tabs are shown on mobile
  const mobileTabs = tabs
    .map((tab, idx) => ({
      ...tab,
      showOnMobile: tab.showOnMobile ?? idx < maxMobileTabs,
    }))
    .filter((tab) => tab.showOnMobile);

  const overflowTabs = tabs.filter(
    (tab) => !mobileTabs.find((mt) => mt.value === tab.value)
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("w-full", className)}>
      {/* Mobile: Fixed grid layout + overflow menu */}
      <div className="md:hidden mobile-container">
        <TabsList
          className={cn(
            "w-full h-auto grid gap-1 p-1",
            mobileTabs.length === 1 && "grid-cols-1",
            mobileTabs.length === 2 && "grid-cols-2",
            mobileTabs.length === 3 && "grid-cols-3"
          )}
        >
          {mobileTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="min-h-[44px] text-xs sm:text-sm data-[state=active]:bg-background"
            >
              {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overflow menu for additional tabs on mobile */}
        {overflowTabs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 min-h-[44px]"
              >
                <MoreHorizontal className="h-4 w-4 mr-2" />
                More Tabs
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-full">
              {overflowTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.value}
                  className="min-h-[44px] cursor-pointer"
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.icon && <span className="mr-2">{tab.icon}</span>}
                  {tab.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Desktop: Standard horizontal tabs */}
      <div className="hidden md:block">
        <TabsList className="w-full justify-start h-auto flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-background"
            >
              {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Tab content - same for all breakpoints */}
      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className="mobile-container mt-4"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
