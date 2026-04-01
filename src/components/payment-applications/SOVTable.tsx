import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SOVLineItem, ScheduleOfValues } from "@/types/paymentApplication";

interface SOVTableProps {
  sov: ScheduleOfValues;
  lines: SOVLineItem[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function SOVTable({ sov, lines }: SOVTableProps) {
  const totalScheduledValue = lines.reduce(
    (sum, line) => sum + (line.scheduled_value || 0),
    0
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Retainage: <strong>{sov.retainage_percent}%</strong>
        </span>
        <span className="text-muted-foreground">
          Contract Sum: <strong>{formatCurrency(sov.original_contract_sum)}</strong>
        </span>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Item #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32 text-right">Scheduled Value</TableHead>
              <TableHead className="w-28">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="font-mono text-sm">{line.item_number}</TableCell>
                <TableCell>{line.description}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(line.scheduled_value)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {line.source_change_order_id ? "Change Order" : "Estimate"}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell />
              <TableCell>Grand Total</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(totalScheduledValue)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
