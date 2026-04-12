import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function NotesField({ value, onChange, disabled = false }: NotesFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="time-entry-notes" className="text-sm font-medium">
        Time Entry Notes
      </Label>
      <Textarea
        id="time-entry-notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes about this shift (e.g., rain delay, material pickup, waiting on inspector)..."
        rows={2}
        disabled={disabled}
        className="resize-none text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Optional — visible to managers reviewing this time entry
      </p>
    </div>
  );
}
