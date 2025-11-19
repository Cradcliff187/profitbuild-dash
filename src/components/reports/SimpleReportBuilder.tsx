import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { SimpleFilterPanel } from "./SimpleFilterPanel";
import { FilterSummary } from "./FilterSummary";
import { ReportViewer } from "./ReportViewer";
import { ExportControls } from "./ExportControls";
import { useReportExecution, ReportFilter, ReportConfig } from "@/hooks/useReportExecution";
import { ReportField } from "@/utils/reportExporter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { Constants } from "@/integrations/supabase/types";

export interface FieldMetadata {
  key: string;
  label: string;
  type: ReportField['type'];
  enumValues?: string[];
  dataSource?: 'clients' | 'payees' | 'workers' | 'projects';
  group?: 'financial' | 'project_info' | 'dates' | 'status' | 'employee' | 'time' | 'composition';
  helpText?: string;
  allowedOperators?: ReportFilter['operator'][];
}

const DATA_SOURCES = [
  { value: 'projects', label: 'Projects' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'time_entries', label: 'Time Entries' },
  { value: 'estimate_line_items', label: 'Estimate Line Items' },
  { value: 'internal_costs', label: 'Internal Costs' }
] as const;

export const AVAILABLE_FIELDS: Record<string, FieldMetadata[]> = {
  projects: [
    { key: 'project_number', label: 'Project #', type: 'text', group: 'project_info' },
    { key: 'project_name', label: 'Project Name', type: 'text', group: 'project_info' },
    { key: 'client_name', label: 'Client', type: 'text', group: 'project_info', dataSource: 'clients', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'status', label: 'Status', type: 'text', group: 'status', enumValues: [...Constants.public.Enums.project_status], allowedOperators: ['equals', 'not_equals', 'in'] },
    { key: 'contracted_amount', label: 'Contract Amount', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'current_margin', label: 'Current Margin', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'margin_percentage', label: 'Margin %', type: 'percent', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'total_expenses', label: 'Total Expenses', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'contingency_remaining', label: 'Contingency Remaining', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'start_date', label: 'Start Date', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'end_date', label: 'End Date', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'category_list', label: 'Line Item Categories', type: 'text', group: 'composition', enumValues: [...Constants.public.Enums.expense_category], allowedOperators: ['contains_any', 'contains_only', 'contains_all'], helpText: 'Filter by line item category composition' },
    { key: 'has_labor_internal', label: 'Has Internal Labor', type: 'boolean', group: 'composition', helpText: 'Project has internal labor line items' },
    { key: 'only_labor_internal', label: 'Only Internal Labor', type: 'boolean', group: 'composition', helpText: 'Project has ONLY internal labor line items' },
    { key: 'has_subcontractors', label: 'Has Subcontractors', type: 'boolean', group: 'composition', helpText: 'Project has subcontractor line items' },
    { key: 'has_materials', label: 'Has Materials', type: 'boolean', group: 'composition', helpText: 'Project has materials line items' },
    { key: 'has_equipment', label: 'Has Equipment', type: 'boolean', group: 'composition', helpText: 'Project has equipment line items' }
  ],
  expenses: [
    { key: 'expense_date', label: 'Date', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'amount', label: 'Amount', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'category', label: 'Category', type: 'text', group: 'status', enumValues: [...Constants.public.Enums.expense_category], allowedOperators: ['equals', 'not_equals', 'in'] },
    { key: 'payee_name', label: 'Payee', type: 'text', group: 'project_info', dataSource: 'payees', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'project_number', label: 'Project #', type: 'text', group: 'project_info' },
    { key: 'project_name', label: 'Project Name', type: 'text', group: 'project_info' },
    { key: 'description', label: 'Description', type: 'text', group: 'project_info', allowedOperators: ['equals', 'contains'] },
    { key: 'approval_status', label: 'Status', type: 'text', group: 'status', enumValues: ['pending', 'approved', 'rejected'], allowedOperators: ['equals', 'not_equals', 'in'] }
  ],
  quotes: [
    { key: 'quote_number', label: 'Quote #', type: 'text', group: 'project_info' },
    { key: 'total_amount', label: 'Total Amount', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'status', label: 'Status', type: 'text', group: 'status', enumValues: [...Constants.public.Enums.quote_status], allowedOperators: ['equals', 'not_equals', 'in'] },
    { key: 'date_received', label: 'Date Received', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'payee_name', label: 'Vendor', type: 'text', group: 'project_info', dataSource: 'payees', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'project_number', label: 'Project #', type: 'text', group: 'project_info' },
    { key: 'project_name', label: 'Project Name', type: 'text', group: 'project_info' }
  ],
  time_entries: [
    { key: 'expense_date', label: 'Date', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Date when time was worked' },
    { key: 'worker_name', label: 'Employee', type: 'text', group: 'employee', dataSource: 'workers', allowedOperators: ['equals', 'in', 'contains'], helpText: 'Employee who worked the hours' },
    { key: 'employee_number', label: 'Employee #', type: 'text', group: 'employee', allowedOperators: ['equals', 'contains'], helpText: 'Employee identification number' },
    { key: 'hours', label: 'Hours', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Number of hours worked' },
    { key: 'amount', label: 'Total Amount', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total cost (hours × hourly rate)' },
    { key: 'hourly_rate', label: 'Hourly Rate', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Employee hourly rate' },
    { key: 'project_number', label: 'Project #', type: 'text', group: 'project_info' },
    { key: 'project_name', label: 'Project Name', type: 'text', group: 'project_info' },
    { key: 'client_name', label: 'Client', type: 'text', group: 'project_info', dataSource: 'clients', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'description', label: 'Description', type: 'text', group: 'project_info', allowedOperators: ['equals', 'contains'] },
    { key: 'approval_status', label: 'Approval Status', type: 'text', group: 'status', enumValues: ['pending', 'approved', 'rejected'], allowedOperators: ['equals', 'not_equals', 'in'], helpText: 'Time entry approval status' },
    { key: 'start_time', label: 'Start Time', type: 'text', group: 'time', helpText: 'Time entry start time' },
    { key: 'end_time', label: 'End Time', type: 'text', group: 'time', helpText: 'Time entry end time' }
  ],
  estimate_line_items: [
    { key: 'estimate_number', label: 'Estimate #', type: 'text', group: 'project_info' },
    { key: 'project_number', label: 'Project #', type: 'text', group: 'project_info' },
    { key: 'project_name', label: 'Project Name', type: 'text', group: 'project_info' },
    { key: 'client_name', label: 'Client', type: 'text', group: 'project_info', dataSource: 'clients', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'category', label: 'Category', type: 'text', group: 'status', enumValues: [...Constants.public.Enums.expense_category], allowedOperators: ['equals', 'not_equals', 'in'] },
    { key: 'description', label: 'Description', type: 'text', group: 'project_info', allowedOperators: ['equals', 'contains'] },
    { key: 'quantity', label: 'Quantity', type: 'number', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'price_per_unit', label: 'Price/Unit', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'total', label: 'Total', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'cost_per_unit', label: 'Cost/Unit', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'total_cost', label: 'Total Cost', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'quote_count', label: 'Quote Count', type: 'number', group: 'status', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Number of quotes received for this line item' },
    { key: 'has_quotes', label: 'Has Quotes', type: 'boolean', group: 'status', helpText: 'Whether line item has any quotes' },
    { key: 'has_accepted_quote', label: 'Has Accepted Quote', type: 'boolean', group: 'status', helpText: 'Whether line item has an accepted quote' },
    { key: 'accepted_quote_count', label: 'Accepted Quotes', type: 'number', group: 'status', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'pending_quote_count', label: 'Pending Quotes', type: 'number', group: 'status', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] }
  ],
  internal_costs: [
    { key: 'category', label: 'Category', type: 'text', group: 'status', enumValues: ['labor_internal', 'management'], allowedOperators: ['equals', 'not_equals', 'in'], helpText: 'Internal labor or management expense' },
    { key: 'expense_date', label: 'Date', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Date when expense occurred' },
    { key: 'hours', label: 'Hours', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Hours worked (only for internal labor)' },
    { key: 'amount', label: 'Amount', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Cost amount' },
    { key: 'worker_name', label: 'Employee/Worker', type: 'text', group: 'employee', dataSource: 'workers', allowedOperators: ['equals', 'in', 'contains'], helpText: 'Employee name (for internal labor)' },
    { key: 'hourly_rate', label: 'Hourly Rate', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Hourly rate (for internal labor)' },
    { key: 'project_number', label: 'Project #', type: 'text', group: 'project_info' },
    { key: 'project_name', label: 'Project Name', type: 'text', group: 'project_info' },
    { key: 'client_name', label: 'Client', type: 'text', group: 'project_info', dataSource: 'clients', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'estimate_number', label: 'Estimate #', type: 'text', group: 'project_info', helpText: 'Approved estimate for this project' },
    { key: 'description', label: 'Description', type: 'text', group: 'project_info', allowedOperators: ['equals', 'contains'] },
    { key: 'approval_status', label: 'Approval Status', type: 'text', group: 'status', enumValues: ['pending', 'approved', 'rejected'], allowedOperators: ['equals', 'not_equals', 'in'], helpText: 'Expense approval status' },
    { key: 'start_time', label: 'Start Time', type: 'text', group: 'time', helpText: 'Start time (for internal labor with time tracking)' },
    { key: 'end_time', label: 'End Time', type: 'text', group: 'time', helpText: 'End time (for internal labor with time tracking)' }
  ]
};

export function SimpleReportBuilder({ onRunReport }: { onRunReport: (config: ReportConfig, fields: ReportField[]) => void }) {
  const [step, setStep] = useState(1);
  const [dataSource, setDataSource] = useState<ReportConfig['data_source']>('projects');
  const [selectedFields, setSelectedFields] = useState<string[]>(['project_number', 'project_name', 'contracted_amount', 'current_margin']);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const { executeReport, isLoading, error } = useReportExecution();
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportFields, setReportFields] = useState<ReportField[]>([]);

  const availableFields = (AVAILABLE_FIELDS[dataSource] || []).map(f => ({
    key: f.key,
    label: f.label,
    type: f.type
  }));

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey)
        ? prev.filter(k => k !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handlePreview = async () => {
    if (selectedFields.length === 0) {
      return;
    }

    const fields: ReportField[] = selectedFields.map(key => {
      const field = availableFields.find(f => f.key === key);
      return {
        key,
        label: field?.label || key,
        type: field?.type
      };
    });

    const filterMap: Record<string, ReportFilter> = {};
    filters.forEach((filter, index) => {
      filterMap[`filter_${index}`] = filter;
    });

    const config: ReportConfig = {
      data_source: dataSource,
      filters: filterMap,
      sort_by: sortBy,
      sort_dir: sortDir,
      limit: 100
    };

    const result = await executeReport(config);
    if (result) {
      setReportData(result.data);
      setReportFields(fields);
      setStep(4); // Go to preview step
    }
  };

  const handleRunReport = async () => {
    const fields: ReportField[] = selectedFields.map(key => {
      const field = availableFields.find(f => f.key === key);
      return {
        key,
        label: field?.label || key,
        type: field?.type
      };
    });

    const filterMap: Record<string, ReportFilter> = {};
    filters.forEach((filter, index) => {
      filterMap[`filter_${index}`] = filter;
    });

    const config: ReportConfig = {
      data_source: dataSource,
      filters: filterMap,
      sort_by: sortBy,
      sort_dir: sortDir,
      limit: 1000
    };

    onRunReport(config, fields);
  };

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((s, index) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step >= s ? 'bg-primary text-primary-foreground border-primary' : 'border-muted text-muted-foreground'
            }`}>
              {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
            </div>
            {index < 3 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                step > s ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Data Source */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: What do you want to report on?</CardTitle>
            <CardDescription>Select the type of data for your report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={dataSource} onValueChange={(value) => {
                setDataSource(value as ReportConfig['data_source']);
                // Reset fields when data source changes
                const defaultFields = AVAILABLE_FIELDS[value as keyof typeof AVAILABLE_FIELDS];
                setSelectedFields(defaultFields?.slice(0, 4).map(f => f.key) || []);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map(source => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setStep(2)} className="w-full">
              Next: Select Fields <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Fields */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: What information?</CardTitle>
            <CardDescription>Select the fields to include in your report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-4">
              {availableFields.map(field => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => handleFieldToggle(field.key)}
                  />
                  <Label htmlFor={field.key} className="font-normal cursor-pointer flex-1">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedFields.length === 0 && (
              <div className="text-sm text-destructive">Please select at least one field</div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={selectedFields.length === 0} className="flex-1">
                Next: Add Filters <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Filters */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Any filters?</CardTitle>
            <CardDescription>Optional: Filter the data to show only what you need</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilterSummary
              filters={filters}
              availableFields={AVAILABLE_FIELDS[dataSource] || []}
              onRemoveFilter={(index) => setFilters(filters.filter((_, i) => i !== index))}
              onClearAll={() => setFilters([])}
            />
            <SimpleFilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              availableFields={AVAILABLE_FIELDS[dataSource] || []}
              dataSource={dataSource}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(field => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={sortDir} onValueChange={(value) => setSortDir(value as 'ASC' | 'DESC')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASC">Ascending</SelectItem>
                    <SelectItem value="DESC">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handlePreview} disabled={isLoading || selectedFields.length === 0} className="flex-1">
                {isLoading ? 'Loading...' : 'Preview Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview Report</CardTitle>
              <CardDescription>Review your report data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <BrandedLoader message="Loading report data..." />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {reportData.length} rows
                    </div>
                    <ExportControls
                      reportName={`Custom ${dataSource} Report`}
                      data={reportData}
                      fields={reportFields}
                    />
                  </div>
                  <ReportViewer
                    data={reportData}
                    fields={reportFields}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      Back
                    </Button>
                    <Button onClick={handleRunReport} className="flex-1">
                      Run Full Report
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

