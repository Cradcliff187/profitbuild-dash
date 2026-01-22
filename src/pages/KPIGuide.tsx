import { useState } from 'react';
import { BookOpen, Download, Building, Calculator, FileText, Receipt, DollarSign, RefreshCw, Clipboard, Archive } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { format, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

const KPI_GUIDE_METADATA = {
  lastUpdated: '2026-01-21',
  version: '1.4',
  changelog: [
    { date: '2026-01-21', version: '1.4', changes: 'Added Labor Cushion metrics (9 new measures) - labor_cushion_amount, max_gross_profit_potential, max_potential_margin_percent, and labor financial tracking' },
    { date: '2024-12-01', version: '1.3', changes: 'Added Lunch Tracking section (4 metrics) - lunch_taken, lunch_duration_minutes, gross_hours, net_hours for time entries' },
    { date: '2024-11-27', version: '1.2', changes: 'Added Revenue section (6 metrics) - project_revenues and project_financial_summary fields' },
    { date: '2024-11-27', version: '1.1', changes: 'Added Work Orders section (9 metrics), project type/category fields, is_auto_generated estimate field' },
    { date: '2024-11-26', version: '1.0', changes: 'Initial release with 57 measures across 6 categories' },
  ]
};

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
  { name: 'Current Margin', source: 'database', field: 'projects.current_margin', formula: 'Contracted Amount - Total Actual Costs', whereUsed: 'MarginDashboard, ProjectProfitMargin', notes: 'Contracted revenue minus expenses (not actual invoices)' },
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
  { name: 'Actual Margin', source: 'database', field: 'projects.actual_margin', formula: 'Total Invoiced - Total Actual Costs', whereUsed: 'ProfitAnalysis page, MarginAnalysisTable', notes: 'Real profit based on actual invoices and expenses' },
  { name: 'Margin At Risk', source: 'frontend', field: 'calculateProjectMargin()', formula: 'Current Margin < Minimum Margin', whereUsed: 'Dashboard alerts, ProjectProfitMargin' },
  { name: 'Margin Efficiency', source: 'frontend', field: 'getMarginEfficiency()', formula: '(Current Margin % / Target Margin %) × 100', whereUsed: 'Performance metrics' },
  { name: 'Contingency Utilization', source: 'frontend', field: 'getContingencyUtilization()', formula: '(Contingency Used / Contingency Amount) × 100', whereUsed: 'ContingencyAllocation' },
  { name: 'Available Contingency', source: 'frontend', field: 'margin.availableContingency', formula: 'Contingency Amount - Contingency Used', whereUsed: 'Budget planning, allocation dialogs' },
  // Labor Cushion (Project-Level Aggregates) 
  { name: 'Estimated Labor Cushion', source: 'database', field: 'project_financial_summary.estimated_labor_cushion', formula: 'SUM(labor_cushion) from approved estimates', whereUsed: 'Project dashboards, portfolio analysis', notes: 'Total labor profit opportunity across approved estimates' },
  { name: 'Estimated Max Profit Potential', source: 'database', field: 'project_financial_summary.estimated_max_profit_potential', formula: 'SUM(max_gross_profit_potential) from approved estimates', whereUsed: 'Project financial tracking', notes: 'Maximum achievable profit for the project' },
  { name: 'Estimated Labor Hours', source: 'database', field: 'project_financial_summary.estimated_labor_hours', formula: 'SUM(labor_hours) from approved estimates', whereUsed: 'Resource planning, scheduling', notes: 'Total internal labor hours across approved estimates' },
];

const estimateKPIs: KPIMeasure[] = [
  { name: 'Total Amount', source: 'database', field: 'estimates.total_amount', formula: 'SUM(line_items.total)', whereUsed: 'EstimatesList, financial comparisons' },
  { name: 'Total Cost', source: 'database', field: 'estimates.total_cost', formula: 'SUM(line_items.total_cost)', whereUsed: 'Margin analysis, EstimateForm', notes: 'For labor items, uses billing rate (not actual cost) to hide cushion' },
  { name: 'Contingency Amount', source: 'database', field: 'estimates.contingency_amount', formula: 'User-defined or calculated buffer', whereUsed: 'EstimateForm, budget planning' },
  { name: 'Contingency Percent', source: 'database', field: 'estimates.contingency_percent', formula: '(Contingency Amount / Total Amount) × 100', whereUsed: 'Budget display' },
  { name: 'Default Markup Percent', source: 'database', field: 'estimates.default_markup_percent', formula: 'User-defined default for line items', whereUsed: 'LineItemTable auto-fill' },
  { name: 'Target Margin Percent', source: 'database', field: 'estimates.target_margin_percent', formula: 'User-defined profitability goal', whereUsed: 'EstimateForm, performance tracking' },
  { name: 'Is Auto Generated', source: 'database', field: 'estimates.is_auto_generated', formula: 'Boolean flag', whereUsed: 'WorkOrders table, estimate filtering', notes: 'True when created from Quick Work Order form' },
  { name: 'Line Item Total', source: 'database', field: 'estimate_line_items.total', formula: 'quantity × price_per_unit', whereUsed: 'LineItemTable calculations' },
  { name: 'Line Item Total Cost', source: 'database', field: 'estimate_line_items.total_cost', formula: 'quantity × cost_per_unit', whereUsed: 'Cost analysis' },
  { name: 'Line Item Markup Amount', source: 'database', field: 'estimate_line_items.markup_amount', formula: 'total - total_cost', whereUsed: 'Profitability by item' },
  { name: 'Line Item Markup Percent', source: 'database', field: 'estimate_line_items.markup_percent', formula: '(markup_amount / total_cost) × 100', whereUsed: 'LineItemTable display' },
  // Labor Cushion & Advanced Profit Metrics
  { name: 'Labor Hours', source: 'database', field: 'estimate_line_items.labor_hours', formula: 'Hours for labor_internal line items', whereUsed: 'Labor planning, capacity analysis', notes: 'Only populated for labor_internal category' },
  { name: 'Billing Rate Per Hour', source: 'database', field: 'estimate_line_items.billing_rate_per_hour', formula: 'Rate shown to client (e.g., $75/hr)', whereUsed: 'Labor line items, cost calculations', notes: 'Used as cost_per_unit to hide actual labor cost' },
  { name: 'Actual Cost Rate Per Hour', source: 'database', field: 'estimate_line_items.actual_cost_rate_per_hour', formula: 'True internal cost (e.g., $35/hr)', whereUsed: 'Internal profitability tracking', notes: 'Hidden from client, tracked separately' },
  { name: 'Labor Cushion Amount', source: 'database', field: 'estimate_line_items.labor_cushion_amount', formula: '(billing_rate - actual_cost_rate) × labor_hours', whereUsed: 'Estimate summary, profit opportunity tracking', notes: 'Hidden profit opportunity built into labor billing' },
  { name: 'Total Labor Cushion', source: 'frontend', field: 'calculateTotalLaborCushionAmount()', formula: 'SUM(labor_cushion_amount) for all labor items', whereUsed: 'EstimateSummaryCard', notes: 'Total hidden profit opportunity from labor' },
  { name: 'Max Gross Profit Potential', source: 'frontend', field: 'trueProfitMargin', formula: 'Gross Profit + Total Labor Cushion', whereUsed: 'EstimateSummaryCard', notes: 'Maximum achievable profit (markup + cushion)' },
  { name: 'Max Potential Margin', source: 'frontend', field: 'trueProfitPercent', formula: '(Max Gross Profit / (Total Cost - Labor Cushion)) × 100', whereUsed: 'EstimateSummaryCard, margin analysis', notes: 'True margin based on actual costs, not billing costs' },
  { name: 'True Actual Cost', source: 'frontend', field: 'trueActualCost', formula: 'Total Cost - Total Labor Cushion', whereUsed: 'Internal margin calculations', notes: 'What the project actually costs internally' },
  { name: 'Gross Profit', source: 'frontend', field: 'calculateEstimateGrossProfit()', formula: 'Total Amount - Total Cost', whereUsed: 'EstimatesList, summary cards', notes: 'Standard visible markup profit only' },
  { name: 'Gross Margin', source: 'frontend', field: 'calculateEstimateGrossMargin()', formula: '(Gross Profit / Total Amount) × 100', whereUsed: 'Performance indicators', notes: 'Margin shown to clients (excludes cushion)' },
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
  { name: 'Lunch Taken', source: 'database', field: 'expenses.lunch_taken', formula: 'Boolean - whether lunch break was taken during shift', whereUsed: 'TimeEntries table, time entry forms, reports', notes: 'Only applicable to labor_internal expenses (time entries)' },
  { name: 'Lunch Duration Minutes', source: 'database', field: 'expenses.lunch_duration_minutes', formula: 'Integer (15-120) - duration of lunch break in minutes', whereUsed: 'TimeEntries table, lunch tracking UI, reports', notes: 'Only meaningful when lunch_taken = true' },
  { name: 'Gross Hours', source: 'database', field: 'Calculated from start_time/end_time', formula: '(end_time - start_time) / 3600', whereUsed: 'Time entry calculations, reports', notes: 'Total shift duration before lunch deduction' },
  { name: 'Net Hours (Billable)', source: 'database', field: 'expenses.amount / hourly_rate OR calculated', formula: 'Gross Hours - (Lunch Duration / 60) when lunch_taken = true', whereUsed: 'TimeEntries table, billing calculations, amount calculation', notes: 'Billable hours after lunch deduction. Amount = Net Hours × Hourly Rate' },
];

const revenueKPIs: KPIMeasure[] = [
  { name: 'Invoice Amount', source: 'database', field: 'project_revenues.amount', formula: 'Direct DB field - individual invoice amount', whereUsed: 'ProjectFinancialReconciliation, financial reports', notes: 'Stored per invoice record' },
  { name: 'Invoice Date', source: 'database', field: 'project_revenues.invoice_date', formula: 'Direct DB field - when invoice was issued', whereUsed: 'Revenue tracking, cash flow', notes: 'Stored per invoice record' },
  { name: 'Invoice Number', source: 'database', field: 'project_revenues.invoice_number', formula: 'Direct DB field - QuickBooks invoice reference', whereUsed: 'Invoice lookup, reconciliation', notes: 'Stored per invoice record' },
  { name: 'Total Invoiced', source: 'database', field: 'project_financial_summary.total_invoiced', formula: 'SUM(project_revenues.amount) for non-split + SUM(revenue_splits.split_amount)', whereUsed: 'Project financial summary, dashboards', notes: 'View-calculated aggregate - NOW HANDLES SPLIT REVENUES CORRECTLY' },
  { name: 'Invoice Count', source: 'database', field: 'project_financial_summary.invoice_count', formula: 'COUNT(project_revenues)', whereUsed: 'Project financial summary', notes: 'View-calculated aggregate' },
  { name: 'Revenue Variance', source: 'database', field: 'project_financial_summary.revenue_variance', formula: 'total_estimated - total_invoiced', whereUsed: 'Variance analysis, financial dashboards', notes: 'View-calculated - shows billing gap' },
  { name: 'Revenue Split Amount', source: 'database', field: 'revenue_splits.split_amount', formula: 'Direct DB field - portion allocated to specific project', whereUsed: 'Split revenue calculations, project financial views', notes: 'Only exists when parent revenue.is_split = true' },
  { name: 'Revenue Split Percentage', source: 'database', field: 'revenue_splits.split_percentage', formula: '(split_amount / parent_revenue.amount) × 100', whereUsed: 'Allocation display in RevenueSplitDialog', notes: 'Calculated field for display purposes' },
  { name: 'Is Split (Revenue)', source: 'database', field: 'project_revenues.is_split', formula: 'Boolean flag - true when revenue is allocated across multiple projects', whereUsed: 'RevenueForm, revenue lists, reporting queries', notes: 'When true, project_id points to SYS-000' },
  { name: 'Total Revenue by Project (Split-Aware)', source: 'frontend', field: 'calculateProjectRevenue()', formula: 'SUM(revenues.amount WHERE !is_split) + SUM(revenue_splits.split_amount)', whereUsed: 'Project financial views, dashboards', notes: 'Combines direct and split revenues for accurate project totals' },
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
  const [activeTab, setActiveTab] = useState('project');
  const isMobile = useIsMobile();

  const tabOptions = [
    { value: 'project', label: 'Project', icon: Building },
    { value: 'estimates', label: 'Estimates', icon: Calculator },
    { value: 'quotes', label: 'Quotes', icon: FileText },
    { value: 'expenses', label: 'Expenses', icon: Receipt },
    { value: 'revenue', label: 'Revenue', icon: DollarSign },
    { value: 'change-orders', label: 'Change Orders', icon: RefreshCw },
    { value: 'work-orders', label: 'Work Orders', icon: Clipboard },
    { value: 'reference', label: 'Reference', icon: BookOpen },
    { value: 'deprecated', label: 'Deprecated', icon: Archive },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px] max-w-[220px]">Measure</TableHead>
              <TableHead className="min-w-[100px] max-w-[130px]">Source</TableHead>
              <TableHead className="min-w-[200px] max-w-[280px]">Field/Function</TableHead>
              <TableHead className="min-w-[250px]">Formula/Calculation</TableHead>
              <TableHead className="min-w-[180px] max-w-[220px]">Where Used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((kpi, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium text-xs">{kpi.name}</TableCell>
                <TableCell>{getSourceBadge(kpi.source)}</TableCell>
                <TableCell className="font-mono text-xs break-all">{kpi.field}</TableCell>
                <TableCell className="text-xs">{kpi.formula}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{kpi.whereUsed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const totalMeasures = projectFinancialKPIs.length + estimateKPIs.length + quoteKPIs.length + expenseKPIs.length + revenueKPIs.length + changeOrderKPIs.length + workOrderKPIs.length + deprecatedKPIs.length;
  const dbMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, revenueKPIs, changeOrderKPIs, workOrderKPIs].flat().filter(k => k.source === 'database').length;
  const frontendMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, revenueKPIs, changeOrderKPIs, workOrderKPIs].flat().filter(k => k.source === 'frontend').length;

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={BookOpen}
        title="KPI Guide"
        description="Understanding key performance indicators"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <Input
        placeholder="Search measures, fields, or formulas..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-9"
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Mobile Dropdown */}
        <div className="sm:hidden mb-4">
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabOptions.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  <div className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Orange Pills */}
        <div className="hidden sm:block mb-4">
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <TabsList className="inline-flex w-auto flex-nowrap justify-start gap-2 rounded-full bg-muted/40 p-1 min-w-full">
              {tabOptions.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0"
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <TabsContent value="project" className="mt-0 sm:mt-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Project Financial Measures ({projectFinancialKPIs.length})</CardTitle>
              <CardDescription className="text-sm">Core project-level financial metrics and margin calculations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(projectFinancialKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimates" className="mt-0 sm:mt-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Estimate Measures ({estimateKPIs.length})</CardTitle>
              <CardDescription className="text-sm">Estimate and line item calculations, markup, and profitability</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(estimateKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-0 sm:mt-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Quote Measures ({quoteKPIs.length})</CardTitle>
              <CardDescription className="text-sm">Quote comparisons, client pricing, and variance analysis</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(quoteKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-0 sm:mt-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Expense Measures ({expenseKPIs.length})</CardTitle>
              <CardDescription className="text-sm">Expense tracking, split allocations, and project cost aggregation</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(expenseKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-0 sm:mt-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Revenue Measures ({revenueKPIs.length})</CardTitle>
              <CardDescription className="text-sm">Invoice tracking and revenue aggregation from project_revenues table</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(revenueKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="change-orders" className="mt-0 sm:mt-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Change Order Measures ({changeOrderKPIs.length})</CardTitle>
              <CardDescription className="text-sm">Change order impacts on cost, margin, and contingency</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(changeOrderKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-orders" className="mt-0 sm:mt-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Work Order Measures ({workOrderKPIs.length})</CardTitle>
              <CardDescription className="text-sm">Work order specific metrics, budget tracking, and statistics</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(workOrderKPIs)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reference" className="mt-0 sm:mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base">Quick Reference</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
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
                <div>
                  <h3 className="text-sm font-semibold mb-2">Version History</h3>
                  <div className="space-y-2">
                    {KPI_GUIDE_METADATA.changelog.map((entry, idx) => (
                      <div key={idx} className="flex items-start gap-3 pb-2 border-b border-border/50 last:border-0">
                        <Badge variant="outline" className="text-xs shrink-0">v{entry.version}</Badge>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">
                            {format(parseISO(entry.date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{entry.changes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    App Build: {import.meta.env.VITE_APP_VERSION || 'Unknown'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deprecated" className="mt-0 sm:mt-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Deprecated Measures ({deprecatedKPIs.length})</CardTitle>
              <CardDescription className="text-sm">Legacy fields no longer in use - see notes for replacements</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px] max-w-[300px]">Old Field</TableHead>
                      <TableHead className="min-w-[300px]">Notes/Replacement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deprecatedKPIs.map((kpi, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs line-through break-all">{kpi.field}</TableCell>
                        <TableCell className="text-xs">{kpi.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MobilePageWrapper>
  );
}
