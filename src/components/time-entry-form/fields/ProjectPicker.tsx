import { useState, useEffect } from 'react';
import { MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const PTO_PROJECT_NUMBERS = ['006-SICK', '007-VAC', '008-HOL'];

interface ProjectOption {
  id: string;
  project_name: string;
  project_number: string;
}

function getProjectDisplayName(p: ProjectOption): string {
  if (PTO_PROJECT_NUMBERS.includes(p.project_number)) {
    return p.project_name;
  }
  return `${p.project_number} - ${p.project_name}`;
}

export interface ProjectPickerProps {
  value: string | null;
  onChange: (id: string, projectNumber: string) => void;
  disabled?: boolean;
}

export function ProjectPicker({
  value,
  onChange,
  disabled = false,
}: ProjectPickerProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, project_name, project_number, category')
      .in('status', ['approved', 'in_progress'])
      .or('category.eq.construction,project_number.in.(006-SICK,007-VAC,008-HOL)')
      .order('project_number', { ascending: true })
      .then(({ data }) => {
        if (data) setProjects(data);
      });
  }, []);

  const selected = projects.find((p) => p.id === value);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Project *
      </Label>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'w-full min-h-[48px] justify-start text-left font-normal',
          !selected && 'text-muted-foreground'
        )}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        {selected ? getProjectDisplayName(selected) : 'Select project...'}
      </Button>
      {open && !disabled && (
        <div className="mt-2 border rounded-lg bg-card shadow-md relative z-50 max-h-64 overflow-y-auto">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={cn(
                'w-full min-h-[48px] px-4 py-3 text-left border-b last:border-b-0 transition-colors flex items-center justify-between gap-2',
                value === project.id
                  ? 'bg-primary/10 border-l-4 border-l-primary'
                  : 'hover:bg-muted'
              )}
              onClick={() => {
                onChange(project.id, project.project_number);
                setOpen(false);
              }}
            >
              <span className="font-medium truncate min-w-0">
                {getProjectDisplayName(project)}
              </span>
              {value === project.id && <Check className="w-5 h-5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
