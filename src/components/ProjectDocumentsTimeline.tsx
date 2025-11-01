import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { FileText, Image, Video, Receipt, FileCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProjectDocumentsTimelineProps {
  projectId: string;
}

type TimelineItem = {
  id: string;
  type: 'media' | 'receipt' | 'quote-pdf' | 'document';
  timestamp: Date;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  fileUrl: string;
  amount?: number;
  metadata?: any;
};

export function ProjectDocumentsTimeline({ projectId }: ProjectDocumentsTimelineProps) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['project-documents-timeline', projectId],
    queryFn: async () => {
      const timelineItems: TimelineItem[] = [];

      // Fetch media
      const { data: media } = await supabase
        .from('project_media')
        .select('*')
        .eq('project_id', projectId)
        .order('taken_at', { ascending: false });

      if (media) {
        media.forEach((m) => {
          timelineItems.push({
            id: m.id,
            type: 'media',
            timestamp: new Date(m.taken_at || m.created_at),
            title: m.description || m.file_name,
            thumbnailUrl: m.thumbnail_url || m.file_url,
            fileUrl: m.file_url,
            metadata: m,
          });
        });
      }

      // Fetch receipts
      const { data: receipts } = await supabase
        .from('receipts')
        .select('*')
        .eq('project_id', projectId)
        .order('captured_at', { ascending: false });

      if (receipts) {
        receipts.forEach((r) => {
          timelineItems.push({
            id: r.id,
            type: 'receipt',
            timestamp: new Date(r.captured_at),
            title: r.description || 'Receipt',
            thumbnailUrl: r.image_url,
            fileUrl: r.image_url,
            amount: Number(r.amount),
            metadata: r,
          });
        });
      }

      // Fetch quote PDFs
      const { data: quotes } = await supabase
        .from('quotes')
        .select('*, payees(payee_name)')
        .eq('project_id', projectId)
        .not('attachment_url', 'is', null)
        .order('date_received', { ascending: false });

      if (quotes) {
        quotes.forEach((q) => {
          timelineItems.push({
            id: q.id,
            type: 'quote-pdf',
            timestamp: new Date(q.date_received),
            title: `${q.quote_number} - ${(q.payees as any)?.payee_name || 'Quote'}`,
            subtitle: q.notes || undefined,
            fileUrl: q.attachment_url!,
            amount: Number(q.total_amount),
            metadata: q,
          });
        });
      }

      // Fetch project documents
      const { data: documents } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (documents) {
        documents.forEach((d) => {
          timelineItems.push({
            id: d.id,
            type: 'document',
            timestamp: new Date(d.created_at),
            title: d.file_name,
            subtitle: d.description || undefined,
            fileUrl: d.file_url,
            metadata: d,
          });
        });
      }

      // Sort all items by timestamp descending
      return timelineItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    },
  });

  const getIcon = (type: TimelineItem['type']) => {
    switch (type) {
      case 'media':
        return <Image className="w-4 h-4" />;
      case 'receipt':
        return <Receipt className="w-4 h-4" />;
      case 'quote-pdf':
        return <FileCheck className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: TimelineItem['type']) => {
    const labels = {
      'media': 'Photo/Video',
      'receipt': 'Receipt',
      'quote-pdf': 'Quote PDF',
      'document': 'Document',
    };
    return <Badge variant="secondary" className="text-xs">{labels[type]}</Badge>;
  };

  const groupByDate = (items: TimelineItem[]) => {
    const groups: Record<string, TimelineItem[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    items.forEach((item) => {
      const itemDate = new Date(item.timestamp);
      itemDate.setHours(0, 0, 0, 0);
      
      let groupKey: string;
      if (itemDate.getTime() === today.getTime()) {
        groupKey = '📅 Today';
      } else if (itemDate.getTime() === yesterday.getTime()) {
        groupKey = '📅 Yesterday';
      } else if (itemDate >= weekAgo) {
        groupKey = '📅 Last Week';
      } else {
        groupKey = `📅 ${format(itemDate, 'MMM d, yyyy')}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No documents or media found for this project</p>
      </div>
    );
  }

  const grouped = groupByDate(items);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateGroup, groupItems]) => (
        <div key={dateGroup}>
          <h3 className="text-sm font-medium mb-3">{dateGroup}</h3>
          <div className="space-y-2">
            {groupItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                {/* Icon/Thumbnail */}
                <div className="flex-shrink-0">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-muted rounded">
                      {getIcon(item.type)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {getTypeBadge(item.type)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{format(item.timestamp, 'h:mm a')}</span>
                    {item.amount !== undefined && (
                      <span className="font-medium">${item.amount.toFixed(2)}</span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{item.subtitle}</p>
                  )}
                </div>

                {/* Actions */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(item.fileUrl, '_blank')}
                  className="h-8"
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
