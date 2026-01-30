import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { FileText, DollarSign, FileEdit, Quote } from "lucide-react";

interface ProjectOverviewCompactProps {
  project: any;
  marginData: any;
  estimates: any[];
  quotes: any[];
  expenses: any[];
  changeOrders: any[];
}

export function ProjectOverviewCompact({
  project,
  marginData,
  estimates,
  quotes,
  expenses,
  changeOrders,
}: ProjectOverviewCompactProps) {
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

  return (
    <div className="space-y-3">
      {/* Header with Contract & Margin */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Contract Value</p>
            <p className="text-xl font-bold">{formatCurrency(project.contracted_amount || 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current Margin</p>
            <p className="text-xl font-bold">
              {project.margin_percentage?.toFixed(1) || 0}%
            </p>
          </div>
        </div>
      </Card>

      {/* 2-Column Margin Breakdown */}
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Original</p>
            <p className="text-sm font-bold">{formatCurrency(project.original_margin || 0)}</p>
            <p className="text-xs text-muted-foreground">
              {project.contracted_amount > 0
                ? (((project.original_margin || 0) / project.contracted_amount) * 100).toFixed(1)
                : 0}%
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Projected</p>
            <p className="text-sm font-bold">{formatCurrency(project.adjusted_est_margin ?? project.projected_margin ?? 0)}</p>
            <p className="text-xs text-muted-foreground">
              {project.margin_percentage?.toFixed(1) || 0}%
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="p-3">
        <h3 className="text-sm font-medium mb-2">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{estimates?.length || 0} Estimates</span>
          </div>
          <div className="flex items-center gap-2">
            <Quote className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{quotes?.length || 0} Quotes</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{formatCurrency(totalExpenses)} Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{changeOrders?.length || 0} Change Orders</span>
          </div>
        </div>
      </Card>

      {/* Project Details */}
      <Card className="p-3">
        <h3 className="text-sm font-medium mb-2">Project Details</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Number:</span>
            <span className="font-medium">{project?.project_number || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline" className="text-xs">{project?.status || 'N/A'}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client:</span>
            <span className="font-medium">{project?.client_name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target Margin:</span>
            <span className="font-medium">{project?.target_margin?.toFixed(1) || 20}%</span>
          </div>
        </div>
      </Card>

      {/* Change Orders */}
      {changeOrders && changeOrders.length > 0 && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Change Orders</h3>
            <Badge variant="outline" className="text-xs">{changeOrders.length}</Badge>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-medium text-green-600">
                +{formatCurrency(project.changeOrderRevenue || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Additional Costs:</span>
              <span className="font-medium">
                {formatCurrency(project.changeOrderCosts || 0)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Contingency */}
      {project.contingency_remaining > 0 && (
        <Card className="p-3">
          <h3 className="text-sm font-medium mb-2">Contingency</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining:</span>
              <span className="font-medium">{formatCurrency(project.contingency_remaining)}</span>
            </div>
            {project.contracted_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">% of Contract:</span>
                <span className="font-medium">
                  {((project.contingency_remaining / project.contracted_amount) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Cost Breakdown */}
      <Card className="p-3">
        <h3 className="text-sm font-medium mb-2">Cost Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Original Est. Costs:</span>
            <span className="font-medium">{formatCurrency(project.original_est_costs || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Adjusted Est. Costs:</span>
            <span className="font-medium">{formatCurrency(project.adjusted_est_costs || 0)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t">
            <span className="text-muted-foreground">Total Expenses:</span>
            <span className="font-medium">{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      </Card>

      {/* Recent Expenses */}
      {expenses && expenses.length > 0 && (
        <Card className="p-3">
          <h3 className="text-sm font-medium mb-2">Recent Expenses</h3>
          <div className="space-y-1">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span className="text-muted-foreground truncate flex-1">{expense.payee_name || expense.description}</span>
                <span className="font-medium ml-2">{formatCurrency(expense.amount)}</span>
              </div>
            ))}
            {expenses.length > 5 && (
              <p className="text-xs text-muted-foreground pt-1">+ {expenses.length - 5} more expenses</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
