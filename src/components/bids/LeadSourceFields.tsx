import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, type LeadSource } from '@/types/bid';

interface LeadSourceFieldsProps {
  source: LeadSource | '';
  sourceDetail: string;
  onSourceChange: (source: LeadSource) => void;
  onSourceDetailChange: (detail: string) => void;
  /** Mark the source as required (New Lead dialog). */
  required?: boolean;
  error?: string | null;
  disabled?: boolean;
  idPrefix?: string;
}

/**
 * Source + free-text detail — the ONE place the lead-source picker lives, so the
 * New Lead dialog and the Edit sheet can't drift. Labels come from
 * LEAD_SOURCE_LABELS; the value stored is the CHECK-constrained snake_case key.
 */
export function LeadSourceFields({
  source,
  sourceDetail,
  onSourceChange,
  onSourceDetailChange,
  required = false,
  error,
  disabled = false,
  idPrefix = 'lead',
}: LeadSourceFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-source`}>
          How did this come in?{required && ' *'}
        </Label>
        <Select
          value={source || undefined}
          onValueChange={(v) => onSourceChange(v as LeadSource)}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-source`} aria-invalid={!!error}>
            <SelectValue placeholder="Pick a source" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-source-detail`}>Source detail</Label>
        <Input
          id={`${idPrefix}-source-detail`}
          value={sourceDetail}
          onChange={(e) => onSourceDetailChange(e.target.value)}
          placeholder="e.g. teamradcliff.com contact form, 10/12/2026"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
