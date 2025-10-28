import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

export interface ReceiptFilters {
  dateFrom: string | null;
  dateTo: string | null;
  status: string;
  payeeId: string | null;
  projectId: string | null;
  receiptType: string;
}

interface ReceiptFiltersProps {
  filters: ReceiptFilters;
  onFiltersChange: (filters: ReceiptFilters) => void;
}

export const ReceiptFiltersComponent = ({ filters, onFiltersChange }: ReceiptFiltersProps) => {
  const [payees, setPayees] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; number: string; name: string }>>([]);

  useEffect(() => {
    fetchPayees();
    fetchProjects();
  }, []);

  const fetchPayees = async () => {
    const { data } = await supabase
      .from('payees')
      .select('id, payee_name')
      .eq('is_active', true)
      .order('payee_name');
    
    if (data) {
      setPayees(data.map(p => ({ id: p.id, name: p.payee_name })));
    }
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_number, project_name')
      .in('status', ['in_progress', 'approved'])
      .order('project_number');
    
    if (data) {
      setProjects(data.map(p => ({ 
        id: p.id, 
        number: p.project_number, 
        name: p.project_name 
      })));
    }
  };

  const handleClearFilters = () => {
    onFiltersChange({
      dateFrom: null,
      dateTo: null,
      status: 'all',
      payeeId: null,
      projectId: null,
      receiptType: 'all',
    });
  };

  const hasActiveFilters = 
    filters.dateFrom || 
    filters.dateTo || 
    filters.status !== 'all' || 
    filters.payeeId || 
    filters.projectId ||
    filters.receiptType !== 'all';

  return (
    <div className="space-y-2 p-2 bg-muted/50 rounded-md border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filters</h3>
        {hasActiveFilters && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleClearFilters}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
        <div className="space-y-1">
          <Label htmlFor="date-from" className="text-xs">From Date</Label>
          <Input
            id="date-from"
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || null })}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="date-to" className="text-xs">To Date</Label>
          <Input
            id="date-to"
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || null })}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="status" className="text-xs">Status</Label>
          <NativeSelect
            id="status"
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            className="h-8 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </NativeSelect>
        </div>

        <div className="space-y-1">
          <Label htmlFor="receipt-type" className="text-xs">Receipt Type</Label>
          <NativeSelect
            id="receipt-type"
            value={filters.receiptType}
            onValueChange={(value) => onFiltersChange({ ...filters, receiptType: value })}
            className="h-8 text-xs"
          >
            <option value="all">All Types</option>
            <option value="time_entry">Time Entry</option>
            <option value="standalone">Standalone</option>
          </NativeSelect>
        </div>

        <div className="space-y-1">
          <Label htmlFor="payee" className="text-xs">Payee</Label>
          <NativeSelect
            id="payee"
            value={filters.payeeId || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, payeeId: value === 'all' ? null : value })}
            className="h-8 text-xs"
          >
            <option value="all">All Payees</option>
            {payees.map(payee => (
              <option key={payee.id} value={payee.id}>
                {payee.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1">
          <Label htmlFor="project" className="text-xs">Project</Label>
          <NativeSelect
            id="project"
            value={filters.projectId || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, projectId: value === 'all' ? null : value })}
            className="h-8 text-xs"
          >
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.number} - {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
};
