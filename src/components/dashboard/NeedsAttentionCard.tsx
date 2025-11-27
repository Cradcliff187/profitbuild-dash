import { AlertTriangle, Clock, Camera, FileEdit, AlertCircle, FileText, Wrench, CalendarX2, PauseCircle, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NeedsAttentionItem {
  icon: React.ReactNode;
  label: string;
  count: number;
  path: string;
  color: string;
}

interface NeedsAttentionCardProps {
  pendingTimeEntries: number;
  pendingReceipts: number;
  pendingChangeOrders: number;
  expiringQuotes: number;
  draftEstimates: number;
  workOrdersWithoutEstimates?: number;
  overdueWorkOrders?: number;
  workOrdersOnHold?: number;
  workOrdersOverBudget?: number;
}

export function NeedsAttentionCard({
  pendingTimeEntries,
  pendingReceipts,
  pendingChangeOrders,
  expiringQuotes,
  draftEstimates,
  workOrdersWithoutEstimates = 0,
  overdueWorkOrders = 0,
  workOrdersOnHold = 0,
  workOrdersOverBudget = 0
}: NeedsAttentionCardProps) {
  const navigate = useNavigate();

  const items: NeedsAttentionItem[] = [
    {
      icon: <Clock className="h-3 w-3" />,
      label: 'Time entries pending',
      count: pendingTimeEntries,
      path: '/time-entries?status=pending',
      color: 'text-orange-600'
    },
    {
      icon: <Camera className="h-3 w-3" />,
      label: 'Receipts to review',
      count: pendingReceipts,
      path: '/time-entries?tab=receipts&status=pending',
      color: 'text-blue-600'
    },
    {
      icon: <FileEdit className="h-3 w-3" />,
      label: 'Change orders pending',
      count: pendingChangeOrders,
      path: '/work-orders',
      color: 'text-purple-600'
    },
    {
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Quotes expire soon',
      count: expiringQuotes,
      path: '/quotes?filter=expiring',
      color: 'text-red-600'
    },
    {
      icon: <FileText className="h-3 w-3" />,
      label: 'Draft estimates',
      count: draftEstimates,
      path: '/estimates?status=draft',
      color: 'text-amber-600'
    },
    {
      icon: <Wrench className="h-3 w-3" />,
      label: 'WOs need estimates',
      count: workOrdersWithoutEstimates,
      path: '/work-orders',
      color: 'text-amber-600'
    },
    {
      icon: <CalendarX2 className="h-3 w-3" />,
      label: 'WOs overdue',
      count: overdueWorkOrders,
      path: '/work-orders?filter=overdue',
      color: 'text-red-600'
    },
    {
      icon: <PauseCircle className="h-3 w-3" />,
      label: 'WOs on hold',
      count: workOrdersOnHold,
      path: '/work-orders?status=on_hold',
      color: 'text-yellow-600'
    },
    {
      icon: <TrendingDown className="h-3 w-3" />,
      label: 'WOs over budget',
      count: workOrdersOverBudget,
      path: '/work-orders?filter=over_budget',
      color: 'text-red-600'
    }
  ].filter(item => item.count > 0);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardHeader className="p-2 pb-1.5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <CardTitle className="text-xs font-semibold">Needs Attention</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0 space-y-0.5">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-1 w-full px-1.5 py-0.5 rounded hover:bg-muted text-left transition-colors h-6"
          >
            <span className={cn(item.color)}>{item.icon}</span>
            <span className="text-xs flex-1">{item.label}</span>
            <span className="text-xs font-semibold">{item.count}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
