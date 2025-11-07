import { AlertTriangle, Clock, Camera, FileEdit, AlertCircle, FileText } from 'lucide-react';
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
}

export function NeedsAttentionCard({
  pendingTimeEntries,
  pendingReceipts,
  pendingChangeOrders,
  expiringQuotes,
  draftEstimates
}: NeedsAttentionCardProps) {
  const navigate = useNavigate();

  const items: NeedsAttentionItem[] = [
    {
      icon: <Clock className="h-4 w-4" />,
      label: 'Time entries pending',
      count: pendingTimeEntries,
      path: '/time-entries?status=pending',
      color: 'text-orange-600'
    },
    {
      icon: <Camera className="h-4 w-4" />,
      label: 'Receipts to review',
      count: pendingReceipts,
      path: '/time-tracker?tab=receipts&status=pending',
      color: 'text-blue-600'
    },
    {
      icon: <FileEdit className="h-4 w-4" />,
      label: 'Change orders pending',
      count: pendingChangeOrders,
      path: '/work-orders',
      color: 'text-purple-600'
    },
    {
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Quotes expire soon',
      count: expiringQuotes,
      path: '/quotes?filter=expiring',
      color: 'text-red-600'
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: 'Draft estimates',
      count: draftEstimates,
      path: '/estimates?status=draft',
      color: 'text-amber-600'
    }
  ].filter(item => item.count > 0);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle className="text-sm font-semibold">Needs Attention</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-1">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted text-left transition-colors h-8"
          >
            <span className={cn(item.color)}>{item.icon}</span>
            <span className="text-sm flex-1">{item.label}</span>
            <span className="text-sm font-semibold">{item.count}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
