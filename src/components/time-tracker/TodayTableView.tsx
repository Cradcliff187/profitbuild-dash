import { Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimeEntry {
  id: string;
  worker: {
    id: string;
    payee_name: string;
    hourly_rate: number;
  };
  project: {
    id: string;
    project_number: string;
    client_name: string;
  };
  hours: number;
  amount: number;
  note?: string;
  receiptUrl?: string;
}

interface TodayTableViewProps {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
}

export const TodayTableView = ({ entries, onEdit }: TodayTableViewProps) => {
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="space-y-2">
      {/* Compact Summary Bar */}
      <div className="bg-card rounded border p-2 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-lg font-mono font-bold text-primary">
              {totalHours.toFixed(1)} hrs
            </div>
            <div className="text-[10px] text-muted-foreground">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold text-green-600">
            ${totalAmount.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted-foreground">Total labor</div>
        </div>
      </div>

      {/* Compact Table */}
      <div className="border rounded overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b">
                <th className="px-2 py-1.5 text-left font-medium text-[11px]">Worker</th>
                <th className="px-2 py-1.5 text-left font-medium text-[11px]">Project</th>
                <th className="px-2 py-1.5 text-right font-medium text-[11px]">Hours</th>
                <th className="px-2 py-1.5 text-right font-medium text-[11px]">Amount</th>
                <th className="px-2 py-1.5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-muted-foreground">
                    No time entries today
                  </td>
                </tr>
              ) : (
                entries.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    className={cn(
                      'border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors',
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/10' // zebra striping
                    )}
                    onClick={() => onEdit(entry)}
                  >
                    <td className="px-2 py-1.5">
                      <div className="font-medium text-xs">{entry.worker.payee_name}</div>
                      {entry.note && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {entry.note}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="font-medium text-xs">
                        {entry.project.project_number}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {entry.project.client_name}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium">
                      {entry.hours.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium text-green-600">
                      ${entry.amount.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(entry);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
