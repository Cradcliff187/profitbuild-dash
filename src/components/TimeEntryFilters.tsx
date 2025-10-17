import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { TimeEntryFilters } from "@/types/timeEntry";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

interface TimeEntryFiltersProps {
  filters: TimeEntryFilters;
  onFiltersChange: (filters: TimeEntryFilters) => void;
}

export const TimeEntryFiltersComponent = ({ filters, onFiltersChange }: TimeEntryFiltersProps) => {
  const [workers, setWorkers] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; number: string; name: string }>>([]);

  useEffect(() => {
    fetchWorkers();
    fetchProjects();
  }, []);

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from('payees')
      .select('id, payee_name')
      .eq('is_internal', true)
      .eq('provides_labor', true)
      .eq('is_active', true)
      .order('payee_name');
    
    if (data) {
      setWorkers(data.map(w => ({ id: w.id, name: w.payee_name })));
    }
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_number, project_name')
      .in('status', ['in_progress', 'approved'])
      .neq('project_number', 'SYS-000')
      .neq('project_number', '000-UNASSIGNED')
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
      workerId: null,
      projectId: null,
    });
  };

  const hasActiveFilters = 
    filters.dateFrom || 
    filters.dateTo || 
    filters.status !== 'all' || 
    filters.workerId || 
    filters.projectId;

  return (
    <div className="space-y-3 p-3 bg-muted/50 rounded-md border">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
            onValueChange={(value: any) => onFiltersChange({ ...filters, status: value })}
            className="h-8 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </NativeSelect>
        </div>

        <div className="space-y-1">
          <Label htmlFor="worker" className="text-xs">Worker</Label>
          <NativeSelect
            id="worker"
            value={filters.workerId || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, workerId: value === 'all' ? null : value })}
            className="h-8 text-xs"
          >
            <option value="all">All Workers</option>
            {workers.map(worker => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
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
