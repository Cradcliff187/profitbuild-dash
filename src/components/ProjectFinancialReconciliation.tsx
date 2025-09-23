import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target
} from "lucide-react";
import { ProjectFinancialSummary } from "@/types/revenue";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProjectFinancialReconciliationProps {
  projectId?: string;
}

export const ProjectFinancialReconciliation: React.FC<ProjectFinancialReconciliationProps> = ({
  projectId
}) => {
  const [financialData, setFinancialData] = useState<ProjectFinancialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectFinancialSummary | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFinancialData();
  }, [projectId]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('project_financial_summary').select('*');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setFinancialData(data || []);
      
      if (projectId && data && data.length > 0) {
        setSelectedProject(data[0]);
      }
      
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getVarianceBadge = (variance: number, type: 'cost' | 'revenue' = 'cost') => {
    const isGood = type === 'cost' ? variance > 0 : variance >= 0;
    const variant = isGood ? 'secondary' : 'destructive';
    const icon = isGood ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />;
    const colorClass = isGood ? 'bg-green-100 text-green-800 border-green-200' : '';
    
    return (
      <Badge variant={variant} className={`flex items-center gap-1 ${colorClass}`}>
        {icon}
        {formatCurrency(Math.abs(variance))} {variance < 0 ? 'over' : 'under'}
      </Badge>
    );
  };

  const getMarginStatus = (marginPercentage: number) => {
    if (marginPercentage >= 25) return { color: 'text-green-600', status: 'Excellent', icon: TrendingUp };
    if (marginPercentage >= 15) return { color: 'text-blue-600', status: 'Good', icon: Target };
    if (marginPercentage >= 5) return { color: 'text-yellow-600', status: 'At Risk', icon: AlertTriangle };
    return { color: 'text-red-600', status: 'Critical', icon: TrendingDown };
  };

  const renderOverviewCards = (project: ProjectFinancialSummary) => {
    const marginStatus = getMarginStatus(project.actual_margin_percentage);
    const MarginIcon = marginStatus.icon;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(project.total_invoiced + project.change_order_revenue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {project.invoice_count} invoices
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(project.total_expenses + project.change_order_costs)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {project.expense_count} transactions
                </p>
              </div>
              <Receipt className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${project.actual_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(project.actual_profit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Actual performance
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${project.actual_profit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Margin</p>
                <p className={`text-2xl font-bold ${marginStatus.color}`}>
                  {project.actual_margin_percentage.toFixed(1)}%
                </p>
                <p className={`text-xs ${marginStatus.color}`}>
                  {marginStatus.status}
                </p>
              </div>
              <MarginIcon className={`h-8 w-8 ${marginStatus.color}`} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderVarianceAnalysis = (project: ProjectFinancialSummary) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Variance Analysis</CardTitle>
        <CardDescription>
          Comparison between estimated, invoiced, and actual amounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded">
            <div>
              <p className="font-medium">Revenue Variance</p>
              <p className="text-sm text-muted-foreground">
                Estimated: {formatCurrency(project.total_estimated)} | 
                Actual: {formatCurrency(project.total_invoiced)}
              </p>
            </div>
            {getVarianceBadge(project.revenue_variance, 'revenue')}
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded">
            <div>
              <p className="font-medium">Cost Variance</p>
              <p className="text-sm text-muted-foreground">
                Estimated: {formatCurrency(project.total_estimated)} | 
                Actual: {formatCurrency(project.total_expenses)}
              </p>
            </div>
            {getVarianceBadge(project.cost_variance)}
          </div>

          {(project.change_order_revenue > 0 || project.change_order_costs > 0) && (
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded">
              <div>
                <p className="font-medium">Change Order Impact</p>
                <p className="text-sm text-muted-foreground">
                  Revenue: {formatCurrency(project.change_order_revenue)} | 
                  Costs: {formatCurrency(project.change_order_costs)}
                </p>
              </div>
              <Badge variant="outline">
                Net: {formatCurrency(project.change_order_revenue - project.change_order_costs)}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderProjectList = () => (
    <Card>
      <CardHeader>
        <CardTitle>All Projects Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Expenses</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {financialData.map((project) => {
              const marginStatus = getMarginStatus(project.actual_margin_percentage);
              return (
                <TableRow key={project.project_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{project.project_name}</p>
                      <p className="text-sm text-muted-foreground">{project.project_number}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-green-600">
                    {formatCurrency(project.total_invoiced + project.change_order_revenue)}
                  </TableCell>
                  <TableCell className="text-red-600">
                    {formatCurrency(project.total_expenses + project.change_order_costs)}
                  </TableCell>
                  <TableCell className={project.actual_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(project.actual_profit)}
                  </TableCell>
                  <TableCell>
                    <span className={marginStatus.color}>
                      {project.actual_margin_percentage.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{project.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedProject(project)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (financialData.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No financial data available. Import QuickBooks transactions to see reconciliation data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {selectedProject ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{selectedProject.project_name}</h2>
              <p className="text-muted-foreground">{selectedProject.project_number}</p>
            </div>
            <Button variant="outline" onClick={() => setSelectedProject(null)}>
              Back to All Projects
            </Button>
          </div>

          {renderOverviewCards(selectedProject)}
          {renderVarianceAnalysis(selectedProject)}
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Financial Reconciliation</h2>
            <p className="text-muted-foreground">
              Compare estimated vs actual revenue and costs across all projects
            </p>
          </div>

          {renderProjectList()}
        </div>
      )}
    </div>
  );
};