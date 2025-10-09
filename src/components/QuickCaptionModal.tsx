import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

  // Early return if photo is null/undefined
  if (!photo) {
    return null;
  }

  useEffect(() => {
    if (open) {
      setCaption(photo.caption || '');
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
            onClick={handleSave}
            disabled={!caption.trim()}
            className="h-8"
          >
            Save Caption
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
