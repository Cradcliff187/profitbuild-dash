import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Mic, MessageSquare, X } from 'lucide-react';

interface CaptionPromptOptions {
  onVoiceClick: () => void;
  onTypeClick: () => void;
  message?: string;
  duration?: number;
}

export function showCaptionPrompt({
  onVoiceClick,
  onTypeClick,
  message = 'Add a caption for better documentation',
  duration = 5000,
}: CaptionPromptOptions) {
  toast(message, {
    duration,
    dismissible: true,
    closeButton: false,
    action: (
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            onVoiceClick();
            toast.dismiss();
          }}
          className="h-7 px-2.5"
        >
          <Mic className="h-3 w-3 mr-1" />
          Voice
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onTypeClick();
            toast.dismiss();
          }}
          className="h-7 px-2.5"
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Type
        </Button>
      </div>
    ),
    cancel: {
      label: <X className="h-3 w-3" />,
      onClick: () => {},
    },
  });
}

// Context-aware messages
export const CAPTION_PROMPTS = {
  firstCapture: '📸 Quick tip: Voice captions save time during reviews',
  afterSkip: 'Caption now or add details later in gallery',
  gpsAvailable: 'Location captured - add context with voice note?',
  multipleSkips: 'Captions improve project documentation accuracy',
  reviewAiCaption: 'Review AI caption for accuracy',
} as const;
