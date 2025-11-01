import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { ProjectOverviewCompact } from "@/components/ProjectOverviewCompact";
import { EstimateVersionComparison } from "@/components/EstimateVersionComparison";
import { QuotesList } from "@/components/QuotesList";
import { ExpensesList } from "@/components/ExpensesList";
import { LineItemControlDashboard } from "@/components/LineItemControlDashboard";
import { GlobalExpenseMatching } from "@/components/GlobalExpenseMatching";
import { ChangeOrdersList } from "@/components/ChangeOrdersList";
import { ChangeOrderForm } from "@/components/ChangeOrderForm";
import { ProjectMediaGallery } from "@/components/ProjectMediaGallery";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { ProjectDocumentsHub } from "@/components/ProjectDocumentsHub";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useIsMobile } from "@/hooks/use-mobile";
import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProjectWithFinancials } from "@/utils/projectFinancials";
import type { Database } from "@/integrations/supabase/types";
import { BrandedLoader } from "@/components/ui/branded-loader";

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

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
  const [isLoading, setIsLoading] = useState(true);
  
  // Change Order Modal State
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  // Invalidate media queries when returning from capture pages
  useEffect(() => {
    if (location.state?.activeTab === 'photos' || location.state?.activeTab === 'videos') {
      queryClient.invalidateQueries({ queryKey: ['project-media'] });
    }
  }, [location.state, queryClient]);

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
        { data: changeOrdersData }
      ] = await Promise.all([
        supabase
          .from('estimates')
          .select('*')
          .eq('project_id', projectId)
          .order('date_created', { ascending: false }),
        supabase
          .from('quotes')
          .select('*')
          .eq('project_id', projectId)
          .order('date_received', { ascending: false }),
        supabase
          .from('expenses')
          .select('*')
          .eq('project_id', projectId)
          .order('expense_date', { ascending: false }),
        supabase
          .from('change_orders')
          .select('*')
          .eq('project_id', projectId)
          .order('requested_date', { ascending: false })
      ]);

      // Format the project data
      const formattedProject: Project = {
        ...projectData,
        created_at: new Date(projectData.created_at),
        updated_at: new Date(projectData.updated_at),
        start_date: projectData.start_date ? new Date(projectData.start_date) : undefined,
        end_date: projectData.end_date ? new Date(projectData.end_date) : undefined,
      };

      // Format estimates with proper typing
      const formattedEstimates: Estimate[] = (estimatesData || []).map(estimate => ({
        ...estimate,
        date_created: new Date(estimate.date_created),
        created_at: new Date(estimate.created_at),
        updated_at: new Date(estimate.updated_at),
        valid_until: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
        lineItems: [],
        defaultMarkupPercent: estimate.default_markup_percent || 25,
        targetMarginPercent: estimate.target_margin_percent || 20
      }));

      // Format quotes with proper typing
      const formattedQuotes = (quotesData || []).map(quote => ({
        ...quote,
        dateReceived: new Date(quote.date_received),
        createdAt: new Date(quote.created_at),
        updatedAt: new Date(quote.updated_at),
        validUntil: quote.valid_until ? new Date(quote.valid_until) : undefined,
        accepted_date: quote.accepted_date ? new Date(quote.accepted_date) : undefined,
        status: quote.status as any,
        projectName: formattedProject.project_name,
        client: formattedProject.client_name,
        quotedBy: '',
        quoteNumber: quote.quote_number || '',
        lineItems: [],
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
      })) as unknown as Quote[];

      // Format expenses with proper typing
      const formattedExpenses: Expense[] = (expensesData || []).map(expense => ({
        ...expense,
        expense_date: new Date(expense.expense_date),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
        category: expense.category as any
      }));

      // Project financials are already calculated by database functions
      const projectWithFinancials = formattedProject as ProjectWithFinancials;

      setProject(projectWithFinancials);
      setEstimates(formattedEstimates);
      setQuotes(formattedQuotes);
      setExpenses(formattedExpenses);
      setChangeOrders(changeOrdersData || []);

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
      <div className="min-h-screen flex w-full no-horizontal-scroll">
        <ProjectSidebar />
        
        <SidebarInset className="flex-1 flex flex-col no-horizontal-scroll overflow-hidden">
          {/* Compact Header */}
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            
            {!isMobile ? (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{project.project_number}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/projects')}
                className="h-8"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Projects
              </Button>
            )}
            
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold truncate">{project.project_name}</h1>
              <p className="text-xs text-muted-foreground truncate">
                #{project.project_number} • {project.client_name}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {project.status?.replace(/_/g, ' ')}
            </Badge>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto p-3 space-y-3">
            <Routes>
              <Route index element={
                <ProjectOverviewCompact
                  project={project}
                  marginData={project}
                  estimates={estimates}
                  quotes={quotes}
                  expenses={expenses}
                  changeOrders={changeOrders}
                />
              } />
              
              <Route path="estimates" element={
                <div className="space-y-3">
                  <EstimateVersionComparison projectId={project.id} />
                  <Separator />
                  <QuotesList 
                    quotes={quotes} 
                    estimates={estimates}
                    onEdit={() => loadProjectData()}
                    onDelete={() => loadProjectData()}
                    onCompare={() => {}}
                    onCreateNew={() => {}}
                  />
                </div>
              } />
              
              <Route path="expenses" element={
                <ExpensesList 
                  expenses={expenses}
                  onEdit={() => loadProjectData()}
                  onDelete={() => loadProjectData()}
                  onRefresh={loadProjectData}
                />
              } />
              
              <Route path="control" element={
                <LineItemControlDashboard projectId={project.id} />
              } />
              
              <Route path="matching" element={
                <GlobalExpenseMatching 
                  projectId={project.id} 
                  onClose={() => {
                    navigate(`/projects/${projectId}`);
                    loadProjectData();
                  }}
                />
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
