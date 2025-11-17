import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportFilter } from "@/hooks/useReportExecution";
import { FieldMetadata } from "./SimpleReportBuilder";
import { Calendar, TrendingDown, DollarSign, Clock, Users, CheckCircle2 } from "lucide-react";

interface FilterPresetsProps {
  dataSource: string;
  availableFields: FieldMetadata[];
  onApplyPreset: (filters: ReportFilter[]) => void;
}

interface PresetConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  filters: ReportFilter[];
  description?: string;
}

export function FilterPresets({ dataSource, availableFields, onApplyPreset }: FilterPresetsProps) {
  const getPresets = (): PresetConfig[] => {
    const presets: PresetConfig[] = [];

    if (dataSource === 'projects') {
      const statusField = availableFields.find(f => f.key === 'status');
      const marginField = availableFields.find(f => f.key === 'margin_percentage');
      const clientField = availableFields.find(f => f.key === 'client_name');
      const expensesField = availableFields.find(f => f.key === 'total_expenses');
      const contractedField = availableFields.find(f => f.key === 'contracted_amount');
      const startDateField = availableFields.find(f => f.key === 'start_date');

      if (statusField) {
        presets.push({
          label: 'Active Projects',
          icon: CheckCircle2,
          filters: [{
            field: 'status',
            operator: 'equals',
            value: 'in_progress'
          }],
          description: 'Show all in-progress projects'
        });
      }

      if (marginField) {
        presets.push({
          label: 'Low Margin',
          icon: TrendingDown,
          filters: [{
            field: 'margin_percentage',
            operator: 'less_than',
            value: '15'
          }],
          description: 'Projects with margin below 15%'
        });
      }

      if (expensesField && contractedField) {
        presets.push({
          label: 'Over Budget',
          icon: DollarSign,
          filters: [{
            field: 'total_expenses',
            operator: 'greater_than',
            value: '0'
          }],
          description: 'Projects exceeding budget'
        });
      }

      if (startDateField) {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        presets.push({
          label: 'Ending Soon',
          icon: Calendar,
          filters: [{
            field: 'end_date',
            operator: 'between',
            value: [formatDate(today), formatDate(thirtyDaysFromNow)]
          }],
          description: 'Projects ending in next 30 days'
        });
      }

      if (statusField) {
        presets.push({
          label: 'On Hold',
          icon: Clock,
          filters: [{
            field: 'status',
            operator: 'equals',
            value: 'on_hold'
          }],
          description: 'Projects currently on hold'
        });
      }
    }

    if (dataSource === 'expenses') {
      const categoryField = availableFields.find(f => f.key === 'category');
      const dateField = availableFields.find(f => f.key === 'expense_date');
      const amountField = availableFields.find(f => f.key === 'amount');
      const statusField = availableFields.find(f => f.key === 'approval_status');

      if (categoryField) {
        presets.push({
          label: 'Labor Only',
          icon: Users,
          filters: [{
            field: 'category',
            operator: 'equals',
            value: 'labor_internal'
          }],
          description: 'Show only internal labor expenses'
        });
      }

      if (amountField) {
        presets.push({
          label: 'Large Expenses',
          icon: DollarSign,
          filters: [{
            field: 'amount',
            operator: 'greater_than',
            value: '1000'
          }],
          description: 'Expenses over $1,000'
        });
      }

      if (statusField) {
        presets.push({
          label: 'Pending Approval',
          icon: Clock,
          filters: [{
            field: 'approval_status',
            operator: 'equals',
            value: 'pending'
          }],
          description: 'Expenses awaiting approval'
        });
      }

      if (dateField) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        presets.push({
          label: 'This Month',
          icon: Calendar,
          filters: [{
            field: 'expense_date',
            operator: 'between',
            value: [formatDate(firstDayOfMonth), formatDate(today)]
          }],
          description: 'Expenses from this month'
        });
      }
    }

    if (dataSource === 'time_entries') {
      const statusField = availableFields.find(f => f.key === 'approval_status');
      const dateField = availableFields.find(f => f.key === 'expense_date');
      const hoursField = availableFields.find(f => f.key === 'hours');

      if (statusField) {
        presets.push({
          label: 'Pending Approval',
          icon: Clock,
          filters: [{
            field: 'approval_status',
            operator: 'equals',
            value: 'pending'
          }],
          description: 'Time entries awaiting approval'
        });
      }

      if (hoursField) {
        presets.push({
          label: 'Overtime',
          icon: Clock,
          filters: [{
            field: 'hours',
            operator: 'greater_than',
            value: '8'
          }],
          description: 'Entries with more than 8 hours'
        });
      }

      if (dateField) {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        presets.push({
          label: 'Last 7 Days',
          icon: Calendar,
          filters: [{
            field: 'expense_date',
            operator: 'between',
            value: [formatDate(sevenDaysAgo), formatDate(today)]
          }],
          description: 'Time entries from last week'
        });
      }

      if (dateField) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        presets.push({
          label: 'This Month',
          icon: Calendar,
          filters: [{
            field: 'expense_date',
            operator: 'between',
            value: [formatDate(firstDayOfMonth), formatDate(today)]
          }],
          description: 'Time entries from this month'
        });
      }
    }

    if (dataSource === 'quotes') {
      const statusField = availableFields.find(f => f.key === 'status');
      const dateField = availableFields.find(f => f.key === 'date_received');

      if (statusField) {
        presets.push({
          label: 'Pending Quotes',
          icon: Clock,
          filters: [{
            field: 'status',
            operator: 'equals',
            value: 'pending'
          }],
          description: 'Quotes awaiting response'
        });
      }

      if (dateField) {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        presets.push({
          label: 'Last 30 Days',
          icon: Calendar,
          filters: [{
            field: 'date_received',
            operator: 'between',
            value: [formatDate(thirtyDaysAgo), formatDate(today)]
          }],
          description: 'Quotes received in last month'
        });
      }
    }

    if (dataSource === 'internal_costs') {
      const categoryField = availableFields.find(f => f.key === 'category');
      const hoursField = availableFields.find(f => f.key === 'hours');
      const dateField = availableFields.find(f => f.key === 'expense_date');

      if (categoryField) {
        presets.push({
          label: 'Internal Labor Only',
          icon: Users,
          filters: [{
            field: 'category',
            operator: 'equals',
            value: 'labor_internal'
          }],
          description: 'Show only internal labor expenses'
        });

        presets.push({
          label: 'Management Only',
          icon: DollarSign,
          filters: [{
            field: 'category',
            operator: 'equals',
            value: 'management'
          }],
          description: 'Show only management expenses'
        });
      }

      if (hoursField) {
        presets.push({
          label: 'With Hours',
          icon: Clock,
          filters: [{
            field: 'hours',
            operator: 'greater_than',
            value: '0'
          }],
          description: 'Entries with hours tracked'
        });
      }

      if (dateField) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        presets.push({
          label: 'This Month',
          icon: Calendar,
          filters: [{
            field: 'expense_date',
            operator: 'between',
            value: [formatDate(firstDayOfMonth), formatDate(today)]
          }],
          description: 'Internal costs from this month'
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        presets.push({
          label: 'Last 30 Days',
          icon: Calendar,
          filters: [{
            field: 'expense_date',
            operator: 'between',
            value: [formatDate(thirtyDaysAgo), formatDate(today)]
          }],
          description: 'Internal costs from last 30 days'
        });
      }
    }

    return presets;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const presets = getPresets();

  if (presets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Quick Filters</div>
        <Badge variant="secondary" className="text-xs">
          {presets.length} presets
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset, index) => {
          const Icon = preset.icon;
          return (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onApplyPreset(preset.filters)}
              className="h-auto py-2 px-3 flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">{preset.label}</span>
                {preset.description && (
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

