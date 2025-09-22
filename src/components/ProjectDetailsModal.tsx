import React from "react";
import { format } from "date-fns";
import { Building2, Calendar, DollarSign, Target, TrendingUp, MapPin, User, Phone, Mail, FileText, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Project, ProjectStatus } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Expense } from "@/types/expense";

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  estimates?: Estimate[];
  expenses?: Expense[];
  onEdit?: () => void;
  onViewFinancials?: () => void;
}

export const ProjectDetailsModal = ({
  isOpen,
  onClose,
  project,
  estimates = [],
  expenses = [],
  onEdit,
  onViewFinancials
}: ProjectDetailsModalProps) => {
  if (!project) return null;

  const projectEstimates = estimates.filter(e => e.project_id === project.id);
  const projectExpenses = expenses.filter(e => e.project_id === project.id);
  const totalExpenses = projectExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const estimatedCost = projectEstimates.reduce((sum, est) => sum + (est.total_amount || 0), 0);

  const getStatusBadge = (status: ProjectStatus) => {
    const configs = {
      'estimating': { variant: 'default' as const, className: 'bg-blue-100 text-blue-800' },
      'quoted': { variant: 'default' as const, className: 'bg-purple-100 text-purple-800' },
      'approved': { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      'in_progress': { variant: 'default' as const, className: 'bg-yellow-100 text-yellow-800' },
      'complete': { variant: 'default' as const, className: 'bg-gray-100 text-gray-800' },
      'on_hold': { variant: 'default' as const, className: 'bg-orange-100 text-orange-800' },
      'cancelled': { variant: 'default' as const, className: 'bg-red-100 text-red-800' }
    };
    
    const config = configs[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ').toUpperCase()}
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

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Not set';
    return format(new Date(date), 'PPP');
  };

  const budgetUtilization = estimatedCost > 0 ? (totalExpenses / estimatedCost) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {project.project_name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4">
                <span>#{project.project_number}</span>
                <span>•</span>
                <span>{project.client_name}</span>
                <span>•</span>
                {getStatusBadge(project.status)}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {onViewFinancials && (
                <Button variant="outline" size="sm" onClick={onViewFinancials}>
                  <FileText className="h-4 w-4 mr-2" />
                  Financials
                </Button>
              )}
              {onEdit && (
                <Button size="sm" onClick={onEdit}>
                  Edit Project
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Project Type</div>
                    <div className="font-medium">
                      {project.project_type === 'construction_project' ? 'Construction Project' : 'Work Order'}
                    </div>
                  </div>
                  {project.job_type && (
                    <div>
                      <div className="text-xs text-muted-foreground">Job Type</div>
                      <div className="font-medium">{project.job_type}</div>
                    </div>
                  )}
                  {project.address && (
                    <div>
                      <div className="text-xs text-muted-foreground">Address</div>
                      <div className="font-medium">{project.address}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Payment Terms</div>
                    <div className="font-medium">{project.payment_terms || 'Net 30'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Client Name</div>
                    <div className="font-medium">{project.client_name}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Contract Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(project.contracted_amount)}
                  </div>
                  {project.total_accepted_quotes && project.total_accepted_quotes !== project.contracted_amount && (
                    <div className="text-sm text-muted-foreground">
                      Base: {formatCurrency(project.total_accepted_quotes)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Current Margin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(project.current_margin)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {project.margin_percentage ? `${project.margin_percentage.toFixed(1)}%` : 'N/A'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Target Margin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {project.target_margin || 20}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Min: {project.minimum_margin_threshold || 10}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {estimatedCost > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={Math.min(budgetUtilization, 100)} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>Spent: {formatCurrency(totalExpenses)}</span>
                    <span>Budget: {formatCurrency(estimatedCost)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {budgetUtilization.toFixed(1)}% of estimated cost utilized
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Project Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Start Date</div>
                    <div className="font-medium">{formatDate(project.start_date)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Target End Date</div>
                    <div className="font-medium">{formatDate(project.end_date)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Project Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(project.status)}
                    <span className="text-sm text-muted-foreground">
                      Updated {format(project.updated_at, 'PPp')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {projectExpenses.length > 0 ? (
                  <div className="space-y-2">
                    {projectExpenses.slice(0, 5).map((expense) => (
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
                    <div className="pt-2 border-t">
                      <div className="flex justify-between font-medium">
                        <span>Total Expenses</span>
                        <span>{formatCurrency(totalExpenses)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No expenses recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};