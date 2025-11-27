import { useState } from 'react';
import { BookOpen, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRoles } from '@/contexts/RoleContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface KPIMeasure {
  name: string;
  source: 'database' | 'frontend' | 'both' | 'deprecated';
  field: string;
  formula: string;
  whereUsed: string;
  notes?: string;
}

const projectFinancialKPIs: KPIMeasure[] = [
  { name: 'Contracted Amount', source: 'database', field: 'projects.contracted_amount', formula: 'Direct DB field - total contract value with client', whereUsed: 'ProjectDetailView, ProjectFinancialReconciliation', notes: 'Primary revenue figure' },
  { name: 'Current Margin', source: 'database', field: 'projects.current_margin', formula: 'Contracted Amount - Total Actual Costs', whereUsed: 'MarginDashboard, ProjectProfitMargin', notes: 'Real-time profit tracking' },
  { name: 'Current Margin Percentage', source: 'database', field: 'projects.current_margin_percent', formula: '(Current Margin / Contracted Amount) × 100', whereUsed: 'Dashboard cards, financial reports' },
  { name: 'Target Margin', source: 'database', field: 'projects.target_margin', formula: 'User-defined goal amount', whereUsed: 'MarginDashboard, budget planning' },
  { name: 'Target Margin Percentage', source: 'database', field: 'projects.target_margin_percent', formula: '(Target Margin / Contracted Amount) × 100', whereUsed: 'Performance indicators' },
  { name: 'Minimum Margin', source: 'database', field: 'projects.minimum_margin', formula: 'User-defined floor amount', whereUsed: 'Risk alerts, MarginDashboard' },
  { name: 'Minimum Margin Percentage', source: 'database', field: 'projects.minimum_margin_percent', formula: '(Minimum Margin / Contracted Amount) × 100', whereUsed: 'Warning thresholds' },
  { name: 'Contingency Amount', source: 'database', field: 'projects.contingency_amount', formula: 'User-defined buffer for unknowns', whereUsed: 'ContingencyAllocation, budget tracking' },
  { name: 'Contingency Percentage', source: 'database', field: 'projects.contingency_percent', formula: '(Contingency Amount / Contracted Amount) × 100', whereUsed: 'Budget analysis' },
  { name: 'Contingency Used', source: 'database', field: 'projects.contingency_used', formula: 'Sum of allocated contingency from expenses', whereUsed: 'ContingencyAllocation, financial dashboards' },
  { name: 'Total Actual Costs', source: 'database', field: 'Calculated', formula: 'SUM(expenses.amount WHERE project_id = X)', whereUsed: 'All financial views, margin calculations', notes: 'Aggregated from expenses table' },
  { name: 'Project Type', source: 'database', field: 'projects.project_type', formula: "'construction_project' | 'work_order'", whereUsed: 'Project creation, WorkOrders page', notes: 'Distinguishes work orders from full projects' },
  { name: 'Project Category', source: 'database', field: 'projects.category', formula: "'construction' | 'system' | 'overhead'", whereUsed: 'All project queries, filtering', notes: 'Controls visibility in different contexts' },
  { name: 'Do Not Exceed', source: 'database', field: 'projects.do_not_exceed', formula: 'Maximum billable amount', whereUsed: 'WorkOrders table, QuickWorkOrderForm', notes: 'Critical for work order budget control' },
  { name: 'Customer PO Number', source: 'database', field: 'projects.customer_po_number', formula: 'Client reference number', whereUsed: 'WorkOrders table, invoicing', notes: 'Client-provided PO for billing' },
  { name: 'Work Order Counter', source: 'database', field: 'projects.work_order_counter', formula: 'Auto-incrementing per project', whereUsed: 'Work order number generation', notes: 'Used by generateWorkOrderNumber()' },
  { name: 'Original Estimated Costs', source: 'database', field: 'projects.original_est_costs', formula: 'Initial cost estimate at project creation', whereUsed: 'WorkOrders table, margin comparison', notes: 'Immutable after initial set' },
  { name: 'Adjusted Estimated Costs', source: 'database', field: 'projects.adjusted_est_costs', formula: 'Original Est. Costs + Change Order Costs', whereUsed: 'WorkOrders table, current cost tracking', notes: 'Updated when change orders approved' },
  { name: 'Projected Margin', source: 'database', field: 'projects.projected_margin', formula: 'Contracted Amount - Adjusted Est. Costs', whereUsed: 'WorkOrders table, margin dashboards', notes: 'Expected profit based on estimates' },
  { name: 'Original Margin', source: 'database', field: 'projects.original_margin', formula: 'Contracted Amount - Original Est. Costs', whereUsed: 'Variance analysis', notes: 'Initial expected profit' },
  { name: 'Margin At Risk', source: 'frontend', field: 'calculateProjectMargin()', formula: 'Current Margin < Minimum Margin', whereUsed: 'Dashboard alerts, ProjectProfitMargin' },
  { name: 'Margin Efficiency', source: 'frontend', field: 'getMarginEfficiency()', formula: '(Current Margin % / Target Margin %) × 100', whereUsed: 'Performance metrics' },
  { name: 'Contingency Utilization', source: 'frontend', field: 'getContingencyUtilization()', formula: '(Contingency Used / Contingency Amount) × 100', whereUsed: 'ContingencyAllocation' },
  { name: 'Available Contingency', source: 'frontend', field: 'margin.availableContingency', formula: 'Contingency Amount - Contingency Used', whereUsed: 'Budget planning, allocation dialogs' },
];

const estimateKPIs: KPIMeasure[] = [
  { name: 'Total Amount', source: 'database', field: 'estimates.total_amount', formula: 'SUM(line_items.total)', whereUsed: 'EstimatesList, financial comparisons' },
  { name: 'Total Cost', source: 'database', field: 'estimates.total_cost', formula: 'SUM(line_items.total_cost)', whereUsed: 'Margin analysis, EstimateForm' },
  { name: 'Contingency Amount', source: 'database', field: 'estimates.contingency_amount', formula: 'User-defined or calculated buffer', whereUsed: 'EstimateForm, budget planning' },
  { name: 'Contingency Percent', source: 'database', field: 'estimates.contingency_percent', formula: '(Contingency Amount / Total Amount) × 100', whereUsed: 'Budget display' },
  { name: 'Default Markup Percent', source: 'database', field: 'estimates.default_markup_percent', formula: 'User-defined default for line items', whereUsed: 'LineItemTable auto-fill' },
  { name: 'Target Margin Percent', source: 'database', field: 'estimates.target_margin_percent', formula: 'User-defined profitability goal', whereUsed: 'EstimateForm, performance tracking' },
  { name: 'Is Auto Generated', source: 'database', field: 'estimates.is_auto_generated', formula: 'Boolean flag', whereUsed: 'WorkOrders table, estimate filtering', notes: 'True when created from Quick Work Order form' },
  { name: 'Line Item Total', source: 'database', field: 'estimate_line_items.total', formula: 'quantity × price_per_unit', whereUsed: 'LineItemTable calculations' },
  { name: 'Line Item Total Cost', source: 'database', field: 'estimate_line_items.total_cost', formula: 'quantity × cost_per_unit', whereUsed: 'Cost analysis' },
  { name: 'Line Item Markup Amount', source: 'database', field: 'estimate_line_items.markup_amount', formula: 'total - total_cost', whereUsed: 'Profitability by item' },
  { name: 'Line Item Markup Percent', source: 'database', field: 'estimate_line_items.markup_percent', formula: '(markup_amount / total_cost) × 100', whereUsed: 'LineItemTable display' },
  { name: 'Gross Profit', source: 'frontend', field: 'calculateEstimateGrossProfit()', formula: 'Total Amount - Total Cost', whereUsed: 'EstimatesList, summary cards' },
  { name: 'Gross Margin', source: 'frontend', field: 'calculateEstimateGrossMargin()', formula: '(Gross Profit / Total Amount) × 100', whereUsed: 'Performance indicators' },
  { name: 'Average Markup', source: 'frontend', field: 'calculateEstimateAverageMarkup()', formula: 'AVG(line_items.markup_percent)', whereUsed: 'EstimateForm summary' },
  { name: 'Total Markup', source: 'frontend', field: 'calculateEstimateTotalMarkup()', formula: 'SUM(line_items.markup_amount)', whereUsed: 'Financial analysis' },
];

const quoteKPIs: KPIMeasure[] = [
  { name: 'Quote Amount', source: 'database', field: 'quotes.quote_amount', formula: 'Direct field - total quoted to client', whereUsed: 'QuotesList, project financials' },
  { name: 'Client Amount', source: 'database', field: 'quotes.client_amount', formula: 'Amount charged to client (may include markup)', whereUsed: 'Quote comparison, billing' },
  { name: 'Markup Amount', source: 'database', field: 'quotes.markup_amount', formula: 'client_amount - quote_amount', whereUsed: 'Profitability analysis' },
  { name: 'Markup Percent', source: 'database', field: 'quotes.markup_percent', formula: '(markup_amount / quote_amount) × 100', whereUsed: 'QuoteForm, financial reports' },
  { name: 'Profit Per Unit', source: 'database', field: 'quotes.profit_per_unit', formula: 'Total profit / quantity (if applicable)', whereUsed: 'Unit economics' },
  { name: 'Cost Variance Status', source: 'frontend', field: 'getCostVarianceStatus()', formula: 'Compare actual vs quoted costs', whereUsed: 'QuoteComparison' },
  { name: 'Best Quote Per Category', source: 'frontend', field: 'getBestQuoteForCategory()', formula: 'Lowest quote_amount by category', whereUsed: 'Quote selection, project budgets', notes: 'Used in project revenue calculations' },
];

const expenseKPIs: KPIMeasure[] = [
  { name: 'Expense Amount', source: 'database', field: 'expenses.amount', formula: 'Direct field - transaction amount', whereUsed: 'ExpensesList, project costs' },
  { name: 'Is Split', source: 'database', field: 'expenses.is_split', formula: 'Boolean - expense allocated across projects', whereUsed: 'ExpenseAllocationSheet' },
  { name: 'Split Amount', source: 'database', field: 'expense_splits.split_amount', formula: 'Portion allocated to specific project', whereUsed: 'Split expense calculations' },
  { name: 'Split Percentage', source: 'database', field: 'expense_splits.split_percentage', formula: '(split_amount / parent_expense.amount) × 100', whereUsed: 'Allocation display' },
  { name: 'Total Expense by Project', source: 'frontend', field: 'calculateProjectExpenses()', formula: 'SUM(expenses.amount) + SUM(expense_splits.split_amount)', whereUsed: 'Project financial views', notes: 'Combines direct and split expenses' },
];

const changeOrderKPIs: KPIMeasure[] = [
  { name: 'Amount', source: 'database', field: 'change_orders.amount', formula: 'Direct field - CO cost impact', whereUsed: 'ChangeOrdersList' },
  { name: 'Client Amount', source: 'database', field: 'change_orders.client_amount', formula: 'Amount charged to client', whereUsed: 'Billing, margin calculations' },
  { name: 'Cost Impact', source: 'database', field: 'change_orders.cost_impact', formula: 'Change to project costs', whereUsed: 'Budget revisions' },
  { name: 'Margin Impact', source: 'database', field: 'change_orders.margin_impact', formula: 'client_amount - cost_impact', whereUsed: 'Profitability tracking' },
  { name: 'Contingency Billed to Client', source: 'database', field: 'change_orders.contingency_billed_to_client', formula: 'Portion of contingency recovered', whereUsed: 'ContingencyAllocation' },
  { name: 'Includes Contingency', source: 'database', field: 'change_orders.includes_contingency', formula: 'Boolean flag', whereUsed: 'Budget tracking' },
];

const workOrderKPIs: KPIMeasure[] = [
  { name: 'Work Order Count', source: 'frontend', field: 'statistics.total', formula: "COUNT(projects WHERE project_type = 'work_order')", whereUsed: 'WorkOrders dashboard' },
  { name: 'Pending/In Progress', source: 'frontend', field: 'statistics.pendingInProgress', formula: "COUNT(WOs WHERE status IN ('in_progress', 'estimating', 'quoted'))", whereUsed: 'WorkOrders stats cards' },
  { name: 'Completed This Week', source: 'frontend', field: 'statistics.completedThisWeek', formula: "COUNT(WOs WHERE status = 'complete' AND end_date >= weekStart)", whereUsed: 'WorkOrders stats cards' },
  { name: 'Completed This Month', source: 'frontend', field: 'statistics.completedThisMonth', formula: "COUNT(WOs WHERE status = 'complete' AND end_date >= monthStart)", whereUsed: 'WorkOrders stats cards' },
  { name: 'Has Real Estimate', source: 'frontend', field: 'has_estimate && !is_auto_generated_estimate', formula: 'Excludes system-created placeholder estimates', whereUsed: 'WorkOrders table badge' },
  { name: 'Total Expenses', source: 'frontend', field: 'workOrder.total_expenses', formula: 'SUM(expenses.amount WHERE project_id = WO)', whereUsed: 'WorkOrders table', notes: 'Aggregated at query time' },
  { name: 'Expense Count', source: 'frontend', field: 'workOrder.expense_count', formula: 'COUNT(expenses WHERE project_id = WO)', whereUsed: 'WorkOrders details' },
  { name: 'DNE Utilization %', source: 'frontend', field: 'calculateDNEUtilization()', formula: '(Total Expenses / Do Not Exceed) × 100', whereUsed: 'Budget alerts (proposed)', notes: 'Not yet implemented' },
  { name: 'Work Order Number', source: 'frontend', field: 'generateWorkOrderNumber()', formula: '{project_number}-WO-{counter}', whereUsed: 'numberGeneration.ts', notes: 'For sub-work-orders under projects' },
];

const deprecatedKPIs: KPIMeasure[] = [
  { name: 'Project Budget', source: 'deprecated', field: 'projects.budget', formula: 'Replaced by contracted_amount', whereUsed: 'N/A', notes: 'Use contracted_amount instead' },
  { name: 'Estimate Rate', source: 'deprecated', field: 'estimate_line_items.rate', formula: 'Replaced by price_per_unit', whereUsed: 'N/A', notes: 'Use price_per_unit instead' },
  { name: 'Old Revenue Calculations', source: 'deprecated', field: 'Various legacy fields', formula: 'See project_revenues table', whereUsed: 'N/A', notes: 'Revenue tracking moved to dedicated table' },
];

export default function KPIGuide() {
  const { isAdmin, isManager, loading } = useRoles();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && !isAdmin && !isManager) {
      navigate('/');
    }
  }, [isAdmin, isManager, loading, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAdmin && !isManager) {
    return null;
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/docs/ProfitBuild_KPI_Matrix.xlsx';
    link.download = 'ProfitBuild_KPI_Matrix.xlsx';
    link.click();
  };

  const filterKPIs = (kpis: KPIMeasure[]) => {
    if (!searchTerm) return kpis;
    return kpis.filter(kpi =>
      kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.formula.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getSourceBadge = (source: string) => {
    const variants = {
      database: { label: 'Database', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
      frontend: { label: 'Frontend', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      both: { label: 'Both', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
      deprecated: { label: 'Deprecated', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    };
    const config = variants[source as keyof typeof variants];
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const renderKPITable = (kpis: KPIMeasure[]) => {
    const filtered = filterKPIs(kpis);
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Measure</TableHead>
            <TableHead className="w-[120px]">Source</TableHead>
            <TableHead className="w-[220px]">Field/Function</TableHead>
            <TableHead>Formula/Calculation</TableHead>
            <TableHead className="w-[200px]">Where Used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((kpi, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium text-xs">{kpi.name}</TableCell>
              <TableCell>{getSourceBadge(kpi.source)}</TableCell>
              <TableCell className="font-mono text-xs">{kpi.field}</TableCell>
              <TableCell className="text-xs">{kpi.formula}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{kpi.whereUsed}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const totalMeasures = projectFinancialKPIs.length + estimateKPIs.length + quoteKPIs.length + expenseKPIs.length + changeOrderKPIs.length + workOrderKPIs.length + deprecatedKPIs.length;
  const dbMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, changeOrderKPIs, workOrderKPIs].flat().filter(k => k.source === 'database').length;
  const frontendMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, changeOrderKPIs, workOrderKPIs].flat().filter(k => k.source === 'frontend').length;

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 py-2 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">KPI & Measurement Guide</h1>
            <p className="text-sm text-muted-foreground">Reference for financial calculations and metrics</p>
          </div>
        </div>
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="h-4 w-4" />
          Download Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Total Measures</CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">{totalMeasures}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Database Fields</CardTitle>
            <CardDescription className="text-2xl font-bold text-green-500">{dbMeasures}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Frontend Calculations</CardTitle>
            <CardDescription className="text-2xl font-bold text-blue-500">{frontendMeasures}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search measures, fields, or formulas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="project" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto">
          <TabsTrigger value="project" className="text-xs">Project</TabsTrigger>
          <TabsTrigger value="estimates" className="text-xs">Estimates</TabsTrigger>
          <TabsTrigger value="quotes" className="text-xs">Quotes</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
          <TabsTrigger value="change-orders" className="text-xs">Change Orders</TabsTrigger>
          <TabsTrigger value="work-orders" className="text-xs">Work Orders</TabsTrigger>
          <TabsTrigger value="reference" className="text-xs">Reference</TabsTrigger>
          <TabsTrigger value="deprecated" className="text-xs">Deprecated</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="mt-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Project Financial Measures ({projectFinancialKPIs.length})</CardTitle>
              <CardDescription className="text-xs">Core project-level financial metrics and margin calculations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(projectFinancialKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimates" className="mt-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Estimate Measures ({estimateKPIs.length})</CardTitle>
              <CardDescription className="text-xs">Estimate and line item calculations, markup, and profitability</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(estimateKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Quote Measures ({quoteKPIs.length})</CardTitle>
              <CardDescription className="text-xs">Quote comparisons, client pricing, and variance analysis</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(quoteKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Expense Measures ({expenseKPIs.length})</CardTitle>
              <CardDescription className="text-xs">Expense tracking, split allocations, and project cost aggregation</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(expenseKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="change-orders" className="mt-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Change Order Measures ({changeOrderKPIs.length})</CardTitle>
              <CardDescription className="text-xs">Change order impacts on cost, margin, and contingency</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(changeOrderKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-orders" className="mt-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Work Order Measures ({workOrderKPIs.length})</CardTitle>
              <CardDescription className="text-xs">Work order specific metrics, budget tracking, and statistics</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(workOrderKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reference" className="mt-3">
          <div className="space-y-3">
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">Quick Reference</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    {getSourceBadge('database')} Use Database Fields For:
                  </h3>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Raw transaction data (amounts, dates, IDs)</li>
                    <li>User-defined goals (target margin, contingency)</li>
                    <li>Aggregations via SQL (total costs, sums)</li>
                    <li>Data that needs to persist and be queryable</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    {getSourceBadge('frontend')} Use Frontend Calculations For:
                  </h3>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Real-time calculations (margins, variances)</li>
                    <li>Display formatting (percentages, statuses)</li>
                    <li>Derived metrics combining multiple sources</li>
                    <li>Business logic that changes frequently</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Field Mapping (DB → Frontend)</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Database Field</TableHead>
                        <TableHead className="text-xs">Frontend Property</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-xs">projects.contracted_amount</TableCell>
                        <TableCell className="font-mono text-xs">project.contractedAmount</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-xs">projects.current_margin</TableCell>
                        <TableCell className="font-mono text-xs">project.currentMargin</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-xs">estimate_line_items.price_per_unit</TableCell>
                        <TableCell className="font-mono text-xs">lineItem.pricePerUnit</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-xs">quotes.markup_percent</TableCell>
                        <TableCell className="font-mono text-xs">quote.markupPercent</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Work Order Guidance</h3>
                  <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                    <li><strong className="text-foreground">project_type vs category:</strong> Use project_type = 'work_order' to identify work orders. Category controls visibility (construction/system/overhead).</li>
                    <li><strong className="text-foreground">Auto-generated estimates:</strong> Quick Work Order form creates estimates with is_auto_generated = true. These are placeholders until real estimates are created.</li>
                    <li><strong className="text-foreground">DNE tracking:</strong> do_not_exceed field is critical for work order budget control. Monitor expense utilization against this limit.</li>
                    <li><strong className="text-foreground">Cost fields:</strong> original_est_costs (immutable) vs adjusted_est_costs (updated with change orders) enable variance tracking.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deprecated" className="mt-3">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Deprecated Measures ({deprecatedKPIs.length})</CardTitle>
              <CardDescription className="text-xs">Legacy fields no longer in use - see notes for replacements</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Old Field</TableHead>
                    <TableHead>Notes/Replacement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deprecatedKPIs.map((kpi, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs line-through">{kpi.field}</TableCell>
                      <TableCell className="text-xs">{kpi.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
