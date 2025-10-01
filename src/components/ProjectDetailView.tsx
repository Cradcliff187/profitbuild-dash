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
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProjectSelector } from "@/components/ProjectSelector";
import { ProjectStatusSelector } from "@/components/ProjectStatusSelector";
import { ProjectFinancialPendingView } from "@/components/ProjectFinancialPendingView";
import { VarianceAnalysis } from "@/components/VarianceAnalysis";
import { EstimateVersionComparison } from "@/components/EstimateVersionComparison";
import { ChangeOrdersList } from "@/components/ChangeOrdersList";
import { ChangeOrderForm } from "@/components/ChangeOrderForm";
import { ExpensesList } from "@/components/ExpensesList";
import { QuotesList } from "@/components/QuotesList";
import { LineItemControlDashboard } from "@/components/LineItemControlDashboard";
import { GlobalExpenseMatching } from "@/components/GlobalExpenseMatching";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Project, ProjectStatus } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateMultipleProjectFinancials, ProjectWithFinancials } from "@/utils/projectFinancials";
import { getMarginStatusLevel } from "@/types/margin";
import { cn, formatCurrency, getExpensePayeeLabel } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

export const ProjectDetailView = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [project, setProject] = useState<ProjectWithFinancials | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Change Order Modal State
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

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
        lineItems: [], // Will be loaded separately if needed
        defaultMarkupPercent: estimate.default_markup_percent || 15,
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
        status: quote.status as any, // Cast to handle enum differences
        // Add missing Quote fields
        projectName: formattedProject.project_name,
        client: formattedProject.client_name,
        quotedBy: '', // Will be populated from payee if needed
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
        category: expense.category as any // Cast to handle enum differences
      }));

      // Calculate project financials
      const [projectWithFinancials] = await calculateMultipleProjectFinancials(
        [formattedProject],
        formattedEstimates,
        formattedExpenses
      );

      setProject(projectWithFinancials);
      setEstimates(formattedEstimates);
      setQuotes(formattedQuotes);
      setExpenses(formattedExpenses);
      setChangeOrders(changeOrdersData || []);

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

  const getContextualActions = () => {
    if (!project) return [];
    
    const actions = [];
    
    switch (project.status) {
      case 'estimating':
        actions.push({
          label: 'Create Estimate',
          variant: 'default' as const,
          icon: Calculator,
          href: `/estimates/new?project=${project.id}`
        });
        break;
      case 'quoted':
        actions.push({
          label: 'Follow Up',
          variant: 'outline' as const,
          icon: Calendar,
          onClick: () => {
            toast({
              title: "Follow Up",
              description: "Feature coming soon - client follow-up tracking."
            });
          }
        });
        break;
      case 'approved':
        actions.push({
          label: 'Start Project',
          variant: 'default' as const,
          icon: Plus,
          onClick: () => {
            // TODO: Implement start project workflow
            toast({
              title: "Start Project",
              description: "Feature coming soon - project kickoff workflow."
            });
          }
        });
        break;
    }
    
    return actions;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
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

  const projectedMarginPct = project.currentContractAmount > 0 
    ? ((project.projectedMargin || 0) / project.currentContractAmount) * 100 
    : 0;
    
  const marginStatus = getMarginStatusLevel({
    project_id: project.id,
    contracted_amount: project?.currentContractAmount || 0,
    total_accepted_quotes: project.total_accepted_quotes || 0,
    current_margin: project.projectedMargin || 0,
    margin_percentage: projectedMarginPct,
    contingency_remaining: project.contingency_remaining || 0,
    minimum_threshold: project.minimum_margin_threshold || 10,
    target_margin: project.target_margin || 20,
    contingency_total: project.contingency_remaining || 0,
    contingency_used: 0,
    at_risk: false
  });

  const contextualActions = getContextualActions();
  const recentExpenses = expenses.slice(0, 3);
  const currentEstimate = estimates.find(e => e.is_current_version);
  const approvedChangeOrders = changeOrders.filter(co => co.status === 'approved');
  const hasApprovedEstimate = estimates.some(e => e.status === 'approved');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              {project.project_name}
              <ProjectStatusSelector
                projectId={project.id}
                currentStatus={project.status}
                projectName={project.project_name}
                hasApprovedEstimate={hasApprovedEstimate}
                estimateStatus={estimates.find(e => e.is_current_version)?.status || 
                              estimates.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())[0]?.status}
                onStatusChange={() => {
                  // Refresh project data
                  loadProjectData();
                }}
              />
            </h1>
            <p className="text-muted-foreground text-sm">
              #{project.project_number} • {project.client_name}
              {project.status !== 'estimating' && project.start_date && project.end_date && (
                <span className="ml-4">
                  {format(project.start_date, 'MMM dd')} - {format(project.end_date, 'MMM dd, yyyy')}
                </span>
              )}
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

      {/* Three-Tier Margin Dashboard */}
      {hasApprovedEstimate ? (
        <div className="space-y-4">
          {/* Revenue Section */}
          <Card className="border-l-4 border-l-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Contract Value
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold text-primary">
                {formatCurrency(project?.currentContractAmount)}
              </div>
              {approvedChangeOrders.length > 0 && (
                <div className="text-sm text-muted-foreground mt-1">
                  +{formatCurrency(approvedChangeOrders.reduce((sum, co) => sum + (co.amount || 0), 0))} change orders
                </div>
              )}
            </CardContent>
          </Card>

          {/* Three Margin Types */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-500" />
                  Original Margin
                </CardTitle>
                <p className="text-xs text-muted-foreground">Budget Planning</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg font-bold">
                  {formatCurrency(project.original_margin)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Revenue - Estimate Costs
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  Projected Margin
                </CardTitle>
                <p className="text-xs text-muted-foreground">With Quotes</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg font-bold">
                  {formatCurrency(project.projected_margin)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Revenue - Quote/Estimate Hybrid
                </div>
                <div className={cn(
                  "text-xs font-medium mt-1",
                  marginStatus === 'critical' && 'text-red-600',
                  marginStatus === 'at_risk' && 'text-orange-600',
                  marginStatus === 'on_target' && 'text-blue-600',
                  marginStatus === 'excellent' && 'text-green-600'
                )}>
                  {project.currentContractAmount > 0 
                    ? ((project.projected_margin || 0) / project.currentContractAmount * 100).toFixed(1)
                    : '0.0'
                  }% margin
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  Actual Margin
                </CardTitle>
                <p className="text-xs text-muted-foreground">Real Performance</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg font-bold">
                  {formatCurrency(project.actual_margin)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Revenue - Allocated Expenses
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense Allocation Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Expense Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Expenses:</span>
                <span className="font-semibold">{formatCurrency(project.actualExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Allocated to Line Items:</span>
                <span className="font-semibold">{formatCurrency((project.currentContractAmount || 0) - (project.actual_margin || 0))}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Transactions:</span>
                <span>{expenses.length} total</span>
              </div>
            </CardContent>
          </Card>

          {/* Margin Progression Indicator */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Margin Progression:</strong> Original → Projected → Actual shows your project's financial evolution from planning to execution.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <ProjectFinancialPendingView 
          project={project}
          estimates={estimates}
          onViewEstimates={() => setActiveTab('estimates')}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn(
          "flex overflow-x-auto w-full h-12 bg-muted/50 p-1 rounded-lg scrollbar-hide",
          isMobile ? "gap-1" : "lg:grid lg:grid-cols-6"
        )}>
          <TabsTrigger 
            value="overview" 
            className="text-sm font-medium flex-shrink-0 min-w-[120px] data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger 
              value="control"
              className="text-sm font-medium flex-shrink-0 min-w-[140px] data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold"
            >
              <Settings className="h-4 w-4 mr-2" />
              Line Item Control
            </TabsTrigger>
          )}
          {!isMobile && (
            <TabsTrigger 
              value="matching"
              className="text-sm font-medium flex-shrink-0 min-w-[140px] data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold"
            >
              <Target className="h-4 w-4 mr-2" />
              Expense Matching
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="estimates"
            className="text-sm font-medium flex-shrink-0 min-w-[120px] data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {isMobile ? `Estimates (${estimates.length})` : `Estimates & Quotes (${estimates.length})`}
          </TabsTrigger>
          <TabsTrigger 
            value="expenses"
            className="text-sm font-medium flex-shrink-0 min-w-[120px] data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Expenses ({expenses.length})
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger 
              value="changes"
              className="text-sm font-medium flex-shrink-0 min-w-[140px] data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold"
            >
              <FileText className="h-4 w-4 mr-2" />
              Change Orders ({changeOrders.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Project Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                          <div className="font-medium text-sm">{getExpensePayeeLabel(expense)}</div>
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

        <TabsContent value="control" className="space-y-4">
          <LineItemControlDashboard projectId={project.id} />
        </TabsContent>

        <TabsContent value="matching" className="space-y-4">
          <GlobalExpenseMatching 
            projectId={project.id} 
            onClose={() => {
              toast({
                title: "Matching Complete",
                description: "Expense matching has been updated."
              });
              loadProjectData(); // Refresh data
            }}
          />
        </TabsContent>

        <TabsContent value="estimates" className="space-y-4">
          <EstimateVersionComparison projectId={project.id} />
          <Separator />
          <QuotesList 
            quotes={quotes} 
            estimates={estimates}
            onEdit={() => {}}
            onDelete={() => {}}
            onCompare={() => {}}
            onAccept={() => {}}
            onCreateNew={() => {}}
          />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <ExpensesList 
            expenses={expenses}
            onEdit={() => {}}
            onDelete={() => {}}
            onRefresh={() => {}}
          />
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <ChangeOrdersList
            projectId={project.id}
            onEdit={(changeOrder) => {
              setEditingChangeOrder(changeOrder);
              setShowChangeOrderModal(true);
            }}
            onCreateNew={() => {
              setEditingChangeOrder(null);
              setShowChangeOrderModal(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Change Order Modal */}
      <Dialog open={showChangeOrderModal} onOpenChange={setShowChangeOrderModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingChangeOrder ? 'Edit Change Order' : 'Create New Change Order'}
            </DialogTitle>
          </DialogHeader>
          <ChangeOrderForm
            projectId={project.id}
            changeOrder={editingChangeOrder || undefined}
            onSuccess={() => {
              setShowChangeOrderModal(false);
              setEditingChangeOrder(null);
              loadProjectData(); // Refresh project data
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
        </DialogContent>
      </Dialog>
    </div>
  );
};