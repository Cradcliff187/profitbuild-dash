import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { AICaptionEnhancer } from '@/components/AICaptionEnhancer';
import { toast } from 'sonner';
import type { ProjectMedia } from '@/types/project';
import { dismissCaptionPrompts } from '@/utils/userPreferences';

interface QuickCaptionModalProps {
  photo: ProjectMedia;
  open: boolean;
  onClose: () => void;
  onSave: (caption: string) => void;
}

export function QuickCaptionModal({ photo, open, onClose, onSave }: QuickCaptionModalProps) {
  const [caption, setCaption] = useState('');
  const [showAIEnhancer, setShowAIEnhancer] = useState(false);

  // Early return if photo is null/undefined
  if (!photo) {
    return null;
  }

  // Sync caption from photo only when modal opens, so transcription updates
  // don't overwrite in-progress edits (e.g. FieldVideoCapture).
  useEffect(() => {
    if (open) {
      setCaption(photo.caption || '');
      setShowAIEnhancer(false);
    }
  }, [open]);

  const handleSave = () => {
    if (!caption.trim()) {
      toast.error('Please add a note for this photo');
      return;
    }
    onSave(caption.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Add Photo Note</DialogTitle>
        </DialogHeader>

        {!showAIEnhancer ? (
          <>
            <div className="space-y-3">
              {/* Photo Preview */}
              <div className="relative w-full h-32 bg-muted rounded overflow-hidden">
                <img
                  src={photo.file_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Caption Editor */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Note
                </label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe what's in this photo..."
                  className="min-h-[120px] text-sm resize-none"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onClose} className="h-8">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAIEnhancer(true)}
                  disabled={!caption.trim()}
                  className="h-8"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Enhance with AI
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!caption.trim()}
                  className="h-8"
                >
                  Save Note
                </Button>
              </div>
              <button
                onClick={async () => {
                  await dismissCaptionPrompts();
                  toast.info('Caption prompts disabled', {
                    description: 'Re-enable in Settings if needed'
                  });
                  onClose();
                }}
                className="text-xs text-muted-foreground hover:underline mt-1"
              >
                Don't show caption prompts again
              </button>
            </DialogFooter>
          </>
        ) : (
          <AICaptionEnhancer
            imageUrl={photo.file_url}
            originalCaption={caption}
            onAccept={(enhanced) => {
              setCaption(enhanced);
              setShowAIEnhancer(false);
            }}
            onCancel={() => setShowAIEnhancer(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
