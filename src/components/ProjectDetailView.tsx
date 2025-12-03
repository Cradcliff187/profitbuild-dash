import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Video, ChevronsUpDown, Check, ArrowLeftCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { ProjectOperationalDashboard } from "@/components/ProjectOperationalDashboard";
import { ProjectEstimatesView } from "@/components/ProjectEstimatesView";
import { EstimateForm } from "@/components/EstimateForm";
import { QuoteForm } from "@/components/QuoteForm";
import { ExpensesList } from "@/components/ExpensesList";
import { LineItemControlDashboard } from "@/components/LineItemControlDashboard";
import { ChangeOrdersList } from "@/components/ChangeOrdersList";
import { ChangeOrderForm } from "@/components/ChangeOrderForm";
import { ProjectMediaGallery } from "@/components/ProjectMediaGallery";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { ProjectDocumentsHub } from "@/components/ProjectDocumentsHub";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ProjectOption, formatProjectLabel } from "@/components/projects/ProjectOption";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
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

// Wrapper component to handle estimate editing with route params
const EstimateEditWrapper = ({ 
  estimates, 
  projectId, 
  onSave, 
  onCancel 
}: { 
  estimates: Estimate[]; 
  projectId: string; 
  onSave: () => void; 
  onCancel: () => void; 
}) => {
  const { estimateId } = useParams<{ estimateId: string }>();
  const estimate = estimates.find(e => e.id === estimateId);
  
  if (!estimate) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Estimate not found
        </CardContent>
      </Card>
    );
  }
  
  return (
    <EstimateForm
      mode="edit"
      initialEstimate={estimate}
      onSave={onSave}
      onCancel={onCancel}
      preselectedProjectId={projectId}
    />
  );
};

// Wrapper component to handle quote editing with route params
const QuoteEditWrapper = ({ 
  quotes, 
  estimates,
  projectId, 
  onSave, 
  onCancel,
  mode = 'edit'
}: { 
  quotes: Quote[]; 
  estimates: Estimate[];
  projectId: string; 
  onSave: () => void; 
  onCancel: () => void;
  mode?: 'edit' | 'view';
}) => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const quote = quotes.find(q => q.id === quoteId);
  console.log('[QuoteEditWrapper] Resolving quote', { quoteId, found: !!quote, mode });
  
  if (!quote) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Quote not found
        </CardContent>
      </Card>
    );
  }
  
  return (
    <QuoteForm
      estimates={estimates}
      initialQuote={quote}
      onSave={onSave}
      onCancel={onCancel}
      mode={mode}
    />
  );
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full no-horizontal-scroll pt-16">
        <ProjectSidebar />
        
        <SidebarInset className="flex-1 flex flex-col no-horizontal-scroll overflow-hidden">
          {/* Compact Header */}
          <header className="sticky top-0 z-10 flex h-auto flex-col gap-3 border-b bg-background px-3 py-3 sm:h-16 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="hidden sm:block h-8" />
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className={cn("flex flex-col gap-2", isMobile ? "w-full" : "min-w-0")}
              >
                <Breadcrumb>
                  <BreadcrumbList className="text-xs sm:text-sm">
                    <BreadcrumbItem>
                      <BreadcrumbLink 
                        onClick={() => navigate('/projects')}
                        className="cursor-pointer hover:text-foreground"
                      >
                        Projects
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-medium">
                        {formatProjectLabel(project.project_number, project.project_name)}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className={cn("flex items-center gap-2", isMobile ? "w-full" : "min-w-0")}
              >
                <Popover open={projectSwitcherOpen} onOpenChange={setProjectSwitcherOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-10 gap-2 truncate border-border focus-visible:border-foreground/40 focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]", 
                        isMobile ? "w-full justify-between" : "justify-between max-w-[320px]"
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
                  <PopoverContent className="w-[320px] overflow-hidden p-0 border border-border rounded-lg shadow-md" align="start">
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

              <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-right">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[200px] sm:max-w-[180px]">
                    {project.client_name}
                  </span>
                  {project.customer_po_number && (
                    <span className="truncate">PO {project.customer_po_number}</span>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs flex-shrink-0 capitalize px-2 py-0.5",
                    project.status === 'approved' && 'border-green-200 text-green-700 bg-green-50',
                    project.status === 'estimating' && 'border-gray-200 text-gray-700 bg-gray-50',
                    project.status === 'quoted' && 'border-blue-200 text-blue-700 bg-blue-50',
                    project.status === 'in_progress' && 'border-purple-200 text-purple-700 bg-purple-50',
                    project.status === 'complete' && 'border-green-200 text-green-700 bg-green-50',
                    project.status === 'on_hold' && 'border-yellow-200 text-yellow-700 bg-yellow-50',
                    project.status === 'cancelled' && 'border-red-200 text-red-700 bg-red-50'
                  )}
                >
                  {project.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto p-3 space-y-3">
            <Routes>
              <Route index element={
                <ProjectOperationalDashboard
                  project={project}
                  estimates={estimates}
                  quotes={quotes}
                  expenses={expenses}
                  changeOrders={changeOrders}
                  pendingTimeEntries={pendingTimeEntries}
                  pendingReceipts={pendingReceipts}
                  mediaCounts={mediaCounts}
                  documentCount={documentCount}
                />
              } />
              
              <Route path="estimates">
                <Route index element={
                  <ProjectEstimatesView 
                    projectId={project.id}
                    estimates={estimates}
                    quotes={quotes}
                    onRefresh={loadProjectData}
                  />
                } />
                <Route path=":estimateId/edit" element={
                  <EstimateEditWrapper 
                    estimates={estimates}
                    projectId={projectId!}
                    onSave={() => {
                      loadProjectData();
                      navigate(`/projects/${projectId}/estimates`);
                    }}
                    onCancel={() => navigate(`/projects/${projectId}/estimates`)}
                  />
                } />
                <Route path="new" element={
                  <EstimateForm
                    mode="create"
                    onSave={() => {
                      loadProjectData();
                      navigate(`/projects/${projectId}/estimates`);
                    }}
                    onCancel={() => navigate(`/projects/${projectId}/estimates`)}
                    preselectedProjectId={projectId}
                    availableEstimates={estimates}
                  />
                } />
                <Route path="quotes/:quoteId" element={
                  <QuoteEditWrapper 
                    quotes={quotes}
                    estimates={estimates}
                    projectId={projectId!}
                    mode="view"
                    onSave={() => {}}
                    onCancel={() => {
                      console.log('[QuoteViewWrapper] Back - navigating back to quotes tab', { projectId });
                      navigate(`/projects/${projectId}/estimates?tab=quotes`);
                    }}
                  />
                } />
                <Route path="quotes/:quoteId/edit" element={
                  <QuoteEditWrapper 
                    quotes={quotes}
                    estimates={estimates}
                    projectId={projectId!}
                    onSave={() => {
                      loadProjectData();
                      console.log('[QuoteEditWrapper] Save - navigating back to quotes tab', { projectId });
                      navigate(`/projects/${projectId}/estimates?tab=quotes`);
                    }}
                    onCancel={() => {
                      console.log('[QuoteEditWrapper] Cancel - navigating back to quotes tab', { projectId });
                      navigate(`/projects/${projectId}/estimates?tab=quotes`);
                    }}
                  />
                } />
                <Route path="quotes/new" element={
                  <QuoteForm
                    estimates={estimates}
                    preSelectedEstimateId={estimates.find((e) => e.status === "approved" || e.is_current_version)?.id}
                    onSave={handleSaveQuote}
                    onCancel={() => {
                      const searchParams = new URLSearchParams(window.location.search);
                      const tab = searchParams.get('tab') || 'quotes';
                      navigate(`/projects/${projectId}/estimates?tab=${tab}`);
                    }}
                  />
                } />
              </Route>
              
              <Route path="expenses" element={
                <ExpensesList 
                  expenses={expenses}
                  projectId={project.id}
                  onEdit={() => loadProjectData()}
                  onDelete={() => loadProjectData()}
                  onRefresh={loadProjectData}
                />
              } />
              
              <Route path="control" element={
                <LineItemControlDashboard projectId={project.id} project={project} />
              } />
              
              <Route path="changes" element={
                <ChangeOrdersList 
                  projectId={project.id}
                  projectContingencyRemaining={project.contingency_remaining || 0}
                  onEdit={(co) => {
                    setEditingChangeOrder(co);
                    setShowChangeOrderModal(true);
                  }}
                  onCreateNew={() => {
                    setEditingChangeOrder(null);
                    setShowChangeOrderModal(true);
                  }}
                />
              } />
              
              {/* Redirect old media route to new documents route */}
              <Route 
                path="media" 
                element={<Navigate to={`/projects/${projectId}/documents`} replace />} 
              />
              
              <Route path="documents" element={
                <ProjectDocumentsHub 
                  projectId={project.id}
                  projectName={project.project_name}
                  projectNumber={project.project_number}
                  clientName={project.client_name}
                />
              } />
              
              {isFeatureEnabled('scheduleView') && (
                <Route path="schedule" element={
                  <ProjectScheduleView
                    projectId={project.id}
                    projectStartDate={project.start_date}
                    projectEndDate={project.end_date}
                  />
                } />
              )}
              
              <Route path="edit" element={
                <ProjectEditForm 
                  project={project}
                  onSave={() => {
                    loadProjectData();
                    navigate(`/projects/${projectId}`);
                  }}
                  onCancel={() => navigate(`/projects/${projectId}`)}
                />
              } />
            </Routes>
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
        </SidebarInset>

        {/* Change Order Modal */}
        <Dialog open={showChangeOrderModal} onOpenChange={setShowChangeOrderModal}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <DialogTitle className="text-sm">
                {editingChangeOrder ? 'Edit Change Order' : 'Create New Change Order'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
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
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};
