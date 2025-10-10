import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { AICaptionEnhancer } from '@/components/AICaptionEnhancer';
import { toast } from 'sonner';
import type { ProjectMedia } from '@/types/project';

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

  useEffect(() => {
    if (open) {
      setCaption(photo.caption || '');
      setShowAIEnhancer(false);
    }
  }, [open, photo.caption]);

  const handleSave = () => {
    if (!caption.trim()) {
      toast.error('Please add a caption');
      return;
    }
    onSave(caption.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Type Caption</DialogTitle>
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
                  Caption
                </label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Type your caption here..."
                  className="min-h-[120px] text-sm resize-none"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
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
                Save Caption
              </Button>
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
