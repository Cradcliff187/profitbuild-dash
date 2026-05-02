import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { StickyNote, Camera, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useBidMediaUpload } from '@/hooks/useBidMediaUpload';
import { BidNoteComposer } from './BidNoteComposer';

interface BidQuickActionBarProps {
  bidId: string;
  onNavigateToTab?: (tab: 'notes' | 'media' | 'documents') => void;
  onUploaded?: () => void;
}

// Mobile quick-action bar for Lead detail pages. Sibling of FieldQuickActionBar
// so users don't relearn the affordance per area.
//   Note    → switches to Notes tab (parent owns tab state)
//   Camera  → navigates to /leads/:id/capture (GPS-aware full capture flow)
//   Attach  → hidden file input; useBidMediaUpload auto-routes by MIME into
//             bid_media with file_type image|video|document
export function BidQuickActionBar({ bidId, onNavigateToTab, onUploaded }: BidQuickActionBarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { upload, isUploading } = useBidMediaUpload();
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);

  const handleAttachFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    // Sequential upload — parallel would race the useBidMediaUpload hook's
    // single-slot progress/state. The hook used to fire its own per-file
    // toast; that produced one toast per file plus one aggregate toast here,
    // so the hook is now silent and we own the user-facing notifications.
    if (files.length > 1) {
      toast.info(`Uploading ${files.length} files...`);
    }
    const results = [];
    let failures = 0;
    for (const file of files) {
      const result = await upload({
        bid_id: bidId,
        file,
        upload_source: 'web',
      });
      if (result) results.push(result);
      else failures++;
    }

    if (results.length) {
      queryClient.invalidateQueries({ queryKey: ['bid-media', bidId] });
      onUploaded?.();
      const allDocs = results.every((r) => r.file_type === 'document');
      const target = allDocs ? 'Documents' : 'Media';
      toast.success(
        files.length > 1
          ? `Uploaded ${results.length} to ${target}`
          : `Added to ${target}`
      );
      // Land on the tab that matches the upload batch. Mixed batches prefer
      // Media (images/video outnumber docs in most mobile-capture sessions).
      onNavigateToTab?.(allDocs ? 'documents' : 'media');
    }
    if (failures) {
      toast.error(`${failures} file${failures > 1 ? 's' : ''} failed to upload`);
    }
  };

  return (
    <>
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t shadow-lg pb-safe">
      <div className="flex items-center justify-center gap-3 px-4 py-2.5">
        <Button
          variant="outline"
          onClick={() => setNoteSheetOpen(true)}
          className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
        >
          <StickyNote className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Note</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate(`/leads/${bidId}/capture`)}
          disabled={isUploading}
          className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
        >
          <Camera className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Camera</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => attachInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1 h-14 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10 gap-2"
        >
          <Paperclip className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Attach</span>
        </Button>

        <input
          ref={attachInputRef}
          type="file"
          className="hidden"
          onChange={handleAttachFile}
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
      </div>
    </div>

    <BidNoteComposer
      bidId={bidId}
      presentation="sheet"
      open={noteSheetOpen}
      onOpenChange={setNoteSheetOpen}
      onSubmitted={() => {
        onNavigateToTab?.('notes');
      }}
      placeholder="What's happening with this lead..."
    />
    </>
  );
}
