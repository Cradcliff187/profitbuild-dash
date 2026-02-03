import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { FileText, Image, Video, Receipt, FileCheck, Loader2, Filter, MoreHorizontal, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { DocumentPreviewModals } from '@/components/documents/DocumentPreviewModals';
import { useIsMobile } from '@/hooks/use-mobile';
import { DOCUMENT_TYPE_LABELS } from '@/types/document';
import type { DocumentType } from '@/types/document';

interface ProjectDocumentsTimelineProps {
  projectId: string;
  projectNumber?: string;
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

export function ProjectDocumentsTimeline({ projectId, projectNumber }: ProjectDocumentsTimelineProps) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TimelineItem['type'] | 'all'>('all');
  const preview = useDocumentPreview();
  
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

      if (media && media.length > 0) {
        // Batch generate signed URLs for all media files
        const mediaPaths = media
          .map((m) => m.file_url)
          .filter((path): path is string => !!path && !path.startsWith('http'));

        const { data: signedUrlsData } = mediaPaths.length > 0
          ? await supabase.storage
              .from('project-media')
              .createSignedUrls(mediaPaths, 604800) // 7 days
          : { data: null };

        // Build path → signedUrl lookup map
        const signedUrlMap = new Map<string, string>();
        if (signedUrlsData) {
          signedUrlsData.forEach((item) => {
            if (item.signedUrl && item.path) {
              signedUrlMap.set(item.path, item.signedUrl);
            }
          });
        }

        // Also generate signed URLs for video thumbnails if any exist
        const videoThumbnailPaths = media
          .filter((m) => m.file_type === 'video' && m.thumbnail_url)
          .map((m) => `thumbnails/${m.id}.jpg`);

        const thumbnailUrlMap = new Map<string, string>();
        if (videoThumbnailPaths.length > 0) {
          const { data: thumbSignedUrls } = await supabase.storage
            .from('project-media-thumbnails')
            .createSignedUrls(videoThumbnailPaths, 604800);

          if (thumbSignedUrls) {
            thumbSignedUrls.forEach((item) => {
              if (item.signedUrl && item.path) {
                thumbnailUrlMap.set(item.path, item.signedUrl);
              }
            });
          }
        }

        media.forEach((m) => {
          // Resolve the signed URL for this media item
          const signedFileUrl = m.file_url?.startsWith('http')
            ? m.file_url // Already a full URL (defensive)
            : signedUrlMap.get(m.file_url) || m.file_url;

          // For thumbnails: use video thumbnail if available, otherwise use signed file URL
          let resolvedThumbnailUrl = signedFileUrl;
          if (m.file_type === 'video' && m.thumbnail_url) {
            const thumbPath = `thumbnails/${m.id}.jpg`;
            resolvedThumbnailUrl = thumbnailUrlMap.get(thumbPath) || signedFileUrl;
          }

          timelineItems.push({
            id: m.id,
            type: 'media',
            timestamp: new Date(m.taken_at || m.created_at),
            title: m.description || m.file_name,
            thumbnailUrl: resolvedThumbnailUrl,
            fileUrl: signedFileUrl,
            metadata: { ...m, file_url: signedFileUrl }, // Pass signed URL through metadata too
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

      // Fetch project documents with quote/payee for labels
      const { data: documents } = await supabase
        .from('project_documents')
        .select('*, quotes(quote_number, payees(payee_name))')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (documents) {
        documents.forEach((d) => {
          const q = d.quotes as { quote_number?: string; payees?: { payee_name?: string } | null } | null;
          const hasQuote = d.related_quote_id && q;
          const payeeName = q?.payees?.payee_name ?? '—';
          const typeLabel = DOCUMENT_TYPE_LABELS[d.document_type as DocumentType] ?? 'Document';
          const title = projectNumber
            ? (hasQuote ? `${typeLabel} • ${projectNumber} • ${payeeName}` : `${typeLabel} • ${projectNumber}`)
            : `${typeLabel} • ${d.file_name}`;
          // When quote-linked: show 'Contract' for actual contracts, 'Quote Document' for quote attachments
          const subtitle = hasQuote 
            ? (d.document_type === 'contract' ? 'Contract' : 'Quote Document')
            : (d.description || d.file_name);
          timelineItems.push({
            id: d.id,
            type: 'document',
            timestamp: new Date(d.created_at),
            title,
            subtitle,
            fileUrl: d.file_url,
            metadata: d,
          });
        });
      }

      // Sort all items by timestamp descending
      return timelineItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    },
  });

  // Real-time subscriptions for all document types
  useEffect(() => {
    const channels = [
      supabase
        .channel(`timeline-documents-${projectId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_documents', filter: `project_id=eq.${projectId}` }, 
          () => queryClient.invalidateQueries({ queryKey: ['project-documents-timeline', projectId] }))
        .subscribe(),
      
      supabase
        .channel(`timeline-media-${projectId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_media', filter: `project_id=eq.${projectId}` }, 
          () => queryClient.invalidateQueries({ queryKey: ['project-documents-timeline', projectId] }))
        .subscribe(),
      
      supabase
        .channel(`timeline-receipts-${projectId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts', filter: `project_id=eq.${projectId}` }, 
          () => queryClient.invalidateQueries({ queryKey: ['project-documents-timeline', projectId] }))
        .subscribe(),
      
      supabase
        .channel(`timeline-quotes-${projectId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes', filter: `project_id=eq.${projectId}` }, 
          () => queryClient.invalidateQueries({ queryKey: ['project-documents-timeline', projectId] }))
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [projectId, queryClient]);

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
      'quote-pdf': 'Quote',
      'document': 'Document',
    };
    return <Badge variant="secondary" className="text-xs">{labels[type]}</Badge>;
  };

  const handleItemClick = (item: TimelineItem) => {
    // Handle media items specially - detect image vs video from URL
    if (item.type === 'media') {
      const url = item.fileUrl?.toLowerCase() || '';
      if (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm')) {
        preview.openPreview({
          fileUrl: item.fileUrl,
          fileName: item.title,
          mimeType: 'video/mp4',
        });
      } else {
        preview.openPreview({
          fileUrl: item.fileUrl,
          fileName: item.title,
          mimeType: 'image/jpeg',
        });
      }
      return;
    }

    preview.openPreview({
      fileUrl: item.fileUrl,
      fileName: item.title,
      mimeType: item.metadata?.mime_type,
      isReceipt: item.type === 'receipt',
    });
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredItems.length === 0 && items.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9 min-w-0"
          />
          {/* Hide type filter on mobile - header tab dropdown already provides this */}
          <div className="hidden sm:block sm:w-[220px]">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TimelineItem['type'] | 'all')}>
              <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9 min-w-0">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="receipt">Receipts</SelectItem>
                <SelectItem value="quote-pdf">Quotes</SelectItem>
                <SelectItem value="media">Photos & Videos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 py-12 text-center">
          <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No documents found</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 py-12 text-center">
        <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No documents or media found</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          Upload documents to quickly share drawings, permits, licenses, or receipts with the team.
        </p>
      </div>
    );
  }

  const grouped = groupByDate(filteredItems);

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9 min-w-0"
        />
        {/* Hide type filter on mobile - header tab dropdown already provides this */}
        <div className="hidden sm:block sm:w-[220px]">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TimelineItem['type'] | 'all')}>
            <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9 min-w-0">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="receipt">Receipts</SelectItem>
              <SelectItem value="quote-pdf">Quotes</SelectItem>
              <SelectItem value="media">Photos & Videos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-2 md:hidden">
        {Object.entries(grouped).map(([dateGroup, groupItems]) => (
          <div key={dateGroup} className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground px-1">{dateGroup.replace('📅 ', '')}</h3>
            {groupItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <div className="flex-shrink-0">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-10 h-10 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md">
                          {getIcon(item.type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                        </div>
                        {getTypeBadge(item.type)}
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate mb-1 min-w-0">{item.subtitle}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{format(item.timestamp, 'MMM d, h:mm a')}</span>
                        {item.amount !== undefined && (
                          <>
                            <span>•</span>
                            <span className="font-medium">${item.amount.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                        {item.title}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleItemClick(item)}>
                        <FileText className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        const a = document.createElement("a");
                        a.href = item.fileUrl;
                        a.download = item.title;
                        a.click();
                      }}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      {!isMobile && (item.type === 'quote-pdf' || item.type === 'document') && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://docs.google.com/gview?url=${encodeURIComponent(item.fileUrl)}`, '_blank');
                        }}>
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop Timeline */}
      <div className="hidden md:block space-y-3">
        {Object.entries(grouped).map(([dateGroup, groupItems]) => (
          <div key={dateGroup}>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">{dateGroup.replace('📅 ', '')}</h3>
            <div className="space-y-1.5">
              {groupItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  {/* Icon/Thumbnail */}
                  <div className="flex-shrink-0">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                        {getIcon(item.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      {getTypeBadge(item.type)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(item.timestamp, 'h:mm a')}</span>
                      {item.amount !== undefined && (
                        <span className="font-medium">${item.amount.toFixed(2)}</span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                        {item.title}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleItemClick(item)}>
                        <FileText className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        const a = document.createElement("a");
                        a.href = item.fileUrl;
                        a.download = item.title;
                        a.click();
                      }}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      {!isMobile && (item.type === 'quote-pdf' || item.type === 'document') && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://docs.google.com/gview?url=${encodeURIComponent(item.fileUrl)}`, '_blank');
                        }}>
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modals */}
      <DocumentPreviewModals preview={preview} />
    </div>
  );
}
