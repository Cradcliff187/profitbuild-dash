import { useState, useEffect } from 'react';
import { User, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface WorkerOption {
  id: string;
  payee_name: string;
  user_id?: string | null;
}

export interface WorkerPickerProps {
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  showRates?: boolean;
  /** When true, auto-select current user's payee and show as read-only (field worker flow). */
  restrictToCurrentUser?: boolean;
}

export function WorkerPicker({
  value,
  onChange,
  disabled = false,
  showRates = false,
  restrictToCurrentUser = false,
}: WorkerPickerProps) {
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Includes both internal employees (is_internal=true) and linked
    // subcontractor labor providers (is_internal=false, payee_type='subcontractor',
    // provides_labor=true). user_id IS NOT NULL excludes orphan/unlinked vendor
    // rows. Mirrors the MobileTimeTracker self-clock filter so manual entry and
    // self-clock surfaces show the same set of people. The
    // enforce_time_entry_category_from_payee DB trigger rewrites category +
    // amount per payee shape on insert, so the form's hardcoded
    // category='labor_internal' is corrected at the DB layer for sub-as-labor.
    supabase
      .from('payees')
      .select('id, payee_name, user_id')
      .eq('provides_labor', true)
      .eq('is_active', true)
      .not('user_id', 'is', null)
      .order('payee_name')
      .then(({ data }) => {
        if (data) setWorkers(data as WorkerOption[]);
      });
  }, []);

  useEffect(() => {
    if (!restrictToCurrentUser || value || workers.length === 0) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.id) return;
      const myPayee = workers.find((w) => w.user_id === user.id);
      if (myPayee) onChange(myPayee.id);
    });
  }, [restrictToCurrentUser, workers, value, onChange]);

  const selected = workers.find((w) => w.id === value);
  const effectiveDisabled = disabled || (restrictToCurrentUser && !!selected);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <User className="w-4 h-4" />
        Worker *
      </Label>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'w-full min-h-[48px] justify-start text-left font-normal',
          !selected && 'text-muted-foreground'
        )}
        onClick={() => !effectiveDisabled && setOpen((o) => !o)}
        disabled={effectiveDisabled}
      >
        {selected ? selected.payee_name : 'Select worker...'}
      </Button>
      {open && !effectiveDisabled && (
        <div className="mt-2 border rounded-lg bg-card shadow-md relative z-50 max-h-64 overflow-y-auto">
          {workers.map((worker) => (
            <button
              key={worker.id}
              type="button"
              className={cn(
                'w-full min-h-[48px] px-4 py-3 text-left border-b last:border-b-0 transition-colors flex items-center justify-between',
                value === worker.id
                  ? 'bg-primary/10 border-l-4 border-l-primary'
                  : 'hover:bg-muted'
              )}
              onClick={() => {
                onChange(worker.id);
                setOpen(false);
              }}
            >
              <span className="font-medium">{worker.payee_name}</span>
              {value === worker.id && <Check className="w-5 h-5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
