import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { FileText, Image, Video, Receipt, FileCheck, Loader2, Eye, Download, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { ReceiptPreviewModal } from '@/components/ReceiptPreviewModal';
import { OfficeDocumentPreviewModal } from '@/components/OfficeDocumentPreviewModal';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TimelineItem['type'] | 'all'>('all');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfOpen, setPreviewPdfOpen] = useState(false);
  const [previewPdfFileName, setPreviewPdfFileName] = useState<string>('');
  const [previewReceiptOpen, setPreviewReceiptOpen] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [previewImageOpen, setPreviewImageOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewVideoOpen, setPreviewVideoOpen] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewOfficeOpen, setPreviewOfficeOpen] = useState(false);
  const [previewOfficeUrl, setPreviewOfficeUrl] = useState<string | null>(null);
  const [previewOfficeFileName, setPreviewOfficeFileName] = useState<string>('');
  const [previewOfficeFileType, setPreviewOfficeFileType] = useState<'word' | 'excel' | 'powerpoint' | undefined>(undefined);

  // Swipe handlers for image lightbox
  const { 
    handleTouchStart: imageSwipeStart, 
    handleTouchMove: imageSwipeMove, 
    handleTouchEnd: imageSwipeEnd 
  } = useSwipeGesture({
    onSwipeLeft: () => setPreviewImageOpen(false),
    onSwipeRight: () => setPreviewImageOpen(false),
    minSwipeDistance: 50
  });

  // Swipe handlers for video lightbox
  const { 
    handleTouchStart: videoSwipeStart, 
    handleTouchMove: videoSwipeMove, 
    handleTouchEnd: videoSwipeEnd 
  } = useSwipeGesture({
    onSwipeLeft: () => setPreviewVideoOpen(false),
    onSwipeRight: () => setPreviewVideoOpen(false),
    minSwipeDistance: 50
  });

  // Attach touch listeners to image lightbox
  useEffect(() => {
    if (!previewImageOpen) return;
    
    const container = document.getElementById('image-lightbox-container');
    if (!container) return;

    container.addEventListener('touchstart', imageSwipeStart);
    container.addEventListener('touchmove', imageSwipeMove);
    container.addEventListener('touchend', imageSwipeEnd);

    return () => {
      container.removeEventListener('touchstart', imageSwipeStart);
      container.removeEventListener('touchmove', imageSwipeMove);
      container.removeEventListener('touchend', imageSwipeEnd);
    };
  }, [previewImageOpen, imageSwipeStart, imageSwipeMove, imageSwipeEnd]);

  // Attach touch listeners to video lightbox
  useEffect(() => {
    if (!previewVideoOpen) return;
    
    const container = document.getElementById('video-lightbox-container');
    if (!container) return;

    container.addEventListener('touchstart', videoSwipeStart);
    container.addEventListener('touchmove', videoSwipeMove);
    container.addEventListener('touchend', videoSwipeEnd);

    return () => {
      container.removeEventListener('touchstart', videoSwipeStart);
      container.removeEventListener('touchmove', videoSwipeMove);
      container.removeEventListener('touchend', videoSwipeEnd);
    };
  }, [previewVideoOpen, videoSwipeStart, videoSwipeMove, videoSwipeEnd]);
  
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
      'quote-pdf': 'Quote PDF',
      'document': 'Document',
    };
    return <Badge variant="secondary" className="text-xs">{labels[type]}</Badge>;
  };

  const getFileType = (item: TimelineItem): 'pdf' | 'receipt' | 'image' | 'video' | 'office' | 'other' => {
    if (item.type === 'receipt') return 'receipt';
    if (item.type === 'media') {
      const url = item.fileUrl?.toLowerCase() || '';
      if (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm')) return 'video';
      return 'image';
    }
    
    // Check MIME type from metadata first (most reliable)
    const mimeType = item.metadata?.mime_type?.toLowerCase() || '';
    const fileName = item.fileUrl?.toLowerCase() || item.title?.toLowerCase() || '';
    
    // PDF detection
    if (mimeType.includes('pdf') || fileName.includes('.pdf')) {
      return 'pdf';
    }
    
    // Office document detection via MIME type
    if (
      mimeType.includes('wordprocessingml') || // .docx
      mimeType.includes('msword') || // .doc
      mimeType.includes('spreadsheetml') || // .xlsx
      mimeType.includes('ms-excel') || // .xls
      mimeType.includes('presentationml') || // .pptx
      mimeType.includes('ms-powerpoint') || // .ppt
      mimeType.includes('vnd.openxmlformats-officedocument')
    ) {
      return 'office';
    }
    
    // Office document detection via file extension (fallback)
    if (
      fileName.includes('.doc') ||
      fileName.includes('.xls') ||
      fileName.includes('.ppt')
    ) {
      return 'office';
    }
    
    return 'other';
  };
  
  const getOfficeFileType = (item: TimelineItem): 'word' | 'excel' | 'powerpoint' | undefined => {
    const mimeType = item.metadata?.mime_type?.toLowerCase() || '';
    const fileName = item.fileUrl?.toLowerCase() || item.title?.toLowerCase() || '';
    
    // Word detection
    if (
      mimeType.includes('wordprocessingml') ||
      mimeType.includes('msword') ||
      fileName.includes('.doc')
    ) {
      return 'word';
    }
    
    // Excel detection
    if (
      mimeType.includes('spreadsheetml') ||
      mimeType.includes('ms-excel') ||
      fileName.includes('.xls')
    ) {
      return 'excel';
    }
    
    // PowerPoint detection
    if (
      mimeType.includes('presentationml') ||
      mimeType.includes('ms-powerpoint') ||
      fileName.includes('.ppt')
    ) {
      return 'powerpoint';
    }
    
    return undefined;
  };

  const handleItemClick = async (item: TimelineItem) => {
    const fileType = getFileType(item);
    
    if (fileType === 'pdf') {
      setPreviewPdfUrl(item.fileUrl);
      setPreviewPdfFileName(item.title);
      setPreviewPdfOpen(true);
    } else if (fileType === 'receipt') {
      setPreviewReceiptUrl(item.fileUrl);
      setPreviewReceiptOpen(true);
    } else if (fileType === 'image') {
      setPreviewImageUrl(item.fileUrl);
      setPreviewImageOpen(true);
    } else if (fileType === 'video') {
      setPreviewVideoUrl(item.fileUrl);
      setPreviewVideoOpen(true);
    } else if (fileType === 'office') {
      setPreviewOfficeUrl(item.fileUrl);
      setPreviewOfficeFileName(item.title);
      setPreviewOfficeFileType(getOfficeFileType(item));
      setPreviewOfficeOpen(true);
    } else {
      window.open(item.fileUrl, '_blank');
    }
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
                <SelectItem value="quote-pdf">Quote PDFs</SelectItem>
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
              <SelectItem value="quote-pdf">Quote PDFs</SelectItem>
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
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="flex w-full items-start gap-2 text-left"
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
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-semibold text-foreground break-words">{item.title}</p>
                      {getTypeBadge(item.type)}
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground break-words mb-1">{item.subtitle}</p>
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
                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleItemClick(item)}
                    className="min-h-[44px] min-w-[44px] rounded-full"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const a = document.createElement("a");
                      a.href = item.fileUrl;
                      a.download = item.title;
                      a.click();
                    }}
                    className="h-9 w-9 rounded-full"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                    className="h-7 w-7 p-0 shrink-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modals */}
      <PdfPreviewModal
        open={previewPdfOpen}
        onOpenChange={setPreviewPdfOpen}
        pdfUrl={previewPdfUrl}
        fileName={previewPdfFileName}
      />

      <ReceiptPreviewModal
        open={previewReceiptOpen}
        onOpenChange={setPreviewReceiptOpen}
        receiptUrl={previewReceiptUrl}
      />

      <OfficeDocumentPreviewModal
        open={previewOfficeOpen}
        onOpenChange={setPreviewOfficeOpen}
        fileUrl={previewOfficeUrl || ''}
        fileName={previewOfficeFileName}
        fileType={previewOfficeFileType}
      />

      {/* Image Lightbox */}
      {previewImageOpen && previewImageUrl && (
        <div 
          id="image-lightbox-container"
          className="fixed inset-0 bg-background z-50 flex items-center justify-center"
          onClick={() => setPreviewImageOpen(false)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-10 w-10 z-10 min-h-[44px] min-w-[44px]"
            onClick={() => setPreviewImageOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={previewImageUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain touch-manipulation"
            style={{ 
              touchAction: 'pan-x pan-y pinch-zoom',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}

      {/* Video Lightbox */}
      {previewVideoOpen && previewVideoUrl && (
        <div 
          id="video-lightbox-container"
          className="fixed inset-0 bg-background z-50 flex items-center justify-center"
          onClick={() => setPreviewVideoOpen(false)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-10 w-10 z-10 min-h-[44px] min-w-[44px]"
            onClick={() => setPreviewVideoOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <video
            src={previewVideoUrl}
            className="max-h-[90vh] max-w-[90vw]"
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
