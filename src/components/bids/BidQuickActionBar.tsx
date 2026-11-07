import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus, Camera, Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useBidMediaUpload } from '@/hooks/useBidMediaUpload';
import { createUploadProgressToast } from '@/utils/uploadProgressToast';
import { leadTimelineKey } from '@/hooks/useLeadTimeline';
import { TouchComposer } from './TouchComposer';

interface BidQuickActionBarProps {
  bidId: string;
  currentNextStep?: { text: string | null; due: string | null };
  /** Called after an upload lands so the hub can open the matching drill-down. */
  onUploaded?: (kind: 'media' | 'documents') => void;
}

// Mobile bottom bar for the lead hub. Same three-slot shape as the project
// hub's FieldQuickActionBar so nobody relearns the affordance per area —
// but the slots are a salesperson's, not a crew's:
//   Log touch → TouchComposer sheet (kind · words · attachments · next step)
//   Camera    → /leads/:id/capture (GPS-aware capture page; Rule 22 divergence)
//   Attach    → capture-and-forget upload, routed by MIME into bid_media; it
//               shows on the timeline as a file entry (read-side union)
export function BidQuickActionBar({ bidId, currentNextStep, onUploaded }: BidQuickActionBarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { upload, isUploading } = useBidMediaUpload();
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const handleAttachFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    // Sequential — parallel would race the hook's single-slot progress state.
    const progress = createUploadProgressToast(files.length);
    const results = [];
    let failures = 0;
    for (const [index, file] of files.entries()) {
      progress.progress(index + 1);
      const result = await upload({ bid_id: bidId, file, upload_source: 'web' });
      if (result) results.push(result);
      else failures++;
    }

    if (results.length) {
      queryClient.invalidateQueries({ queryKey: ['bid-media', bidId] });
      queryClient.invalidateQueries({ queryKey: leadTimelineKey(bidId) });
      const allDocs = results.every((r) => r.file_type === 'document');
      progress.success(files.length > 1 ? `Uploaded ${results.length}` : 'Uploaded');
      if (failures) toast.error(`${failures} file${failures > 1 ? 's' : ''} failed to upload`);
      onUploaded?.(allDocs ? 'documents' : 'media');
    } else {
      progress.error(`${failures} file${failures > 1 ? 's' : ''} failed to upload`);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 pb-safe shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3 px-4 py-2.5">
          <Button
            variant="outline"
            onClick={() => setComposerOpen(true)}
            className="h-14 flex-1 gap-2 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10"
          >
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Log touch</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(`/leads/${bidId}/capture`)}
            disabled={isUploading}
            className="h-14 flex-1 gap-2 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10"
          >
            <Camera className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Camera</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => attachInputRef.current?.click()}
            disabled={isUploading}
            className="h-14 flex-1 gap-2 rounded-xl border-primary/20 hover:bg-primary/5 active:bg-primary/10"
          >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Paperclip className="h-5 w-5 text-primary" />}
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

      <TouchComposer
        bidId={bidId}
        presentation="sheet"
        open={composerOpen}
        onOpenChange={setComposerOpen}
        currentNextStep={currentNextStep}
        autoFocus
      />
    </>
  );
}
