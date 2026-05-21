import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EFCLineStatus } from '@/hooks/useProjectEFC';

const STATUS_CONFIG: Record<EFCLineStatus, { label: string; className: string }> = {
  plan: { label: 'Plan', className: 'bg-slate-100 text-slate-700' },
  committed: { label: 'Committed', className: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-800' },
  overrun: { label: 'Overrun', className: 'bg-red-100 text-red-800' },
};

export function StatusPill({ status, className }: { status: EFCLineStatus; className?: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-0 rounded-full text-[10px] leading-none px-2 py-0.5 font-medium whitespace-nowrap',
        cfg.className,
        className
      )}
    >
      {cfg.label}
    </Badge>
  );
}
