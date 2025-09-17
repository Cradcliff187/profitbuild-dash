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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import WorkOrdersList from "@/components/WorkOrdersList";
import CreateWorkOrderModal from "@/components/CreateWorkOrderModal";
import { calculateProjectProfit } from "@/utils/profitCalculations";
import { getBudgetAlertThreshold } from "@/utils/budgetUtils";
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
        total_amount: estimate.total_amount,
        notes: estimate.notes,
        created_by: estimate.created_by,
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
        <div className="flex justify-center items-center py-12">
          <div className="text-muted-foreground">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Budget Alert Banner */}
      {overBudgetProjects.length > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            <strong>WARNING:</strong> {overBudgetProjects.length} project{overBudgetProjects.length > 1 ? 's are' : ' is'} over their estimated/quoted budget
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your construction projects</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-construction hover:bg-construction/90 text-construction-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="client">Client</Label>
                <Input
                  id="client"
                  value={newProject.client}
                  onChange={(e) => setNewProject(prev => ({ ...prev, client: e.target.value }))}
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
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
              <Button onClick={handleAddProject} className="w-full">
                Add Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProfit.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Tabs */}
      <Tabs defaultValue="all-projects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all-projects">All Projects</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-projects">
          <Card>
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectsWithProfit.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold">{project.name}</h3>
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
                      <p className="text-sm text-muted-foreground">Client: {project.client}</p>
                      {project.quotedAmount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Quoted: ${project.quotedAmount.toLocaleString()} | 
                          Actual: ${project.actualCosts.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${project.profit.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Profit</div>
                      {project.quotedAmount > 0 && (
                        <div className={`text-xs ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {((project.profit / project.quotedAmount) * 100).toFixed(1)}% margin
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {projectsWithProfit.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No projects yet. Add your first project to get started!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="work-orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Work Orders</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Quick projects with optional estimates
                </p>
              </div>
              <Button onClick={() => setShowCreateWorkOrderModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Work Order
              </Button>
            </CardHeader>
            <CardContent>
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