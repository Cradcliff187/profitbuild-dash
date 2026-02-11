import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SimpleFilterPanel } from "./SimpleFilterPanel";
import { FilterSummary } from "./FilterSummary";
import { ReportViewer } from "./ReportViewer";
import { ExportControls } from "./ExportControls";
import { useReportExecution, ReportFilter, ReportConfig } from "@/hooks/useReportExecution";
import { useReportTemplates } from "@/hooks/useReportTemplates";
import { ReportField } from "@/utils/reportExporter";
import { ArrowRight, CheckCircle2, Save } from "lucide-react";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

export interface FieldMetadata {
  key: string;
  label: string;
  type: ReportField['type'];
  enumValues?: string[];
  dataSource?: 'clients' | 'payees' | 'workers' | 'projects';
  group?: 'financial' | 'project_info' | 'dates' | 'status' | 'employee' | 'time' | 'composition' | 'change_orders' | 'invoicing' | 'contingency' | 'estimates' | 'Training';
  helpText?: string;
  allowedOperators?: ReportFilter['operator'][];
}

const DATA_SOURCES = [
  { value: 'projects', label: 'Projects' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'time_entries', label: 'Time Entries' },
  { value: 'weekly_labor_hours', label: 'Weekly Labor Hours' },
  { value: 'estimate_line_items', label: 'Estimate Line Items' },
  { value: 'internal_costs', label: 'Internal Costs' },
  { value: 'reporting.training_status', label: 'Training Status' }
] as const;

export const AVAILABLE_FIELDS: Record<string, FieldMetadata[]> = {
  projects: [
    { key: 'project_number', label: 'Project #', type: 'text', group: 'project_info' },
    { key: 'project_name', label: 'Project Name', type: 'text', group: 'project_info' },
    { key: 'client_name', label: 'Client', type: 'text', group: 'project_info', dataSource: 'clients', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'status', label: 'Status', type: 'text', group: 'status', enumValues: [...Constants.public.Enums.project_status], allowedOperators: ['equals', 'not_equals', 'in'] },
    { key: 'contracted_amount', label: 'Contract Amount (Estimated)', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total contract value including approved estimates and change orders (estimated revenue)' },
    { key: 'actual_margin', label: 'Actual Margin', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'margin_percentage', label: 'Margin %', type: 'percent', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'total_expenses', label: 'Total Expenses', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'target_margin', label: 'Target Margin', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'minimum_margin_threshold', label: 'Min. Margin Threshold', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'adjusted_est_margin', label: 'Adjusted Est. Margin', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'original_margin', label: 'Original Margin', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'original_est_costs', label: 'Original Est. Costs', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'adjusted_est_costs', label: 'Adjusted Est. Costs', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'total_accepted_quotes', label: 'Total Accepted Quotes', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'remaining_budget', label: 'Remaining Budget', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'cost_variance', label: 'Cost Variance', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'budget_utilization_percent', label: 'Budget Utilization %', type: 'percent', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'cost_variance_percent', label: 'Cost Variance %', type: 'percent', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'revenue_variance', label: 'Revenue Variance', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Difference between estimated contract amount and actual invoiced amount (contracted_amount - total_invoiced)' },
    { key: 'revenue_variance_percent', label: 'Revenue Variance %', type: 'percent', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Percentage difference between estimated and actual revenue (shows billing progress)' },
    { key: 'contingency_remaining', label: 'Contingency Remaining', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'start_date', label: 'Start Date', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'end_date', label: 'End Date', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'change_order_revenue', label: 'Change Order Revenue', type: 'currency', group: 'change_orders', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'change_order_cost', label: 'Change Order Cost', type: 'currency', group: 'change_orders', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'change_order_count', label: 'Change Order Count', type: 'number', group: 'change_orders', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'total_invoiced', label: 'Total Invoiced (Actual)', type: 'currency', group: 'invoicing', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Sum of all invoices from reporting.project_financials view (split-aware: includes revenue_splits for accurate project totals)' },
    { key: 'invoice_count', label: 'Invoice Count', type: 'number', group: 'invoicing', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'contingency_amount', label: 'Contingency Amount', type: 'currency', group: 'contingency', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'contingency_used', label: 'Contingency Used', type: 'currency', group: 'contingency', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'contingency_utilization_percent', label: 'Contingency Utilization %', type: 'percent', group: 'contingency', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Percentage of contingency used: (contingency_used / contingency_amount) × 100' },
    { key: 'estimate_number', label: 'Estimate Number', type: 'text', group: 'estimates' },
    { key: 'estimate_total', label: 'Estimate Total', type: 'currency', group: 'estimates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'estimate_cost', label: 'Estimate Cost', type: 'currency', group: 'estimates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'expense_count', label: 'Expense Count', type: 'number', group: 'estimates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'total_line_items', label: 'Total Line Items', type: 'number', group: 'estimates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
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
    { key: 'expense_date', label: 'Work Date', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Date when work was performed (business date for payroll)' },
    { key: 'created_at', label: 'Created At', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'When the time entry record was created in the system' },
    { key: 'submitted_for_approval_at', label: 'Submitted At', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between', 'is_null', 'is_not_null'], helpText: 'When the entry was submitted for approval' },
    { key: 'approved_at', label: 'Approved At', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between', 'is_null', 'is_not_null'], helpText: 'When the entry was approved or rejected' },
    { key: 'worker_name', label: 'Employee', type: 'text', group: 'employee', dataSource: 'workers', allowedOperators: ['equals', 'in', 'contains'], helpText: 'Employee who worked the hours' },
    { key: 'employee_number', label: 'Employee #', type: 'text', group: 'employee', allowedOperators: ['equals', 'contains'], helpText: 'Employee identification number' },
    { key: 'hours', label: 'Hours (Net)', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Net billable hours (after lunch deduction). Use gross_hours for total shift duration.' },
    { key: 'amount', label: 'Total Amount', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total cost (hours × hourly rate)' },
    { key: 'hourly_rate', label: 'Hourly Rate', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Employee hourly rate' },
    { key: 'project_number', label: 'Project #', type: 'text', group: 'project_info' },
    { key: 'project_name', label: 'Project Name', type: 'text', group: 'project_info' },
    { key: 'client_name', label: 'Client', type: 'text', group: 'project_info', dataSource: 'clients', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'description', label: 'Description', type: 'text', group: 'project_info', allowedOperators: ['equals', 'contains'] },
    { key: 'approval_status', label: 'Approval Status', type: 'text', group: 'status', enumValues: ['pending', 'approved', 'rejected'], allowedOperators: ['equals', 'not_equals', 'in'], helpText: 'Time entry approval status' },
    { key: 'start_time', label: 'Start Time', type: 'date', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Time entry start timestamp' },
    { key: 'end_time', label: 'End Time', type: 'date', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Time entry end timestamp' },
    { key: 'lunch_taken', label: 'Lunch Taken', type: 'boolean', group: 'time', helpText: 'Whether lunch was taken' },
    { key: 'lunch_duration_minutes', label: 'Lunch Duration', type: 'number', group: 'time', helpText: 'Lunch duration in minutes' },
    { key: 'gross_hours', label: 'Gross Hours', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total shift duration (end_time - start_time) before lunch deduction. Use hours for billable hours.' }
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
    { key: 'start_time', label: 'Start Time', type: 'date', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Start time (for internal labor with time tracking)' },
    { key: 'end_time', label: 'End Time', type: 'date', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'End time (for internal labor with time tracking)' }
  ],
  internal_labor_hours: [
    { key: 'project_id', label: 'Project ID', type: 'text', group: 'project_info' }, // Added for internal use
    { key: 'project_number', label: 'Project #', type: 'text', group: 'project_info' },
    { key: 'project_name', label: 'Project Name', type: 'text', group: 'project_info' },
    { key: 'client_name', label: 'Client', type: 'text', group: 'project_info', dataSource: 'clients', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'status', label: 'Status', type: 'text', group: 'status', enumValues: [...Constants.public.Enums.project_status], allowedOperators: ['equals', 'not_equals', 'in'] },
    { key: 'estimated_hours', label: 'Estimated Hours', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total hours from approved estimate line items' },
    { key: 'actual_hours', label: 'Actual Hours', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total hours from expense records' },
    { key: 'hours_variance', label: 'Hours Variance', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Difference between estimated and actual hours' },
    { key: 'estimated_cost', label: 'Estimated Cost', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total cost from approved estimate line items' },
    { key: 'actual_cost', label: 'Actual Cost', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total cost from expense records' },
    { key: 'cost_variance', label: 'Cost Variance', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Difference between estimated and actual costs' },
    { key: 'lunch_taken', label: 'Lunch Taken', type: 'boolean', group: 'time', helpText: 'Whether lunch was taken' },
    { key: 'lunch_duration_minutes', label: 'Lunch Duration', type: 'number', group: 'time', helpText: 'Lunch duration in minutes' },
    { key: 'gross_hours', label: 'Gross Hours', type: 'number', group: 'time', helpText: 'Total shift duration before lunch deduction' }
  ],
  weekly_labor_hours: [
    { key: 'employee_number', label: 'Employee #', type: 'text', group: 'employee', helpText: 'Employee identification number' },
    { key: 'employee_name', label: 'Employee Name', type: 'text', group: 'employee', dataSource: 'workers', allowedOperators: ['equals', 'in', 'contains'] },
    { key: 'week_start_sunday', label: 'Week Starting (Sunday)', type: 'date', group: 'dates', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'First day of the week (Sunday)' },
    { key: 'week_end_saturday', label: 'Week Ending (Saturday)', type: 'date', group: 'dates', helpText: 'Last day of the week (Saturday)' },
    { key: 'total_hours', label: 'Total Hours (Net)', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Net billable hours after lunch deductions. Use gross_hours for total shift duration.' },
    { key: 'gross_hours', label: 'Gross Hours', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total shift duration before lunch deduction. Use total_hours for billable hours.' },
    { key: 'total_cost', label: 'Total Cost', type: 'currency', group: 'financial', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Total labor cost for the week' },
    { key: 'hourly_rate', label: 'Hourly Rate', type: 'currency', group: 'financial', helpText: 'Employee hourly rate' },
    { key: 'entry_count', label: 'Entry Count', type: 'number', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Number of time entries in the week' },
    { key: 'approved_entries', label: 'Approved Entries', type: 'number', group: 'status', helpText: 'Number of approved time entries' },
    { key: 'pending_entries', label: 'Pending Entries', type: 'number', group: 'status', helpText: 'Number of pending time entries' },
    { key: 'rejected_entries', label: 'Rejected Entries', type: 'number', group: 'status', helpText: 'Number of rejected time entries' }
  ],
  'reporting.training_status': [
    { key: 'employee_name', label: 'Employee Name', type: 'text', group: 'Training' },
    { key: 'content_title', label: 'Content Title', type: 'text', group: 'Training' },
    { key: 'content_type', label: 'Content Type', type: 'text', group: 'Training', enumValues: ['video_link', 'video_embed', 'document', 'presentation', 'external_link'], allowedOperators: ['equals', 'not_equals', 'in'] },
    { key: 'status', label: 'Status', type: 'text', group: 'Training', enumValues: ['completed', 'overdue', 'assigned', 'pending'], allowedOperators: ['equals', 'not_equals', 'in'] },
    { key: 'is_required', label: 'Is Required', type: 'boolean', group: 'Training' },
    { key: 'due_date', label: 'Due Date', type: 'date', group: 'Training', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'assigned_at', label: 'Assigned At', type: 'date', group: 'Training', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'completed_at', label: 'Completed At', type: 'date', group: 'Training', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'days_remaining', label: 'Days Remaining', type: 'number', group: 'Training', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'estimated_duration', label: 'Estimated Duration (minutes)', type: 'number', group: 'Training', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] },
    { key: 'actual_duration', label: 'Actual Duration (minutes)', type: 'number', group: 'Training', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'] }
  ]
};

// Default sort columns for each data source (fallback when created_at doesn't exist)
const DEFAULT_SORT_COLUMNS: Record<string, string> = {
  projects: 'created_at',
  expenses: 'expense_date',
  quotes: 'created_at',
  time_entries: 'expense_date',
  estimate_line_items: 'sort_order',
  internal_costs: 'expense_date',
  internal_labor_hours: 'expense_date',
  weekly_labor_hours: 'week_start_sunday',
  'reporting.training_status': 'assigned_at',
};

export function SimpleReportBuilder({ onRunReport }: { onRunReport: (config: ReportConfig, fields: ReportField[]) => void }) {
  const [step, setStep] = useState(1);
  const [dataSource, setDataSource] = useState<ReportConfig['data_source']>('projects');
  const [selectedFields, setSelectedFields] = useState<string[]>(['project_number', 'project_name', 'contracted_amount', 'adjusted_est_margin']);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_COLUMNS['projects'] || 'created_at');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const { executeReport, isLoading, error } = useReportExecution();
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportFields, setReportFields] = useState<ReportField[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveCategory, setSaveCategory] = useState<'financial' | 'operational' | 'client' | 'vendor' | 'schedule'>('operational');
  const { saveReport, loadSavedReports } = useReportTemplates();
  const availableFields = (AVAILABLE_FIELDS[dataSource] || []).map(f => ({
    key: f.key,
    label: f.label,
    type: f.type
  }));

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields(prev => {
      const isSelected = prev.includes(fieldKey);
      
      if (fieldKey === 'project_name') {
        // When selecting project_name, also select project_number if not already selected
        if (!isSelected) {
          const hasProjectNumber = prev.includes('project_number');
          if (!hasProjectNumber) {
            // Add project_number before project_name
            return ['project_number', ...prev, 'project_name'];
          }
          return [...prev, 'project_name'];
        } else {
          // When deselecting project_name, also deselect project_number
          return prev.filter(k => k !== 'project_name' && k !== 'project_number');
        }
      } else if (fieldKey === 'project_number') {
        // When deselecting project_number, also deselect project_name
        if (isSelected) {
          return prev.filter(k => k !== 'project_number' && k !== 'project_name');
        } else {
          // When selecting project_number, ensure it comes before project_name
          const hasProjectName = prev.includes('project_name');
          if (hasProjectName) {
            const withoutBoth = prev.filter(k => k !== 'project_name' && k !== 'project_number');
            return ['project_number', 'project_name', ...withoutBoth];
          }
          // If project_name is not selected, just add project_number at the start if it's a project field
          const projectNumberIndex = prev.findIndex(k => k === 'project_name' || k.startsWith('project_'));
          if (projectNumberIndex >= 0) {
            return [
              ...prev.slice(0, projectNumberIndex),
              'project_number',
              ...prev.slice(projectNumberIndex)
            ];
          }
          return ['project_number', ...prev];
        }
      } else {
        // For other fields, just toggle normally
        return isSelected
          ? prev.filter(k => k !== fieldKey)
          : [...prev, fieldKey];
      }
    });
  };

  // Helper function to ensure project_number comes before project_name
  const sortFields = (fields: string[]): string[] => {
    const projectNumberIndex = fields.indexOf('project_number');
    const projectNameIndex = fields.indexOf('project_name');
    
    if (projectNameIndex >= 0 && projectNumberIndex >= 0 && projectNumberIndex > projectNameIndex) {
      // Swap them so project_number comes first
      const sorted = [...fields];
      sorted[projectNameIndex] = 'project_number';
      sorted[projectNumberIndex] = 'project_name';
      return sorted;
    }
    return fields;
  };

  const handlePreview = async () => {
    if (selectedFields.length === 0) {
      return;
    }

    // Ensure proper field ordering
    const sortedFields = sortFields(selectedFields);

    const fields: ReportField[] = sortedFields.map(key => {
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
    // Ensure proper field ordering
    const sortedFields = sortFields(selectedFields);

    const fields: ReportField[] = sortedFields.map(key => {
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

  const handleSaveReport = async () => {
    if (!saveName.trim()) {
      toast.error("Name required", { description: "Please enter a name for the report" });
      return;
    }

    // Ensure proper field ordering
    const sortedFields = sortFields(selectedFields);

    const fields: ReportField[] = sortedFields.map(key => {
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
      fields: sortedFields,
      filters: filterMap,
      sort_by: sortBy,
      sort_dir: sortDir
    };

    const reportId = await saveReport(
      saveName.trim(),
      saveDescription.trim() || null,
      saveCategory,
      config,
      false // isTemplate = false for custom reports
    );

    if (reportId) {
      toast.success("Report saved", { description: "Your custom report has been saved successfully" });
      setSaveDialogOpen(false);
      setSaveName('');
      setSaveDescription('');
      // Refresh saved reports list
      await loadSavedReports();
    } else {
      toast.error("Failed to save", { description: "Could not save the report. Please try again." });
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Step Progress */}
      <div className="flex items-center justify-between min-w-0">
        {[1, 2, 3, 4].map((s, index) => (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex-shrink-0 ${
              step >= s ? 'bg-primary text-primary-foreground border-primary' : 'border-muted text-muted-foreground'
            }`}>
              {step > s ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <span className="text-xs sm:text-sm">{s}</span>}
            </div>
            {index < 3 && (
              <div className={`flex-1 h-0.5 mx-1 sm:mx-2 min-w-0 ${
                step > s ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Data Source */}
      {step === 1 && (
        <Card className="w-full max-w-full overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-4">
            <CardTitle>Step 1: What do you want to report on?</CardTitle>
            <CardDescription>Select the type of data for your report</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 space-y-4">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={dataSource} onValueChange={(value) => {
                setDataSource(value as ReportConfig['data_source']);
                // Reset fields and sort when data source changes
                const defaultFields = AVAILABLE_FIELDS[value as keyof typeof AVAILABLE_FIELDS];
                setSelectedFields(defaultFields?.slice(0, 4).map(f => f.key) || []);
                setSortBy(DEFAULT_SORT_COLUMNS[value] || 'created_at');
              }}>
                <SelectTrigger className="w-full">
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
        <Card className="w-full max-w-full overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-4">
            <CardTitle>Step 2: What information?</CardTitle>
            <CardDescription>Select the fields to include in your report</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 space-y-4">
            <div className="space-y-3 max-h-64 sm:max-h-96 overflow-y-auto border rounded-md p-3 sm:p-4 w-full">
              {availableFields.map(field => (
                <div key={field.key} className="flex items-center space-x-2 min-w-0">
                  <Checkbox
                    id={field.key}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => handleFieldToggle(field.key)}
                    className="flex-shrink-0"
                  />
                  <Label htmlFor={field.key} className="font-normal cursor-pointer flex-1 min-w-0 truncate">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedFields.length === 0 && (
              <div className="text-sm text-destructive">Please select at least one field</div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="w-full sm:w-auto">
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={selectedFields.length === 0} className="flex-1 w-full sm:w-auto">
                Next: Add Filters <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Filters */}
      {step === 3 && (
        <Card className="w-full max-w-full overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-4">
            <CardTitle>Step 3: Any filters?</CardTitle>
            <CardDescription>Optional: Filter the data to show only what you need</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 space-y-4">
            <div className="w-full max-w-full overflow-hidden">
            <FilterSummary
              filters={filters}
              availableFields={AVAILABLE_FIELDS[dataSource] || []}
              onRemoveFilter={(index) => setFilters(filters.filter((_, i) => i !== index))}
              onClearAll={() => setFilters([])}
            />
            </div>
            <div className="w-full max-w-full overflow-hidden">
            <SimpleFilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              availableFields={AVAILABLE_FIELDS[dataSource] || []}
              dataSource={dataSource}
            />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
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
                  <SelectTrigger className="w-full">
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

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="w-full sm:w-auto">
                Back
              </Button>
              <Button onClick={handlePreview} disabled={isLoading || selectedFields.length === 0} className="flex-1 w-full sm:w-auto">
                {isLoading ? 'Loading...' : 'Preview Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview */}
      {step === 4 && (
        <div className="space-y-4 w-full max-w-full overflow-hidden">
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader className="px-3 sm:px-6 py-4">
              <CardTitle>Preview Report</CardTitle>
              <CardDescription>Review your report data</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4 space-y-4">
              {isLoading ? (
                <BrandedLoader message="Loading report data..." />
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setStep(3)} className="w-full sm:w-auto">
                      Back
                    </Button>
                    <Button variant="outline" onClick={() => setSaveDialogOpen(true)} className="w-full sm:w-auto">
                      <Save className="h-4 w-4 mr-2" />
                      Save Report
                    </Button>
                    <Button onClick={handleRunReport} className="flex-1 w-full sm:w-auto">
                      Run Full Report
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Report Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Save Custom Report</DialogTitle>
            <DialogDescription>
              Save this report configuration for future use
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">Report Name *</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter report name"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-description">Description</Label>
              <Textarea
                id="save-description"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-category">Category</Label>
              <Select value={saveCategory} onValueChange={(value: any) => setSaveCategory(value)}>
                <SelectTrigger id="save-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReport} disabled={!saveName.trim()}>
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

