import { useState, useEffect } from 'react';
import { Mic, StopCircle, Loader2, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
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
  const [manualMode, setManualMode] = useState(false);
  const recording = useAudioRecording();
  const transcription = useAudioTranscription();

  useEffect(() => {
    if (open) {
      setCaption(photo.caption || '');
      setManualMode(false);
      recording.reset();
      transcription.reset();
    }
  }, [open, photo.caption]);

  useEffect(() => {
    if (recording.audioData && !transcription.isTranscribing && !transcription.transcription) {
      handleTranscribe();
    }
  }, [recording.audioData]);

  useEffect(() => {
    if (transcription.transcription) {
      setCaption(transcription.transcription);
    }
  }, [transcription.transcription]);

  const handleTranscribe = async () => {
    if (!recording.audioData) return;
    
    const result = await transcription.transcribe(recording.audioData);
    if (!result) {
      toast.error('Transcription failed. Try typing manually.');
      setManualMode(true);
    }
  };

  const handleSave = () => {
    if (!caption.trim()) {
      toast.error('Please add a caption');
      return;
    }
    onSave(caption.trim());
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Add Caption</DialogTitle>
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

          {/* Recording Controls */}
          {!manualMode && (
            <div className="flex flex-col items-center gap-2 p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-3">
                {!recording.isRecording ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={recording.startRecording}
                    disabled={recording.isProcessing || transcription.isTranscribing}
                    className="h-10"
                  >
                    <Mic className="h-4 w-4 mr-1.5" />
                    Record Caption
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={recording.stopRecording}
                    className="h-10"
                  >
                    <StopCircle className="h-4 w-4 mr-1.5" />
                    Stop ({formatDuration(recording.duration)})
                  </Button>
                )}
              </div>

              {recording.isProcessing && (
                <p className="text-xs text-muted-foreground">Processing audio...</p>
              )}

              {transcription.isTranscribing && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Transcribing...</span>
                </div>
              )}

              {recording.error && (
                <p className="text-xs text-destructive">{recording.error}</p>
              )}

              {transcription.error && (
                <p className="text-xs text-destructive">{transcription.error}</p>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setManualMode(true)}
                className="h-8 text-xs"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Type Manually
              </Button>
            </div>
          )}

          {/* Caption Editor */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Caption
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption will appear here..."
              className="min-h-[80px] text-sm resize-none"
              disabled={recording.isRecording || recording.isProcessing || transcription.isTranscribing}
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
            disabled={!caption.trim() || recording.isRecording || recording.isProcessing || transcription.isTranscribing}
            className="h-8"
          >
            Save Caption
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
