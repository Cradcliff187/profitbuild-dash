import { useState } from 'react';
import { BookOpen, Download, Building, Calculator, FileText, Receipt, DollarSign, RefreshCw, Clipboard, Archive, Database } from 'lucide-react';
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

// Import KPI definitions from centralized library
import {
  projectFinancialKPIs,
  estimateKPIs,
  expenseKPIs,
  quoteKPIs,
  revenueKPIs,
  changeOrderKPIs,
  workOrderKPIs,
  viewKPIs,
  deprecatedKPIs,
  KPI_DEFINITIONS_VERSION,
  LAST_UPDATED,
  type KPIMeasure,
} from '@/lib/kpi-definitions';

const KPI_GUIDE_METADATA = {
  lastUpdated: LAST_UPDATED,
  version: KPI_DEFINITIONS_VERSION,
  changelog: [
    { date: '2026-01-29', version: '3.0', changes: 'Added View KPIs section (21 measures) for weekly_labor_hours and training_status views. Added 8 new expense KPIs for joined fields (worker_name, employee_number, hourly_rate, approval_status, description, project fields). Updated gross_hours to frontend-calculated.' },
    { date: '2026-01-23', version: '2.0', changes: 'Migrated to centralized KPI definitions library. Added semantic mappings, business rules, and validation. Fixed SQL examples for time tracking calculations.' },
    { date: '2026-01-21', version: '1.4', changes: 'Added Labor Cushion metrics (9 new measures) - labor_cushion_amount, max_gross_profit_potential, max_potential_margin_percent, and labor financial tracking' },
    { date: '2024-12-01', version: '1.3', changes: 'Added Lunch Tracking section (4 metrics) - lunch_taken, lunch_duration_minutes, gross_hours, net_hours for time entries' },
    { date: '2024-11-27', version: '1.2', changes: 'Added Revenue section (6 metrics) - project_revenues and project_financial_summary fields' },
    { date: '2024-11-27', version: '1.1', changes: 'Added Work Orders section (9 metrics), project type/category fields, is_auto_generated estimate field' },
    { date: '2024-11-26', version: '1.0', changes: 'Initial release with 57 measures across 6 categories' },
  ]
};

// KPIMeasure interface is now imported from @/lib/kpi-definitions

// KPI arrays are now imported from @/lib/kpi-definitions

// All KPI arrays are now imported from @/lib/kpi-definitions

// All KPI arrays are now imported from @/lib/kpi-definitions

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
    { value: 'views', label: 'Views', icon: Database },
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
      view: { label: 'View', className: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
      frontend: { label: 'Frontend', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
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

  const totalMeasures = projectFinancialKPIs.length + estimateKPIs.length + quoteKPIs.length + expenseKPIs.length + revenueKPIs.length + changeOrderKPIs.length + workOrderKPIs.length + viewKPIs.length + deprecatedKPIs.length;
  const dbMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, revenueKPIs, changeOrderKPIs, workOrderKPIs, viewKPIs].flat().filter(k => k.source === 'database' || k.source === 'view').length;
  const frontendMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, revenueKPIs, changeOrderKPIs, workOrderKPIs, viewKPIs].flat().filter(k => k.source === 'frontend').length;

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

        <TabsContent value="views" className="mt-0 sm:mt-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">View Measures ({viewKPIs.length})</CardTitle>
              <CardDescription className="text-sm">Database view columns including weekly labor hours, training status, and aggregated metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderKPITable(viewKPIs)}
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
