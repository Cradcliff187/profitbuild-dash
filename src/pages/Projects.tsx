import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { ProjectsList } from "@/components/ProjectsList";
import { ProjectProfitMargin } from "@/components/ProjectProfitMargin";
import { ChangeOrdersList } from "@/components/ChangeOrdersList";
import { ChangeOrderForm } from "@/components/ChangeOrderForm";
import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateProjectProfit } from "@/utils/profitCalculations";
import type { Database } from "@/integrations/supabase/types";

type ViewMode = 'list' | 'create' | 'edit';
type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

const Projects = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectProfit, setSelectedProjectProfit] = useState<{
    contractAmount: number;
    actualCosts: number;
  } | null>(null);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [showChangeOrderForm, setShowChangeOrderForm] = useState(false);
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load projects from Supabase
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      
      // Load all related data
      const [projectsRes, estimatesRes, quotesRes, expensesRes, changeOrdersRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('estimates').select('*'),
        supabase.from('quotes').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('change_orders').select('*')
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (estimatesRes.error) throw estimatesRes.error;
      if (quotesRes.error) throw quotesRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (changeOrdersRes.error) throw changeOrdersRes.error;

      const formattedProjects = projectsRes.data?.map((project: any) => ({
        id: project.id,
        project_name: project.project_name,
        project_number: project.project_number,
        qb_formatted_number: project.qb_formatted_number,
        client_name: project.client_name,
        address: project.address,
        project_type: project.project_type,
        job_type: project.job_type,
        status: project.status,
        start_date: project.start_date ? new Date(project.start_date) : undefined,
        end_date: project.end_date ? new Date(project.end_date) : undefined,
        company_id: project.company_id,
        quickbooks_job_id: project.quickbooks_job_id,
        sync_status: project.sync_status,
        last_synced_at: project.last_synced_at,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at)
      })) || [];

      const formattedEstimates = estimatesRes.data?.map((estimate: any) => ({
        id: estimate.id,
        project_id: estimate.project_id,
        estimate_number: estimate.estimate_number,
        revision_number: estimate.revision_number,
        date_created: new Date(estimate.date_created),
        valid_until: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
        status: estimate.status,
        total_amount: estimate.total_amount,
        notes: estimate.notes,
        created_by: estimate.created_by,
        contingency_percent: estimate.contingency_percent || 10.0,
        contingency_amount: estimate.contingency_amount,
        contingency_used: estimate.contingency_used || 0,
        created_at: new Date(estimate.created_at),
        updated_at: new Date(estimate.updated_at),
        project_name: formattedProjects.find(p => p.id === estimate.project_id)?.project_name,
        client_name: formattedProjects.find(p => p.id === estimate.project_id)?.client_name,
        lineItems: [] // Add empty array for required property
      })) || [];

      const formattedQuotes = quotesRes.data?.map((quote: any) => ({
        id: quote.id,
        project_id: quote.project_id,
        estimate_id: quote.estimate_id,
        payee_id: quote.payee_id,
        quoteNumber: quote.quote_number, // Map to correct property name
        total: quote.total_amount,
        date_received: new Date(quote.date_received),
        date_expires: quote.date_expires ? new Date(quote.date_expires) : undefined,
        status: quote.status,
        notes: quote.notes,
        attachment_url: quote.attachment_url,
        created_at: new Date(quote.created_at),
        updated_at: new Date(quote.updated_at),
        // Add required properties from Quote interface
        projectName: formattedProjects.find(p => p.id === quote.project_id)?.project_name || '',
        client: formattedProjects.find(p => p.id === quote.project_id)?.client_name || '',
        quotedBy: 'Unknown', // Default value
        dateReceived: new Date(quote.date_received),
        includes_materials: quote.includes_materials ?? true,
        includes_labor: quote.includes_labor ?? true,
        lineItems: [], // Empty array for line items
        subtotals: {
          labor: 0,
          subcontractors: 0,
          materials: 0,
          equipment: 0,
          other: 0
        },
        createdAt: new Date(quote.created_at)
      })) || [];

      const formattedExpenses = expensesRes.data?.map((expense: any) => ({
        id: expense.id,
        project_id: expense.project_id,
        vendor_id: expense.vendor_id,
        amount: expense.amount,
        description: expense.description,
        expense_date: new Date(expense.expense_date),
        category: expense.category,
        transaction_type: expense.transaction_type,
        invoice_number: expense.invoice_number,
        account_name: expense.account_name,
        account_full_name: expense.account_full_name,
        is_planned: expense.is_planned,
        attachment_url: expense.attachment_url,
        quickbooks_transaction_id: expense.quickbooks_transaction_id,
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at)
      })) || [];

      setProjects(formattedProjects);
      setEstimates(formattedEstimates);
      setQuotes(formattedQuotes);
      setExpenses(formattedExpenses);
      setChangeOrders(changeOrdersRes.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProject = (project: Project) => {
    if (selectedProject) {
      // Editing existing project
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    } else {
      // Creating new project
      setProjects(prev => [project, ...prev]);
    }
    setViewMode('list');
    setSelectedProject(null);
    loadProjects(); // Refresh the list
  };

  const handleCreateNew = () => {
    setSelectedProject(null);
    setViewMode('create');
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    
    // Calculate profit data for the selected project
    const projectEstimates = estimates.filter(e => e.project_id === project.id);
    if (projectEstimates.length > 0) {
      const estimate = projectEstimates[0];
      const projectQuotes = quotes.filter(q => q.project_id === project.id);
      const projectExpenses = expenses.filter(e => e.project_id === project.id);
      
      const profitData = calculateProjectProfit(estimate, projectQuotes, projectExpenses);
      setSelectedProjectProfit({
        contractAmount: profitData.quoteTotal,
        actualCosts: profitData.actualExpenses
      });
    } else {
      setSelectedProjectProfit(null);
    }
    
    setViewMode('edit');
  };

  const handleDelete = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedProject(null);
    setShowChangeOrderForm(false);
    setEditingChangeOrder(null);
  };

  const handleCreateChangeOrder = () => {
    setEditingChangeOrder(null);
    setShowChangeOrderForm(true);
  };

  const handleEditChangeOrder = (changeOrder: ChangeOrder) => {
    setEditingChangeOrder(changeOrder);
    setShowChangeOrderForm(true);
  };

  const handleChangeOrderSuccess = () => {
    setShowChangeOrderForm(false);
    setEditingChangeOrder(null);
    loadProjects(); // Refresh data
  };

  const handleChangeOrderCancel = () => {
    setShowChangeOrderForm(false);
    setEditingChangeOrder(null);
  };

  const handleContinueToEstimate = (project: Project) => {
    // Navigate to estimates page
    toast({
      title: "Project Created",
      description: `Project ${project.project_number} created. You can now create estimates.`
    });
    setViewMode('list');
    setSelectedProject(null);
  };

  const handleContinueToExpenses = (project: Project) => {
    // Navigate to expenses page
    toast({
      title: "Project Created",
      description: `Work order ${project.project_number} created. You can now track expenses.`
    });
    setViewMode('list');
    setSelectedProject(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">
            {viewMode === 'create' ? 'Create a new project' : 
             viewMode === 'edit' ? 'Edit project details' : 
             'Manage your construction projects and work orders'}
          </p>
        </div>
      </div>

      {viewMode === 'list' && (
        <ProjectsList
          projects={projects}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
          onRefresh={loadProjects}
        />
      )}

      {viewMode === 'create' && (
        <ProjectForm
          onSave={handleSaveProject}
          onCancel={handleCancel}
          onContinueToEstimate={handleContinueToEstimate}
          onContinueToExpenses={handleContinueToExpenses}
        />
      )}

      {viewMode === 'edit' && selectedProject && (
        <div className="space-y-6">
          {/* Project Change Orders Summary */}
          {(() => {
            const projectChangeOrders = changeOrders.filter(co => co.project_id === selectedProject.id);
            const approvedTotal = projectChangeOrders
              .filter(co => co.status === 'approved')
              .reduce((sum, co) => sum + (Number(co.amount) || 0), 0);
            
            if (approvedTotal > 0) {
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900">Project Change Orders</h3>
                      <p className="text-sm text-blue-700">
                        {projectChangeOrders.filter(co => co.status === 'approved').length} approved change orders
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-900">
                        +${approvedTotal.toLocaleString('en-US', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </div>
                      <div className="text-sm text-blue-700">Total Approved Changes</div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProjectEditForm
                project={selectedProject}
                onSave={handleSaveProject}
                onCancel={handleCancel}
              />
              
              {/* Change Orders Section */}
              {showChangeOrderForm ? (
                <ChangeOrderForm
                  projectId={selectedProject.id}
                  changeOrder={editingChangeOrder}
                  onSuccess={handleChangeOrderSuccess}
                  onCancel={handleChangeOrderCancel}
                />
              ) : (
                <ChangeOrdersList
                  projectId={selectedProject.id}
                  onEdit={handleEditChangeOrder}
                  onCreateNew={handleCreateChangeOrder}
                />
              )}
            </div>
            {selectedProjectProfit && selectedProjectProfit.contractAmount > 0 && (
              <div className="lg:col-span-1">
                <ProjectProfitMargin
                  contractAmount={selectedProjectProfit.contractAmount}
                  actualCosts={selectedProjectProfit.actualCosts}
                  projectName={selectedProject.project_name}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;