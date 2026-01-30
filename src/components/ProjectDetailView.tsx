import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Outlet, useOutletContext } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Video, ChevronsUpDown, Check, ArrowLeftCircle, Building2, FileText, FileSignature, DollarSign, Target, FileEdit, Edit, Calendar, ChevronLeft, ChevronRight, MapPin, ExternalLink, Menu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChangeOrderForm } from "@/components/ChangeOrderForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ProjectOption, formatProjectLabel } from "@/components/projects/ProjectOption";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast } from "@/hooks/use-toast";
import { ProjectWithFinancials } from "@/utils/projectFinancials";
import type { Database } from "@/integrations/supabase/types";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { isFeatureEnabled } from "@/lib/featureFlags";
import ProjectScheduleView from "@/components/schedule/ProjectScheduleView";
import { parseDateOnly } from "@/utils/dateUtils";

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

// Navigation groups for secondary panel
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
        { title: "Contracts", url: "contracts", icon: FileSignature },
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

// Helper: Get section display label from URL segment
const getSectionLabel = (section: string): string => {
  const labels: Record<string, string> = {
    '': 'Overview',
    'overview': 'Overview',
    'estimates': 'Estimates & Quotes',
    'contracts': 'Contracts',
    'changes': 'Change Orders',
    'expenses': 'Expenses',
    'control': 'Line Item Control',
    'documents': 'Documents',
    'schedule': 'Schedule',
    'edit': 'Edit Project',
  };
  return labels[section] || 'Overview';
};

// Helper: Get section icon from URL segment
const getSectionIcon = (section: string) => {
  const icons: Record<string, typeof Building2> = {
    '': Building2,
    'overview': Building2,
    'estimates': FileText,
    'contracts': FileSignature,
    'changes': FileEdit,
    'expenses': DollarSign,
    'control': Target,
    'documents': FileText,
    'schedule': Calendar,
    'edit': Edit,
  };
  return icons[section] || Building2;
};

export const ProjectDetailView = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [project, setProject] = useState<ProjectWithFinancials | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [pendingTimeEntries, setPendingTimeEntries] = useState<number>(0);
  const [pendingReceipts, setPendingReceipts] = useState<number>(0);
  const [mediaCounts, setMediaCounts] = useState({ photos: 0, videos: 0 });
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; project_number: string | null; project_name: string | null; client_name: string | null }>>([]);
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Secondary panel collapse state
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  
  // Mobile nav sheet state
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Change Order Modal State
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);
  
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
      loadProjectOptions();
    }
  }, [projectId]);

  // Invalidate media queries when returning from capture pages
  useEffect(() => {
    if (location.state?.activeTab === 'photos' || location.state?.activeTab === 'videos') {
      queryClient.invalidateQueries({ queryKey: ['project-media'] });
    }
  }, [location.state, queryClient]);


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

  const loadProjectData = async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);

      // Load project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          toast({
            title: "Project Not Found",
            description: "The requested project could not be found.",
            variant: "destructive"
          });
          navigate('/projects');
          return;
        }
        throw projectError;
      }

      // Load related data
      const [
        { data: estimatesData },
        { data: quotesData },
        { data: expensesData },
        { data: changeOrdersData },
        pendingTimeEntriesData,
        pendingReceiptsData,
        { data: mediaData },
        documentsData
      ] = await Promise.all([
      supabase
        .from('estimates')
        .select(`
          *,
          projects(project_name, client_name, project_number),
          estimate_line_items(*)
        `)
        .eq('project_id', projectId)
        .order('date_created', { ascending: false }),
        supabase
          .from('quotes')
          .select(`
            *,
            payees(payee_name),
            quote_line_items(*)
          `)
          .eq('project_id', projectId)
          .order('date_received', { ascending: false }),
        // Fetch expenses with proper split handling
        (async () => {
          // Fetch direct expenses (not split)
          const { data: directExpenses } = await supabase
            .from('expenses')
            .select('*, payees(payee_name), projects(project_name, project_number)')
            .eq('project_id', projectId)
            .eq('is_split', false);

          // Fetch split records for this project
          const { data: splitRecords } = await supabase
            .from('expense_splits')
            .select(`
              split_amount,
              expense_id,
              expenses(*, payees(payee_name), projects(project_name, project_number))
            `)
            .eq('project_id', projectId);

          // Format direct expenses (use actual amount)
          const formattedDirectExpenses = (directExpenses || []).map(expense => ({
            ...expense,
            display_amount: expense.amount // Use full amount for direct expenses
          }));

          // Format split expenses (use split_amount instead of parent amount)
          const formattedSplitExpenses = (splitRecords || []).map((split: any) => ({
            ...split.expenses,
            display_amount: split.split_amount // Use split amount for budget calculations
          }));

          // Combine and sort
          const allExpenses = [
            ...formattedDirectExpenses,
            ...formattedSplitExpenses
          ].sort((a, b) => 
            new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
          );

          return { data: allExpenses };
        })(),
        supabase
          .from('change_orders')
          .select('*')
          .eq('project_id', projectId)
          .order('requested_date', { ascending: false }),
        supabase
          .from('expenses')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('category', 'labor_internal')
          .eq('approval_status', 'pending'),
        supabase
          .from('expenses')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .not('receipt_id', 'is', null)
          .eq('approval_status', 'pending'),
        supabase
          .from('project_media')
          .select('file_type')
          .eq('project_id', projectId),
        supabase
          .from('project_documents')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
      ]);

      // Format the project data
      const formattedProject: Project = {
        ...projectData,
        created_at: new Date(projectData.created_at),
        updated_at: new Date(projectData.updated_at),
        start_date: projectData.start_date ? new Date(projectData.start_date) : undefined,
        end_date: projectData.end_date ? new Date(projectData.end_date) : undefined,
      };

      // Format estimates with line items
      const formattedEstimates = (estimatesData || []).map((estimate: any) => {
        const safeNumber = (value: any, defaultValue: number = 0): number => {
          const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
          return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
        };

        const projectData = Array.isArray(estimate.projects) ? estimate.projects[0] : estimate.projects;

        return {
          ...estimate,
          date_created: new Date(estimate.date_created),
          valid_until: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
          created_at: new Date(estimate.created_at),
          updated_at: new Date(estimate.updated_at),
          project_name: projectData?.project_name || formattedProject.project_name,
          client_name: projectData?.client_name || formattedProject.client_name,
          project_number: projectData?.project_number || formattedProject.project_number,
          defaultMarkupPercent: estimate.default_markup_percent || 25,
          targetMarginPercent: estimate.target_margin_percent || 20,
          lineItems: (estimate.estimate_line_items || []).map((item: any) => ({
            id: item.id,
            category: item.category,
            description: item.description || '',
            quantity: safeNumber(item.quantity, 1),
            pricePerUnit: safeNumber(item.price_per_unit || item.rate, 0),
            total: safeNumber(item.total, 0),
            unit: item.unit || '',
            sort_order: item.sort_order || 0,
            costPerUnit: safeNumber(item.cost_per_unit, 0),
            markupPercent: item.markup_percent ? safeNumber(item.markup_percent) : null,
            markupAmount: item.markup_amount ? safeNumber(item.markup_amount) : null,
            totalCost: safeNumber(item.total_cost, 0),
            totalMarkup: safeNumber(item.total_markup, 0)
          }))
        };
      });

      // Format quotes with proper typing
      const formattedQuotes = (quotesData || []).map(quote => {
        // Helper function to safely parse numbers
        const safeNumber = (value: any, defaultValue: number = 0): number => {
          const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
          return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
        };

        // Handle nested Supabase response
        const payeeData = Array.isArray(quote.payees) ? quote.payees[0] : quote.payees;

        return {
          ...quote,
          dateReceived: new Date(quote.date_received),
          createdAt: new Date(quote.created_at),
          updatedAt: new Date(quote.updated_at),
          validUntil: quote.valid_until ? new Date(quote.valid_until) : undefined,
          accepted_date: quote.accepted_date ? new Date(quote.accepted_date) : undefined,
          status: quote.status as any,
          projectName: formattedProject.project_name,
          client: formattedProject.client_name,
          project_number: formattedProject.project_number,
          quotedBy: payeeData?.payee_name || '',
          quoteNumber: quote.quote_number || '',
          lineItems: (quote.quote_line_items || []).map((item: any) => ({
            id: item.id || '',
            estimateLineItemId: item.estimate_line_item_id || undefined,
            changeOrderLineItemId: item.change_order_line_item_id || undefined,
            category: item.category,
            description: item.description || '',
            quantity: safeNumber(item.quantity, 1),
            pricePerUnit: safeNumber(item.rate, 0),
            total: safeNumber(item.total, 0),
            costPerUnit: safeNumber(item.cost_per_unit, 0),
            markupPercent: item.markup_percent ? safeNumber(item.markup_percent) : null,
            markupAmount: item.markup_amount ? safeNumber(item.markup_amount) : null,
            totalCost: safeNumber(item.total_cost, 0),
            totalMarkup: safeNumber(item.total_markup, 0)
          })),
          subtotals: {
            labor: 0,
            subcontractors: 0,
            materials: 0,
            equipment: 0,
            other: 0
          },
          total: quote.total_amount || 0,
          isOverdue: false,
          daysUntilExpiry: 0
        };
      }) as unknown as Quote[];

      // Format expenses with proper typing
      const formattedExpenses: Expense[] = (expensesData || []).map((expense: any) => ({
        ...expense,
        expense_date: parseDateOnly(expense.expense_date),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
        category: expense.category as any,
        payee_name: expense.payees?.payee_name,
        project_name: expense.projects?.project_name,
        project_number: expense.projects?.project_number,
      }));

      // Calculate change order totals from approved change orders
      const approvedChangeOrders = (changeOrdersData || []).filter(co => co.status === 'approved');
      const changeOrderRevenue = approvedChangeOrders.reduce((sum, co) => sum + (co.client_amount || 0), 0);
      const changeOrderCosts = approvedChangeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);

      // Project financials are already calculated by database functions
      const projectWithFinancials = {
        ...formattedProject,
        changeOrderRevenue,
        changeOrderCosts
      } as ProjectWithFinancials;

      setProject(projectWithFinancials);
      setEstimates(formattedEstimates);
      setQuotes(formattedQuotes);
      setExpenses(formattedExpenses);
      setChangeOrders(changeOrdersData || []);
      setPendingTimeEntries(pendingTimeEntriesData.count || 0);
      setPendingReceipts(pendingReceiptsData.count || 0);
      
      // Count media by type
      const photos = (mediaData || []).filter(m => m.file_type === 'image').length;
      const videos = (mediaData || []).filter(m => m.file_type === 'video').length;
      setMediaCounts({ photos, videos });
      
      setDocumentCount(documentsData.count || 0);

    } catch (error) {
      console.error('Error loading project data:', error);
      
      const isNetworkError = error instanceof TypeError && 
                             error.message.includes('fetch');
      
      toast({
        title: isNetworkError ? "Connection Error" : "Error Loading Data",
        description: isNetworkError 
          ? "Please check your internet connection and try again."
          : "Failed to load project data. If this persists, contact support.",
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadProjectData()}
          >
            Retry
          </Button>
        )
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectSwitch = (targetProjectId: string) => {
    setProjectSwitcherOpen(false);
    if (targetProjectId && targetProjectId !== project.id) {
      navigate(`/projects/${targetProjectId}`);
    }
  };

  const handleSaveQuote = async (quote: Quote) => {
    try {
      // Extract sequence number from quote_number (e.g., "225-012-QTE-01-02" → 2)
      const sequenceNumber = parseInt(quote.quoteNumber.split('-').pop() || '1', 10);
      
      // Insert quote into database
      const { data: quoteData, error } = await supabase
        .from('quotes')
        .insert({
          project_id: quote.project_id,
          estimate_id: quote.estimate_id,
          payee_id: quote.payee_id,
          quote_number: quote.quoteNumber,
          sequence_number: sequenceNumber,
          date_received: quote.dateReceived.toISOString().split('T')[0],
          status: quote.status,
          accepted_date: quote.accepted_date ? quote.accepted_date.toISOString().split('T')[0] : null,
          valid_until: quote.valid_until ? quote.valid_until.toISOString().split('T')[0] : null,
          includes_materials: quote.includes_materials,
          includes_labor: quote.includes_labor,
          total_amount: quote.total,
          notes: quote.notes,
          attachment_url: quote.attachment_url
        })
        .select()
        .single();

      if (error) throw error;

      // Insert line items
      if (quote.lineItems.length > 0) {
        const { error: lineItemsError } = await supabase
          .from('quote_line_items')
          .insert(quote.lineItems.map(item => ({
            quote_id: quoteData.id,
            estimate_line_item_id: item.estimateLineItemId,
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            rate: item.pricePerUnit,
            cost_per_unit: item.costPerUnit || 0,
            markup_percent: item.markupPercent,
            markup_amount: item.markupAmount,
            sort_order: 0
          })));

        if (lineItemsError) throw lineItemsError;
      }

      toast({
        title: "Quote saved",
        description: `Quote ${quote.quoteNumber} has been created successfully.`,
      });

      await loadProjectData();
      navigate(`/projects/${projectId}/estimates?tab=quotes`);
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
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
                  "min-h-[48px] px-4 py-3",
                  "bg-muted/30 border-t border-border/40",
                  "active:bg-muted/50 transition-colors"
                )}
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = getSectionIcon(currentSection);
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()}
                  <span className="text-base font-medium text-foreground">
                    {getSectionLabel(currentSection)}
                  </span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
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
        
        {/* Change Order Modal - Mobile */}
        <Dialog open={showChangeOrderModal && !!project} onOpenChange={setShowChangeOrderModal}>
          <DialogContent 
            className={cn(
              "flex flex-col p-0",
              isMobile 
                ? "!fixed !inset-0 !left-0 !top-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !h-screen !w-screen !max-w-none !rounded-none !m-0" 
                : "max-w-2xl max-h-[85vh]"
            )}
          >
            <DialogHeader className={cn("border-b flex-shrink-0", isMobile ? "px-3 pt-3 pb-2" : "px-6 pt-6 pb-4")}>
              <DialogTitle className="text-sm">
                {editingChangeOrder ? 'Edit Change Order' : 'Create New Change Order'}
              </DialogTitle>
            </DialogHeader>
            <div className={cn("flex-1 overflow-y-auto", isMobile ? "px-3 py-4" : "px-6 py-4")}>
              {project && (
                <ChangeOrderForm
                  projectId={project.id}
                  changeOrder={editingChangeOrder || undefined}
                  onSuccess={() => {
                    setShowChangeOrderModal(false);
                    setEditingChangeOrder(null);
                    loadProjectData();
                    toast({
                      title: "Success",
                      description: `Change order ${editingChangeOrder ? 'updated' : 'created'} successfully.`
                    });
                  }}
                  onCancel={() => {
                    setShowChangeOrderModal(false);
                    setEditingChangeOrder(null);
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop: Secondary panel with main content
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Secondary Navigation Panel - Sticky */}
      <aside
          className={cn(
            "sticky top-0 self-start h-screen border-r border-border/50",
            "bg-white transition-all duration-200 flex flex-col shrink-0",
            panelCollapsed ? "w-14" : "w-52"  // 56px collapsed, 208px expanded
          )}
      >
        <DesktopNavContent />

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-border/40 mt-auto">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-center h-8 text-xs text-muted-foreground hover:text-foreground",
              panelCollapsed && "px-0"
            )}
            onClick={() => setPanelCollapsed(!panelCollapsed)}
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
      <Dialog open={showChangeOrderModal && !!project} onOpenChange={setShowChangeOrderModal}>
        <DialogContent 
          className={cn(
            "flex flex-col p-0",
            isMobile 
              ? "!fixed !inset-0 !left-0 !top-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !h-screen !w-screen !max-w-none !rounded-none !m-0" 
              : "max-w-2xl max-h-[85vh]"
          )}
        >
            <DialogHeader className={cn("border-b flex-shrink-0", isMobile ? "px-3 pt-3 pb-2" : "px-6 pt-6 pb-4")}>
              <DialogTitle className="text-sm">
                {editingChangeOrder ? 'Edit Change Order' : 'Create New Change Order'}
              </DialogTitle>
            </DialogHeader>
            <div className={cn("flex-1 overflow-y-auto", isMobile ? "px-3 py-4" : "px-6 py-4")}>
              {project && (
                <ChangeOrderForm
                  projectId={project.id}
                  changeOrder={editingChangeOrder || undefined}
              onSuccess={() => {
                setShowChangeOrderModal(false);
                setEditingChangeOrder(null);
                loadProjectData();
                toast({
                  title: "Success",
                  description: `Change order ${editingChangeOrder ? 'updated' : 'created'} successfully.`
                });
              }}
              onCancel={() => {
                setShowChangeOrderModal(false);
                setEditingChangeOrder(null);
                }}
              />
              )}
            </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};
