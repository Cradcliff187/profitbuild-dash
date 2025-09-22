import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { 
  Building2, 
  ArrowLeft, 
  Edit, 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Target,
  Calendar,
  AlertCircle,
  Plus,
  FileText,
  Settings,
  BarChart3,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProjectSelector } from "@/components/ProjectSelector";
import { VarianceAnalysis } from "@/components/VarianceAnalysis";
import { EstimateVersionComparison } from "@/components/EstimateVersionComparison";
import { ChangeOrdersList } from "@/components/ChangeOrdersList";
import { ExpensesList } from "@/components/ExpensesList";
import { QuotesList } from "@/components/QuotesList";
import { Project, ProjectStatus } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateMultipleProjectFinancials, ProjectWithFinancials } from "@/utils/projectFinancials";
import { getMarginStatusLevel } from "@/types/margin";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

export const ProjectDetailView = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<ProjectWithFinancials | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      
      // Load all project-related data
      const [projectRes, estimatesRes, quotesRes, expensesRes, changeOrdersRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('estimates').select('*').eq('project_id', projectId),
        supabase.from('quotes').select('*').eq('project_id', projectId),
        supabase.from('expenses').select('*').eq('project_id', projectId),
        supabase.from('change_orders').select('*').eq('project_id', projectId)
      ]);

      if (projectRes.error) {
        if (projectRes.error.code === 'PGRST116') {
          toast({
            title: "Project Not Found",
            description: "The requested project could not be found.",
            variant: "destructive"
          });
          navigate('/projects');
          return;
        }
        throw projectRes.error;
      }

      // Format project data
      const rawProject = {
        ...projectRes.data,
        created_at: new Date(projectRes.data.created_at),
        updated_at: new Date(projectRes.data.updated_at),
        start_date: projectRes.data.start_date ? new Date(projectRes.data.start_date) : undefined,
        end_date: projectRes.data.end_date ? new Date(projectRes.data.end_date) : undefined,
      };

      // Format estimates
      const formattedEstimates = (estimatesRes.data || []).map((estimate: any) => ({
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
        project_name: rawProject.project_name,
        client_name: rawProject.client_name,
        lineItems: [],
        defaultMarkupPercent: 15,
        targetMarginPercent: 20
      }));

      // Format quotes
      const formattedQuotes = (quotesRes.data || []).map((quote: any) => ({
        id: quote.id,
        project_id: quote.project_id,
        estimate_id: quote.estimate_id,
        payee_id: quote.payee_id,
        quoteNumber: quote.quote_number,
        total: quote.total_amount,
        date_received: new Date(quote.date_received),
        date_expires: quote.date_expires ? new Date(quote.date_expires) : undefined,
        status: quote.status,
        notes: quote.notes,
        attachment_url: quote.attachment_url,
        created_at: new Date(quote.created_at),
        updated_at: new Date(quote.updated_at),
        projectName: rawProject.project_name,
        client: rawProject.client_name,
        quotedBy: 'Unknown',
        dateReceived: new Date(quote.date_received),
        includes_materials: quote.includes_materials ?? true,
        includes_labor: quote.includes_labor ?? true,
        lineItems: [],
        subtotals: { labor: 0, subcontractors: 0, materials: 0, equipment: 0, other: 0 },
        createdAt: new Date(quote.created_at)
      }));

      // Format expenses
      const formattedExpenses = (expensesRes.data || []).map((expense: any) => ({
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

      // Calculate project financials
      const [projectWithFinancials] = await calculateMultipleProjectFinancials(
        [rawProject],
        formattedEstimates,
        formattedExpenses
      );

      setProject(projectWithFinancials);
      setEstimates(formattedEstimates);
      setQuotes(formattedQuotes);
      setExpenses(formattedExpenses);
      setChangeOrders(changeOrdersRes.data || []);
    } catch (error) {
      console.error('Error loading project data:', error);
      toast({
        title: "Error",
        description: "Failed to load project data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs capitalize px-2 py-0.5",
          status === 'approved' && 'border-green-200 text-green-700 bg-green-50',
          status === 'estimating' && 'border-gray-200 text-gray-700 bg-gray-50',
          status === 'quoted' && 'border-blue-200 text-blue-700 bg-blue-50',
          status === 'in_progress' && 'border-purple-200 text-purple-700 bg-purple-50',
          status === 'complete' && 'border-green-200 text-green-700 bg-green-50',
          status === 'on_hold' && 'border-yellow-200 text-yellow-700 bg-yellow-50',
          status === 'cancelled' && 'border-red-200 text-red-700 bg-red-50'
        )}
      >
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getContextualActions = () => {
    if (!project) return [];
    
    const actions = [];
    
    switch (project.status) {
      case 'estimating':
        actions.push({
          label: 'Create Estimate',
          icon: Calculator,
          href: `/estimates?project=${project.id}`,
          variant: 'default' as const
        });
        break;
      case 'quoted':
        actions.push({
          label: 'Review Quotes',
          icon: FileText,
          onClick: () => setActiveTab('quotes'),
          variant: 'default' as const
        });
        break;
      case 'in_progress':
        actions.push({
          label: 'Log Expense',
          icon: Plus,
          href: `/expenses?project=${project.id}`,
          variant: 'outline' as const
        });
        break;
    }

    return actions;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-64 bg-muted rounded"></div>
        <div className="h-96 bg-muted rounded"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
        <p className="text-muted-foreground mb-6">The requested project could not be found.</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const marginStatus = project.margin_percentage 
    ? getMarginStatusLevel({
        project_id: project.id,
        contracted_amount: project.contracted_amount || 0,
        total_accepted_quotes: project.total_accepted_quotes || 0,
        current_margin: project.current_margin || 0,
        margin_percentage: project.margin_percentage,
        contingency_total: 0,
        contingency_used: 0,
        contingency_remaining: project.contingency_remaining || 0,
        minimum_threshold: project.minimum_margin_threshold || 10,
        target_margin: project.target_margin || 20,
        at_risk: false
      })
    : 'unknown';

  const contextualActions = getContextualActions();
  const recentExpenses = expenses.slice(0, 3);
  const currentEstimate = estimates.find(e => e.is_current_version);
  const approvedChangeOrders = changeOrders.filter(co => co.status === 'approved');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              {project.project_name}
              {getStatusBadge(project.status)}
            </h1>
            <p className="text-muted-foreground">
              #{project.project_number} • {project.client_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contextualActions.map((action, index) => (
            <Button 
              key={index}
              variant={action.variant}
              size="sm"
              onClick={action.onClick}
              {...(action.href ? { onClick: () => window.location.href = action.href } : {})}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>
      </div>

      {/* Financial Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(project.contracted_amount)}
            </div>
            {approvedChangeOrders.length > 0 && (
              <div className="text-xs text-muted-foreground">
                +{formatCurrency(approvedChangeOrders.reduce((sum, co) => sum + (co.amount || 0), 0))} changes
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Current Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(project.current_margin)}
            </div>
            <div className={cn(
              "text-xs font-medium",
              marginStatus === 'critical' && 'text-red-600',
              marginStatus === 'at_risk' && 'text-orange-600',
              marginStatus === 'on_target' && 'text-blue-600',
              marginStatus === 'excellent' && 'text-green-600'
            )}>
              {project.margin_percentage?.toFixed(1)}% margin
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.target_margin || 20}%
            </div>
            <div className="text-xs text-muted-foreground">
              Min: {project.minimum_margin_threshold || 10}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(project.actualExpenses)}
            </div>
            <div className="text-xs text-muted-foreground">
              {expenses.length} transactions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Lifecycle Timeline */}
      {project.status !== 'estimating' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Project Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Progress Tracking</span>
                <span>{format(project.updated_at, 'PPp')}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Start: {project.start_date ? format(project.start_date, 'MMM dd, yyyy') : 'Not set'}</span>
                  <span>End: {project.end_date ? format(project.end_date, 'MMM dd, yyyy') : 'Not set'}</span>
                </div>
                {project.start_date && project.end_date && (
                  <Progress 
                    value={50} // Simplified progress calculation
                    className="h-2" 
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="estimates">
            Estimates & Quotes ({estimates.length})
          </TabsTrigger>
          <TabsTrigger value="expenses">
            Expenses & Performance ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="changes">
            Change Orders ({changeOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Project Type</div>
                  <div className="font-medium">
                    {project.project_type === 'construction_project' ? 'Construction Project' : 'Work Order'}
                  </div>
                </div>
                {project.job_type && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Job Type</div>
                    <div className="font-medium">{project.job_type}</div>
                  </div>
                )}
                {project.address && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Address</div>
                    <div className="font-medium">{project.address}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Payment Terms</div>
                  <div className="font-medium">{project.payment_terms || 'Net 30'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {recentExpenses.map((expense) => (
                      <div key={expense.id} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <div className="font-medium text-sm">{expense.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(expense.expense_date, 'MMM d, yyyy')} • {expense.category}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(expense.amount)}</div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('expenses')}>
                      View All Expenses
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estimates" className="space-y-6">
          {currentEstimate && (
            <EstimateVersionComparison projectId={project.id} />
          )}
          <QuotesList 
            quotes={quotes}
            estimates={estimates}
            onEdit={() => {}}
            onDelete={() => {}}
            onCompare={() => {}}
            onCreateNew={() => {}}
          />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          {expenses.length > 0 && (
            <VarianceAnalysis projectId={project.id} />
          )}
          <ExpensesList 
            expenses={expenses}
            onEdit={() => {}}
            onDelete={() => {}}
            onRefresh={loadProjectData}
          />
        </TabsContent>

        <TabsContent value="changes" className="space-y-6">
          <ChangeOrdersList
            projectId={project.id}
            onEdit={() => {}}
            onCreateNew={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};