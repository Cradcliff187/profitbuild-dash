import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Receipt {
  id: string;
  image_url: string;
  amount: number;
  description: string | null;
  captured_at: string;
  approval_status: string | null;
  user_id: string;
  payee_id: string | null;
  user_name?: string;
  payee_name?: string;
}

interface ProjectReceiptsViewProps {
  projectId: string;
}

export function ProjectReceiptsView({ projectId }: ProjectReceiptsViewProps) {
  const { data: receipts = [], isLoading } = useQuery<Receipt[]>({
    queryKey: ['project-receipts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('project_id', projectId)
        .order('captured_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles and payees separately
      const userIds = [...new Set(data.map(r => r.user_id))];
      const payeeIds = [...new Set(data.filter(r => r.payee_id).map(r => r.payee_id!))];

      const [profilesResult, payeesResult] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', userIds) : null,
        payeeIds.length > 0 ? supabase.from('payees').select('id, payee_name').in('id', payeeIds) : null
      ]);

      const profilesMap = new Map<string, string>();
      profilesResult?.data?.forEach(p => profilesMap.set(p.id, p.full_name));

      const payeesMap = new Map<string, string>();
      payeesResult?.data?.forEach(p => payeesMap.set(p.id, p.payee_name));

      return data.map(receipt => ({
        ...receipt,
        user_name: profilesMap.get(receipt.user_id) || 'Unknown',
        payee_name: receipt.payee_id ? payeesMap.get(receipt.payee_id) || undefined : undefined
      }));
    },
  });

  const getApprovalBadge = (status: string | null) => {
    if (!status || status === 'pending') {
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
    if (status === 'approved') {
      return <Badge variant="default" className="text-xs bg-green-500">Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading receipts...</div>;
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No receipts for this project yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {receipts.map((receipt) => (
          <div
            key={receipt.id}
            className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.open(receipt.image_url, '_blank')}
          >
            <div className="aspect-square bg-muted relative">
              <img
                src={receipt.image_url}
                alt="Receipt"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">
                  ${receipt.amount.toFixed(2)}
                </p>
                {getApprovalBadge(receipt.approval_status)}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {receipt.user_name}
              </p>
              {receipt.payee_name && (
                <p className="text-xs text-muted-foreground truncate">
                  {receipt.payee_name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(parseISO(receipt.captured_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
