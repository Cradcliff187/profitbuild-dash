import { useState, useEffect } from "react";
import { Building2, Table, Grid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectsList } from "@/components/ProjectsList";
import { ProjectsTableView } from "@/components/ProjectsTableView";
import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateMultipleProjectFinancials, ProjectWithFinancials } from "@/utils/projectFinancials";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = 'list' | 'create';
type DisplayMode = 'cards' | 'table';

const Projects = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<ProjectWithFinancials[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(isMobile ? 'cards' : 'table');

  // Load projects from Supabase
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      
      // Load all related data
      const [projectsRes, estimatesRes, quotesRes, expensesRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('estimates').select('*'),
        supabase.from('quotes').select('*'),
        supabase.from('expenses').select('*')
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (estimatesRes.error) throw estimatesRes.error;
      if (quotesRes.error) throw quotesRes.error;
      if (expensesRes.error) throw expensesRes.error;

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
        contracted_amount: project.contracted_amount,
        total_accepted_quotes: project.total_accepted_quotes,
        current_margin: project.current_margin,
        margin_percentage: project.margin_percentage,
        contingency_remaining: project.contingency_remaining,
        payment_terms: project.payment_terms,
        minimum_margin_threshold: project.minimum_margin_threshold,
        target_margin: project.target_margin,
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
        version_number: estimate.version_number || 1,
        parent_estimate_id: estimate.parent_estimate_id || undefined,
        is_current_version: estimate.is_current_version ?? true,
        valid_for_days: estimate.valid_for_days || 30,
        created_at: new Date(estimate.created_at),
        updated_at: new Date(estimate.updated_at),
        project_name: formattedProjects.find(p => p.id === estimate.project_id)?.project_name,
        client_name: formattedProjects.find(p => p.id === estimate.project_id)?.client_name,
        lineItems: [], // Add empty array for required property
        defaultMarkupPercent: 15,
        targetMarginPercent: 20
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
        payee_id: expense.payee_id,
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

      // Calculate financial data for all projects
      const projectsWithFinancials = await calculateMultipleProjectFinancials(
        formattedProjects,
        formattedEstimates,
        formattedExpenses
      );

      setProjects(projectsWithFinancials);
      setEstimates(formattedEstimates);
      setQuotes(formattedQuotes);
      setExpenses(formattedExpenses);
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

  const handleSaveProject = async (project: Project) => {
    // Calculate financial data for the saved project
    const projectWithFinancials = await calculateMultipleProjectFinancials(
      [project],
      estimates,
      expenses
    );
    
    // Creating new project - editing is now handled by dedicated edit page
    setProjects(prev => [projectWithFinancials[0], ...prev]);
    setViewMode('list');
    loadProjects(); // Refresh the list
  };

  const handleCreateNew = () => {
    setViewMode('create');
  };

  const handleEdit = (project: Project) => {
    // Navigate to the dedicated edit page
    window.location.href = `/projects/${project.id}/edit`;
  };

  const handleDelete = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const handleCancel = () => {
    setViewMode('list');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">
            {viewMode === 'create' ? 'Create a new project' : 
             'Manage your construction projects and work orders'}
          </p>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* View Toggle - Desktop Only */}
          {!isMobile && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant={displayMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('cards')}
              >
                <Grid className="h-4 w-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={displayMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('table')}
              >
                <Table className="h-4 w-4 mr-2" />
                Table
              </Button>
            </div>
          )}

          {/* Display Projects */}
          {(displayMode === 'cards' || isMobile) ? (
            <ProjectsList
              projects={projects}
              estimates={estimates}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCreateNew={handleCreateNew}
              onRefresh={loadProjects}
            />
          ) : (
            <ProjectsTableView
              projects={projects}
              estimates={estimates}
              onEdit={handleEdit}
              onView={handleEdit}
              onCreateNew={handleCreateNew}
              isLoading={isLoading}
            />
          )}
        </div>
      )}

      {viewMode === 'create' && (
        <ProjectForm
          onSave={handleSaveProject}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default Projects;