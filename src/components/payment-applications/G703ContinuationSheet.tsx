import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { PaymentApplicationLineWithSOV } from "@/types/paymentApplication";

interface G703ContinuationSheetProps {
  lines: PaymentApplicationLineWithSOV[];
  isEditable: boolean;
  onUpdateLine: (lineId: string, currentWork: number, storedMaterials: number) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function CurrencyInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (val: number) => void;
  disabled: boolean;
}) {
  const [localValue, setLocalValue] = useState(String(value || 0));

  const handleBlur = () => {
    const parsed = parseFloat(localValue) || 0;
    setLocalValue(String(parsed));
    onChange(parsed);
  };

  return (
    <Input
      type="number"
      min={0}
      step={0.01}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      className="w-28 text-right font-mono text-sm h-8"
    />
  );
}

export function G703ContinuationSheet({
  lines,
  isEditable,
  onUpdateLine,
}: G703ContinuationSheetProps) {
  const handleChange = useCallback(
    (lineId: string, field: "current_work" | "stored_materials", value: number, line: PaymentApplicationLineWithSOV) => {
      const currentWork = field === "current_work" ? value : line.current_work;
      const storedMaterials = field === "stored_materials" ? value : line.stored_materials;
      onUpdateLine(lineId, currentWork, storedMaterials);
    },
    [onUpdateLine]
  );

  // Calculate grand totals
  const totals = lines.reduce(
    (acc, line) => ({
      scheduledValue: acc.scheduledValue + line.scheduled_value,
      previousWork: acc.previousWork + line.previous_work,
      currentWork: acc.currentWork + line.current_work,
      storedMaterials: acc.storedMaterials + line.stored_materials,
      totalCompleted: acc.totalCompleted + line.total_completed,
      balanceToFinish: acc.balanceToFinish + line.balance_to_finish,
      retainage: acc.retainage + line.retainage,
    }),
    {
      scheduledValue: 0,
      previousWork: 0,
      currentWork: 0,
      storedMaterials: 0,
      totalCompleted: 0,
      balanceToFinish: 0,
      retainage: 0,
    }
  );

  const overallPercent =
    totals.scheduledValue > 0
      ? ((totals.totalCompleted / totals.scheduledValue) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-12 text-center">A</TableHead>
            <TableHead className="min-w-[180px]">B</TableHead>
            <TableHead className="w-28 text-right">C</TableHead>
            <TableHead className="w-28 text-right">D</TableHead>
            <TableHead className="w-28 text-center">E</TableHead>
            <TableHead className="w-28 text-center">F</TableHead>
            <TableHead className="w-28 text-right">G</TableHead>
            <TableHead className="w-16 text-right">G%</TableHead>
            <TableHead className="w-28 text-right">H</TableHead>
            <TableHead className="w-28 text-right">I</TableHead>
          </TableRow>
          <TableRow className="text-xs bg-muted/30">
            <TableHead className="text-center">Item No.</TableHead>
            <TableHead>Description of Work</TableHead>
            <TableHead className="text-right">Scheduled Value</TableHead>
            <TableHead className="text-right">From Previous Application</TableHead>
            <TableHead className="text-center">This Period</TableHead>
            <TableHead className="text-center">Materials Presently Stored</TableHead>
            <TableHead className="text-right">Total Completed & Stored to Date</TableHead>
            <TableHead className="text-right">G/C %</TableHead>
            <TableHead className="text-right">Balance to Finish (C−G)</TableHead>
            <TableHead className="text-right">Retainage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="font-mono text-sm text-center">
                {line.sov_line_item.item_number}
              </TableCell>
              <TableCell className="text-sm">{line.sov_line_item.description}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(line.scheduled_value)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(line.previous_work)}
              </TableCell>
              <TableCell className="text-center">
                {isEditable ? (
                  <CurrencyInput
                    value={line.current_work}
                    onChange={(val) => handleChange(line.id, "current_work", val, line)}
                    disabled={false}
                  />
                ) : (
                  <span className="font-mono text-sm">{formatCurrency(line.current_work)}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {isEditable ? (
                  <CurrencyInput
                    value={line.stored_materials}
                    onChange={(val) => handleChange(line.id, "stored_materials", val, line)}
                    disabled={false}
                  />
                ) : (
                  <span className="font-mono text-sm">{formatCurrency(line.stored_materials)}</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(line.total_completed)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {line.percent_complete.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(line.balance_to_finish)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(line.retainage)}
              </TableCell>
            </TableRow>
          ))}
          {/* Grand Total Row */}
          <TableRow className="bg-muted/50 font-semibold border-t-2">
            <TableCell />
            <TableCell>GRAND TOTAL</TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.scheduledValue)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.previousWork)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.currentWork)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.storedMaterials)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.totalCompleted)}
            </TableCell>
            <TableCell className="text-right font-mono">{overallPercent}%</TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.balanceToFinish)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(totals.retainage)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
