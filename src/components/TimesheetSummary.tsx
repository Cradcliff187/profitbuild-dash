import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface TimesheetEntry {
  workerId: string;
  workerName: string;
  hourlyRate: number;
  hours: Record<string, number | null>;
}

interface ValidationError {
  type: 'error' | 'warning' | 'info';
  message: string;
  rowIndex: number;
}

interface TimesheetSummaryProps {
  entries: TimesheetEntry[];
  validationErrors: ValidationError[];
}

export function TimesheetSummary({ entries, validationErrors }: TimesheetSummaryProps) {
  const totalHours = entries.reduce((sum, entry) => 
    sum + Object.values(entry.hours).reduce((s, h) => s + (h || 0), 0), 0
  );
  
  const totalCost = entries.reduce((sum, entry) => 
    sum + Object.values(entry.hours).reduce((s, h) => s + (h || 0), 0) * entry.hourlyRate, 0
  );

  const errors = validationErrors.filter(e => e.type === 'error');
  const warnings = validationErrors.filter(e => e.type === 'warning');
  const infos = validationErrors.filter(e => e.type === 'info');

  return (
    <div className="space-y-2">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-md">
        <div>
          <div className="text-xs text-muted-foreground">Total Hours</div>
          <div className="text-lg font-mono font-semibold">{totalHours.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total Cost</div>
          <div className="text-lg font-mono font-semibold">${totalCost.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Records</div>
          <div className="text-lg font-mono font-semibold">
            {entries.reduce((count, entry) => 
              count + Object.values(entry.hours).filter(h => h && h > 0).length, 0
            )}
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>{errors.length} Error{errors.length > 1 ? 's' : ''}:</strong>
            <ul className="mt-1 list-disc list-inside">
              {errors.map((error, idx) => (
                <li key={idx}>{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>{warnings.length} Warning{warnings.length > 1 ? 's' : ''}:</strong>
            <ul className="mt-1 list-disc list-inside">
              {warnings.slice(0, 3).map((warning, idx) => (
                <li key={idx}>{warning.message}</li>
              ))}
              {warnings.length > 3 && <li>...and {warnings.length - 3} more</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {infos.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>{infos.length} Info:</strong>
            <ul className="mt-1 list-disc list-inside">
              {infos.slice(0, 2).map((info, idx) => (
                <li key={idx}>{info.message}</li>
              ))}
              {infos.length > 2 && <li>...and {infos.length - 2} more</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
