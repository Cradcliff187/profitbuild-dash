import { useState, useEffect } from "react";
import { Plus, TrendingUp, Building, CheckCircle, AlertTriangle } from "lucide-react";
import { VarianceBadge } from "@/components/ui/variance-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import WorkOrdersList from "@/components/WorkOrdersList";
import CreateWorkOrderModal from "@/components/CreateWorkOrderModal";
import { calculateProjectProfit } from "@/utils/profitCalculations";
import { getBudgetAlertThreshold } from "@/utils/budgetUtils";
import { formatCurrency } from "@/lib/utils";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { Project } from "@/types/project";

interface ProjectWithProfit {
  id: string;
  name: string;
  status: string;
  profit: number;
  client: string;
  actualCosts: number;
  quotedAmount: number;
  estimateAmount: number;
  overagePercentage?: number;
  estimateOveragePercentage?: number;
  budgetType?: 'estimate' | 'quote' | 'both';
}

const Dashboard = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsWithProfit, setProjectsWithProfit] = useState<ProjectWithProfit[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overBudgetProjects, setOverBudgetProjects] = useState<ProjectWithProfit[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showCreateWorkOrderModal, setShowCreateWorkOrderModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    client: "",
    status: "estimating",
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all data in parallel
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

      const projectsData = projectsRes.data || [];
      const estimatesData = estimatesRes.data || [];
      const quotesData = quotesRes.data || [];
      const expensesData = expensesRes.data || [];

      // Format the data
      const formattedProjects: Project[] = projectsData.map((project: any) => ({
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
      }));

      const formattedEstimates: Estimate[] = estimatesData.map((estimate: any) => ({
        id: estimate.id,
        project_id: estimate.project_id,
        estimate_number: estimate.estimate_number,
        revision_number: estimate.revision_number,
        date_created: new Date(estimate.date_created),
        valid_until: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
        status: estimate.status,
        defaultMarkupPercent: estimate.defaultMarkupPercent || 15,
        targetMarginPercent: estimate.targetMarginPercent || 20,
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
        lineItems: [] // Add empty array for required property
      }));

      const formattedQuotes: Quote[] = quotesData.map((quote: any) => ({
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
      }));

      const formattedExpenses: Expense[] = expensesData.map((expense: any) => ({
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
      }));

      // Calculate profit data and identify over-budget projects
      const projectsWithProfitData: ProjectWithProfit[] = formattedProjects.map(project => {
        const projectEstimates = formattedEstimates.filter(e => e.project_id === project.id);
        const projectQuotes = formattedQuotes.filter(q => q.project_id === project.id);
        const projectExpenses = formattedExpenses.filter(e => e.project_id === project.id);
        
        if (projectEstimates.length === 0) {
          return {
            id: project.id,
            name: project.project_name,
            status: project.status,
            profit: 0,
            client: project.client_name,
            actualCosts: 0,
            quotedAmount: 0,
            estimateAmount: 0
          };
        }

        const estimate = projectEstimates[0]; // Use first estimate
        const profitData = calculateProjectProfit(estimate, projectQuotes, projectExpenses);
        
        // Calculate both quote and estimate overage percentages
        const quoteOveragePercentage = profitData.quoteTotal > 0 
          ? ((profitData.actualExpenses - profitData.quoteTotal) / profitData.quoteTotal) * 100
          : 0;

        const estimateOveragePercentage = estimate.total_amount > 0
          ? ((profitData.actualExpenses - estimate.total_amount) / estimate.total_amount) * 100
          : 0;

        // Get the configurable budget threshold
        const threshold = getBudgetAlertThreshold();
        
        // Determine which budget was exceeded
        let budgetType: 'estimate' | 'quote' | 'both' | undefined;
        if (quoteOveragePercentage > threshold && estimateOveragePercentage > threshold) {
          budgetType = 'both';
        } else if (quoteOveragePercentage > threshold) {
          budgetType = 'quote';
        } else if (estimateOveragePercentage > threshold) {
          budgetType = 'estimate';
        }

        return {
          id: project.id,
          name: project.project_name,
          status: project.status,
          profit: profitData.actualProfit,
          client: project.client_name,
          actualCosts: profitData.actualExpenses,
          quotedAmount: profitData.quoteTotal,
          estimateAmount: estimate.total_amount,
          overagePercentage: quoteOveragePercentage > 0 ? quoteOveragePercentage : undefined,
          estimateOveragePercentage: estimateOveragePercentage > 0 ? estimateOveragePercentage : undefined,
          budgetType
        };
      });

      // Identify projects over budget by configurable threshold (either estimate or quote)
      const threshold = getBudgetAlertThreshold();
      const overBudget = projectsWithProfitData.filter(project => 
        (project.overagePercentage && project.overagePercentage > threshold) ||
        (project.estimateOveragePercentage && project.estimateOveragePercentage > threshold)
      );

      setProjects(formattedProjects);
      setProjectsWithProfit(projectsWithProfitData);
      setEstimates(formattedEstimates);
      setQuotes(formattedQuotes);
      setExpenses(formattedExpenses);
      setOverBudgetProjects(overBudget);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status !== "complete").length;
  const totalProfit = projectsWithProfit.reduce((sum, p) => sum + p.profit, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "estimating":
        return "bg-muted text-muted-foreground";
      case "in_progress":
      case "quoted":
      case "approved":
        return "bg-warning text-warning-foreground";
      case "complete":
        return "bg-success text-success-foreground";
      case "on_hold":
        return "bg-muted text-muted-foreground";
      case "cancelled":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name || !newProject.client) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Create project in Supabase
    try {
      const { error } = await supabase.from('projects').insert({
        project_name: newProject.name,
        project_number: `PRJ-${Date.now()}`,
        client_name: newProject.client,
        status: newProject.status as 'estimating' | 'quoted' | 'in_progress' | 'complete' | 'cancelled',
        project_type: 'construction_project',
        company_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' // This should come from user context
      });

      if (error) throw error;

      await loadAllData(); // Reload data
      setNewProject({ name: "", client: "", status: "estimating" });
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Project added successfully",
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <LoadingSpinner 
          variant="page" 
          message="Loading dashboard data..." 
        />
      </div>
    );
  }

  return (
    <div className="dense-spacing">
      {/* Budget Alert Banner */}
      {overBudgetProjects.length > 0 && (
        <Alert className="border-destructive bg-destructive/10 p-2">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <AlertDescription className="text-destructive text-label font-medium">
            <strong>WARNING:</strong> {overBudgetProjects.length} project{overBudgetProjects.length > 1 ? 's are' : ' is'} over their estimated/quoted budget
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-interface font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-label">Overview of your construction projects</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-construction hover:bg-construction/90 text-construction-foreground h-btn-compact text-label">
              <Plus className="h-3 w-3 mr-1" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="p-compact">
              <DialogTitle className="text-interface">Add New Project</DialogTitle>
            </DialogHeader>
            <div className="form-dense p-compact">
              <div>
                <Label htmlFor="name" className="text-label">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                  className="h-input-compact text-label"
                />
              </div>
              <div>
                <Label htmlFor="client" className="text-label">Client</Label>
                <Input
                  id="client"
                  value={newProject.client}
                  onChange={(e) => setNewProject(prev => ({ ...prev, client: e.target.value }))}
                  placeholder="Enter client name"
                  className="h-input-compact text-label"
                />
              </div>
              <div>
                <Label htmlFor="status" className="text-label">Status</Label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="h-input-compact text-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estimating">Estimating</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddProject} size="sm" className="w-full h-btn-compact text-label">
                Add Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card className="compact-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-compact pb-1">
            <CardTitle className="text-label font-medium">Total Projects</CardTitle>
            <Building className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-compact pt-0">
            <div className="text-xl font-bold font-mono">{totalProjects}</div>
          </CardContent>
        </Card>

        <Card className="compact-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-compact pb-1">
            <CardTitle className="text-label font-medium">Active Projects</CardTitle>
            <CheckCircle className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-compact pt-0">
            <div className="text-xl font-bold font-mono">{activeProjects}</div>
          </CardContent>
        </Card>

        <Card className="compact-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-compact pb-1">
            <CardTitle className="text-label font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-compact pt-0">
            <div className="text-xl font-bold font-mono">{formatCurrency(totalProfit, { showCents: false })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Tabs */}
      <Tabs defaultValue="all-projects" className="dense-spacing">
        <TabsList className="h-8">
          <TabsTrigger value="all-projects" className="text-label">All Projects</TabsTrigger>
          <TabsTrigger value="work-orders" className="text-label">Work Orders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-projects">
          <Card className="compact-card">
            <CardHeader className="p-compact">
              <CardTitle className="text-interface">All Projects</CardTitle>
            </CardHeader>
            <CardContent className="p-compact">
              <div className="space-y-2">
                {projectsWithProfit.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-2 border border-border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-interface font-semibold">{project.name}</h3>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                        {/* Show variance badge for quote overage */}
                        {project.overagePercentage && project.overagePercentage > 0 && (
                          <VarianceBadge 
                            variance={project.actualCosts - project.quotedAmount}
                            percentage={project.overagePercentage}
                            type="quote"
                          />
                        )}
                        {/* Show variance badge for estimate overage if no quote variance */}
                        {!project.overagePercentage && project.estimateOveragePercentage && project.estimateOveragePercentage > 0 && (
                          <VarianceBadge 
                            variance={project.actualCosts - project.estimateAmount}
                            percentage={project.estimateOveragePercentage}
                            type="estimate"
                          />
                        )}
                      </div>
                      <p className="text-label text-muted-foreground">Client: {project.client}</p>
                      {project.quotedAmount > 0 && (
                        <p className="text-label text-muted-foreground font-mono">
                          Quoted: {formatCurrency(project.quotedAmount, { showCents: false })} | 
                          Actual: {formatCurrency(project.actualCosts, { showCents: false })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-interface font-semibold font-mono ${project.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(project.profit, { showCents: false })}
                      </div>
                      <div className="text-label text-muted-foreground">Profit</div>
                      {project.quotedAmount > 0 && (
                        <div className={`text-label font-mono ${project.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {((project.profit / project.quotedAmount) * 100).toFixed(1)}% margin
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {projectsWithProfit.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-label">No projects yet. Add your first project to get started!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="work-orders">
          <Card className="compact-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-compact">
              <div>
                <CardTitle className="text-interface">Work Orders</CardTitle>
                <p className="text-label text-muted-foreground mt-0.5">
                  Quick projects with optional estimates
                </p>
              </div>
              <Button onClick={() => setShowCreateWorkOrderModal(true)} size="sm" className="h-btn-compact text-label">
                <Plus className="h-3 w-3 mr-1" />
                Create Work Order
              </Button>
            </CardHeader>
            <CardContent className="p-compact">
              <WorkOrdersList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateWorkOrderModal 
        open={showCreateWorkOrderModal}
        onOpenChange={setShowCreateWorkOrderModal}
      />
    </div>
  );
};

export default Dashboard;