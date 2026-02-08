import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Outlet, useOutletContext } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Video, ChevronsUpDown, Check, ArrowLeftCircle, Building2, ChevronLeft, ChevronRight, MapPin, ExternalLink, Menu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChangeOrderModal } from "@/components/project-detail/ChangeOrderModal";
import { getNavigationGroups, getSectionLabel, getSectionIcon } from "@/components/project-detail/projectNavigation";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectOption, formatProjectLabel } from "@/components/projects/ProjectOption";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProjectData } from "@/hooks/useProjectData";
import { cn } from "@/lib/utils";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { ProjectWithFinancials } from "@/utils/projectFinancials";
import type { Database } from "@/integrations/supabase/types";
import { BrandedLoader } from "@/components/ui/branded-loader";

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

// Context type for Outlet
export interface ProjectOutletContext {
  project: ProjectWithFinancials;
  estimates: Estimate[];
  quotes: Quote[];
  expenses: Expense[];
  changeOrders: ChangeOrder[];
  pendingTimeEntries: number;
  pendingReceipts: number;
  mediaCounts: { photos: number; videos: number };
  documentCount: number;
  loadProjectData: () => Promise<void>;
  handleSaveQuote: (quote: Quote) => Promise<void>;
  onEditChangeOrder: (co: ChangeOrder) => void;
  onCreateChangeOrder: () => void;
  isChangeOrderModalOpen: boolean;
  projectId: string;
}

// Hook for child routes to access project context
export function useProjectContext(): ProjectOutletContext {
  return useOutletContext<ProjectOutletContext>();
}

// Wrapper components removed - now handled by route components in project-routes folder

export const ProjectDetailView = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const {
    project,
    estimates,
    quotes,
    expenses,
    changeOrders,
    pendingTimeEntries,
    pendingReceipts,
    mediaCounts,
    documentCount,
    isLoading,
    loadProjectData,
    handleSaveQuote,
  } = useProjectData(projectId);

  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; project_number: string | null; project_name: string | null; client_name: string | null }>>([]);
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false);

  // Secondary panel collapse state with persistence
  const [panelCollapsed, setPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem('projectSidebarCollapsed');
    return saved === 'true';
  });

  // Mobile nav sheet state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Change Order Modal State
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);

  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectOptions();
    }
  }, [projectId]);

  // Invalidate media queries when returning from capture pages
  useEffect(() => {
    if (location.state?.activeTab === 'photos' || location.state?.activeTab === 'videos') {
      queryClient.invalidateQueries({ queryKey: ['project-media'] });
    }
  }, [location.state, queryClient]);

  // Persist sidebar collapse state
  useEffect(() => {
    localStorage.setItem('projectSidebarCollapsed', String(panelCollapsed));
  }, [panelCollapsed]);

  // Keyboard shortcut: Cmd/Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setPanelCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);


  const loadProjectOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name, category')
        .eq('category', 'construction')
        .order('project_number', { ascending: true });

      if (error) throw error;
      setProjectOptions(data || []);
    } catch (error) {
      console.error('Error loading project options', error);
    }
  };

  const handleProjectSwitch = (targetProjectId: string) => {
    setProjectSwitcherOpen(false);
    if (targetProjectId && targetProjectId !== project.id) {
      navigate(`/projects/${targetProjectId}`);
    }
  };

  if (isLoading) {
    return <BrandedLoader message="Loading project details..." />;
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Project not found</p>
          <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  // Secondary panel navigation logic
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
    setMobileNavOpen(false); // Auto-close mobile nav
  };

  // Mobile NavContent - Optimized for touch with 48px targets and 16px fonts
  const MobileNavContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Back to Projects - Large touch target */}
      <div className="px-4 py-4 border-b border-border/40">
        <Button
          variant="ghost"
          size="lg"
          className="w-full justify-start gap-3 h-12 text-base text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={() => {
            navigate("/projects");
            setMobileNavOpen(false);
          }}
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Projects
        </Button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label} className={cn("mb-8", groupIndex === 0 && "mt-0")}>
            {/* Section Header - Visible and clear */}
            <h3 className="px-4 mb-3 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
              {group.label}
            </h3>
            
            {/* Nav Items - 48px touch targets */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.url);
                const Icon = item.icon;
                return (
                  <Button
                    key={item.title}
                    variant="ghost"
                    className={cn(
                      // Base - 48px min height, 16px font
                      "w-full justify-start gap-4 min-h-[48px] px-4",
                      "text-base font-normal rounded-lg",
                      "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      // Active state
                      active && [
                        "bg-primary/8 text-foreground font-medium",
                        "border-l-[3px] border-primary -ml-[3px] pl-[calc(1rem+3px)]",
                      ]
                    )}
                    onClick={() => handleNavigation(item.url)}
                  >
                    <Icon className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span>{item.title}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  // Desktop NavContent - Compact for mouse with 36px targets and 14px fonts
  const DesktopNavContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Back to Projects */}
      <div className="px-3 py-3 border-b border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 h-9 text-sm text-muted-foreground hover:text-foreground hover:bg-transparent",
            panelCollapsed && "justify-center px-0"
          )}
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {!panelCollapsed && <span>Back to Projects</span>}
        </Button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label} className={cn("mb-5", groupIndex === 0 && "mt-0")}>
            {/* Section Header */}
            {!panelCollapsed && (
              <h3 className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">
                {group.label}
              </h3>
            )}
            
            {/* Nav Items - 36px for mouse */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.url);
                const Icon = item.icon;
                return (
                  <Button
                    key={item.title}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      // Base - compact for desktop
                      "w-full justify-start gap-2.5 h-9 text-sm font-normal rounded-md",
                      "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      // Active state - subtle
                      active && [
                        "bg-primary/6 text-foreground font-medium",
                        "border-l-2 border-primary -ml-[2px] pl-[calc(0.75rem+2px)]",
                      ],
                      // Collapsed mode
                      panelCollapsed && "justify-center px-0 w-10 mx-auto"
                    )}
                    onClick={() => handleNavigation(item.url)}
                    title={panelCollapsed ? item.title : undefined}
                  >
                    <Icon className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground"
                    )} />
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
    // Extract current section from URL
    const pathSegments = location.pathname.split('/');
    const currentSection = pathSegments[pathSegments.length - 1] === projectId 
      ? '' 
      : pathSegments[pathSegments.length - 1] || '';

    return (
      <div className="flex flex-col h-full bg-background">
        {/* Mobile Project Header - Redesigned */}
        <header className="border-b border-border/60 bg-background">
          {/* Project Identity Row */}
          <div className="flex items-start gap-3 px-4 py-3">
            {/* Back Button - replaces hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 -ml-2 -mt-0.5"
              onClick={() => navigate("/projects")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Project Info - restructured layout */}
            <div className="flex-1 min-w-0">
              {/* Row 1: Number + Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-muted-foreground">
                  {project.project_number}
                </span>
                <ProjectStatusBadge status={project.status} size="sm" />
              </div>

              {/* Row 2: Project Name - prominent, allows wrapping */}
              <h1 className="text-base font-semibold text-foreground leading-tight mt-1 line-clamp-2">
                {project.project_name}
              </h1>

              {/* Row 3: Client Name */}
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {project.client_name}
              </p>

              {/* Row 4: Address - enhanced touch target */}
              {project.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground active:text-foreground transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[200px]">{project.address}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                </a>
              )}
            </div>
          </div>

          {/* Section Selector - Opens navigation sheet */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-between",
                  "min-h-[52px] px-4 py-3",
                  "bg-gradient-to-r from-white to-slate-50",
                  "border-2 border-slate-200",
                  "hover:border-primary hover:shadow-md",
                  "active:from-primary/5 active:to-primary/10",
                  "transition-all duration-200"
                )}
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = getSectionIcon(currentSection);
                    return (
                      <div className="p-2 bg-primary/10 rounded-lg transition-colors flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    );
                  })()}
                  <span className="text-base font-semibold text-foreground">
                    {getSectionLabel(currentSection)}
                  </span>
                </div>
                <ChevronDown className="h-5 w-5 text-primary transition-transform duration-300" />
              </button>
            </SheetTrigger>
            
            <SheetContent
              side="bottom"
              className="h-auto max-h-[70vh] rounded-t-2xl p-0"
            >
              {/* Drag Handle + Title */}
              <div className="px-4 py-4 border-b border-border/40">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-center">Navigate to</h2>
              </div>
              
              {/* Navigation Options - Enhanced for touch */}
              <nav className="px-2 py-3 overflow-y-auto">
                {navigationGroups.map((group) => (
                  <div key={group.label} className="mb-4">
                    <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">
                      {group.label}
                    </h3>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const active = isActive(item.url);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.title}
                            className={cn(
                              "w-full flex items-center gap-4 min-h-[52px] px-4 rounded-xl",
                              "text-base transition-colors",
                              active 
                                ? "bg-primary/10 text-primary font-medium" 
                                : "text-foreground active:bg-muted/50"
                            )}
                            onClick={() => handleNavigation(item.url)}
                          >
                            <Icon className={cn(
                              "h-5 w-5 shrink-0",
                              active ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span>{item.title}</span>
                            {active && (
                              <Check className="h-5 w-5 ml-auto text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
              
              {/* Safe area padding for iOS bottom */}
              <div className="h-6" />
            </SheetContent>
          </Sheet>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto w-full max-w-full box-border min-w-0" data-project-detail-content style={{ maxWidth: '100%', width: '100%' }}>
          <Outlet context={{
            project,
            estimates,
            quotes,
            expenses,
            changeOrders,
            pendingTimeEntries,
            pendingReceipts,
            mediaCounts,
            documentCount,
            loadProjectData,
            handleSaveQuote,
            onEditChangeOrder: (co: ChangeOrder) => {
              setEditingChangeOrder(co);
              setShowChangeOrderModal(true);
            },
            onCreateChangeOrder: () => {
              setEditingChangeOrder(null);
              setShowChangeOrderModal(true);
            },
            isChangeOrderModalOpen: showChangeOrderModal,
            projectId: projectId!,
          }} />
        </div>
        
        {/* Change Order Modal */}
        <ChangeOrderModal
          open={showChangeOrderModal && !!project}
          onOpenChange={setShowChangeOrderModal}
          projectId={project?.id || ''}
          editingChangeOrder={editingChangeOrder}
          onSuccess={() => {
            setEditingChangeOrder(null);
            loadProjectData();
          }}
          onCancel={() => {
            setEditingChangeOrder(null);
          }}
        />
      </div>
    );
  }

  // Desktop: Secondary panel with main content
  return (
    <TooltipProvider>
    <div className="flex h-screen overflow-hidden">
      {/* Secondary Navigation Panel - Sticky */}
      <aside
          className={cn(
            "sticky top-0 self-start h-screen border-r border-border/50",
            "bg-white transition-all duration-200 flex flex-col shrink-0 relative",
            panelCollapsed ? "w-14" : "w-52"  // 56px collapsed, 208px expanded
          )}
      >
        <DesktopNavContent />

        {/* Hover-Revealed Collapse Toggle Handle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setPanelCollapsed(!panelCollapsed)}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -right-3 z-50",
                "w-6 h-16 flex items-center justify-center",
                "opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity duration-200",
                "group cursor-pointer outline-none"
              )}
              aria-label={panelCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <div className={cn(
                "w-1 h-12 rounded-full bg-border group-hover:bg-primary/60 group-focus:bg-primary/60 transition-all",
                panelCollapsed && "bg-primary/40"
              )} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p className="text-xs">
              {panelCollapsed ? "Expand" : "Collapse"} sidebar
              <kbd className="ml-1.5 px-1 py-0.5 text-[10px] bg-muted rounded border">⌘B</kbd>
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Compact Bottom Toggle (fallback) */}
        <div className="p-2 border-t border-border/40 mt-auto">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-center h-8 text-xs text-muted-foreground hover:text-foreground",
              panelCollapsed && "px-0"
            )}
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            title={panelCollapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
          >
            {panelCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Compact Header */}
        <header className="sticky top-0 z-10 border-b bg-background px-3 py-3 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {/* Left: Project Switcher */}
            <div className={cn("min-w-0", isMobile ? "w-full" : "flex-1 max-w-xl")}>
              <Popover open={projectSwitcherOpen} onOpenChange={setProjectSwitcherOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-10 gap-2 truncate border-border focus-visible:border-foreground/40 focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]", 
                      isMobile ? "w-full justify-between" : "justify-between max-w-[480px]"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate text-left">
                        {formatProjectLabel(project.project_number, project.project_name)}
                      </span>
                    </div>
                    <ChevronsUpDown className="h-3 w-3 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] sm:w-[480px] overflow-hidden p-0 border border-border rounded-lg shadow-md" align="start">
                  <Command className="bg-background">
                    <div className="px-2 py-2">
                      <CommandInput placeholder="Search projects..." className="h-9 text-sm rounded-md border border-border focus-visible:border-foreground/40 focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]" />
                    </div>
                    <CommandEmpty>No projects found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {projectOptions.map((proj) => (
                          <CommandItem
                            key={proj.id}
                            value={`${formatProjectLabel(proj.project_number, proj.project_name)} ${proj.client_name ?? ''}`}
                            onSelect={() => handleProjectSwitch(proj.id)}
                          >
                            <div className="flex w-full items-center gap-2">
                              <ProjectOption
                                projectNumber={proj.project_number}
                                projectName={proj.project_name}
                                clientName={proj.client_name}
                                size="sm"
                                className="flex-1 min-w-0"
                              />
                              {proj.id === project.id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: Metadata */}
            <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-3">
              {/* Client Info + Address Group */}
              <div className="flex-1 min-w-0 space-y-1.5 sm:flex-initial sm:space-y-1.5">
                <div className={cn(
                  "flex flex-wrap items-center gap-x-2 gap-y-1",
                  isMobile ? "text-sm" : "text-sm sm:justify-end"
                )}>
                  <span className={cn(
                    "truncate font-medium",
                    isMobile ? "max-w-[200px]" : ""
                  )}>
                    {project.client_name}
                  </span>
                  {project.customer_po_number && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      PO {project.customer_po_number}
                    </span>
                  )}
                </div>
                {project.address && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "group flex items-center gap-1.5 text-xs text-muted-foreground transition-colors",
                      isMobile ? "py-1 -ml-1 pl-1 active:text-foreground" : "hover:text-foreground sm:justify-end"
                    )}
                    title={project.address}
                  >
                    <MapPin className={cn("flex-shrink-0", isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                    <span className={cn(
                      "truncate",
                      isMobile ? "flex-1" : "max-w-xs"
                    )}>
                      {project.address}
                    </span>
                    <ExternalLink className={cn(
                      "flex-shrink-0 transition-opacity",
                      isMobile ? "h-3.5 w-3.5" : "h-3 w-3 opacity-0 group-hover:opacity-100"
                    )} />
                  </a>
                )}
              </div>

              {/* Divider (Desktop only) */}
              {!isMobile && (
                <div className="hidden sm:block h-10 w-px bg-border flex-shrink-0" />
              )}

              {/* Status Badge */}
              <ProjectStatusBadge 
                status={project.status} 
                size="sm" 
                className="flex-shrink-0"
              />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-3 space-y-3">
          <Outlet context={{
            project,
            estimates,
            quotes,
            expenses,
            changeOrders,
            pendingTimeEntries,
            pendingReceipts,
            mediaCounts,
            documentCount,
            loadProjectData,
            handleSaveQuote,
            onEditChangeOrder: (co: ChangeOrder) => {
              setEditingChangeOrder(co);
              setShowChangeOrderModal(true);
            },
            onCreateChangeOrder: () => {
              setEditingChangeOrder(null);
              setShowChangeOrderModal(true);
            },
            isChangeOrderModalOpen: showChangeOrderModal,
            projectId: projectId!,
          }} />
        </main>

          {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => navigate(`/projects/${project.id}/capture-video`)}
          title="Capture Video"
        >
          <Video className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => navigate(`/projects/${project.id}/capture`)}
          title="Capture Photo"
        >
          <Camera className="h-5 w-5" />
        </Button>
      </div>

      {/* Change Order Modal */}
      <ChangeOrderModal
        open={showChangeOrderModal && !!project}
        onOpenChange={setShowChangeOrderModal}
        projectId={project?.id || ''}
        editingChangeOrder={editingChangeOrder}
        onSuccess={() => {
          setEditingChangeOrder(null);
          loadProjectData();
        }}
        onCancel={() => {
          setEditingChangeOrder(null);
        }}
      />
      </div>
    </div>
    </TooltipProvider>
  );
};
