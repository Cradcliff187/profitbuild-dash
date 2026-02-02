import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { showCaptionPrompt, CAPTION_PROMPTS } from '@/components/CaptionPromptToast';
import { getCaptionPreferences } from '@/utils/userPreferences';

interface CaptionFlowState {
  pendingCaption: string;
  setPendingCaption: (caption: string) => void;
  showCaptionModal: boolean;
  setShowCaptionModal: (show: boolean) => void;
  showVoiceCaptionModal: boolean;
  setShowVoiceCaptionModal: (show: boolean) => void;
  skipCount: number;
  captureCount: number;
  /** Call after successful capture to trigger caption prompt logic */
  onCaptureSuccess: (hasGps: boolean) => void;
  /** Call when user saves a caption (resets skip count) */
  onCaptionSaved: (caption: string) => void;
  /** Call when user skips caption (increments skip counter) */
  onCaptionSkipped: () => void;
  /** Call when voice caption is ready */
  onVoiceCaptionReady: (caption: string) => void;
}

/**
 * Shared hook for the caption prompt flow.
 * Handles progressive prompting, skip tracking, voice/type modal coordination.
 */
export function useCaptionFlow(): CaptionFlowState {
  const [pendingCaption, setPendingCaption] = useState('');
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [showVoiceCaptionModal, setShowVoiceCaptionModal] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);

  const onCaptureSuccess = useCallback(
    (hasGps: boolean) => {
      const newCaptureCount = captureCount + 1;
      setCaptureCount(newCaptureCount);

      // Show caption prompt for first 3 captures when user has prompts enabled
      const shouldPrompt = newCaptureCount <= 3 && hasGps;
      if (shouldPrompt) {
        setTimeout(() => {
          void (async () => {
            const prefs = await getCaptionPreferences();
            if (!prefs.showCaptionPrompts) return;

            const message =
              newCaptureCount === 1
                ? CAPTION_PROMPTS.firstCapture
                : CAPTION_PROMPTS.gpsAvailable;

            showCaptionPrompt({
              onVoiceClick: () => setShowVoiceCaptionModal(true),
              onTypeClick: () => setShowCaptionModal(true),
              message,
              duration: 5000,
            });
          })();
        }, 3000);
      }
    },
    [captureCount]
  );

  const onCaptionSkipped = useCallback(() => {
    const newSkipCount = skipCount + 1;
    setSkipCount(newSkipCount);

    if (newSkipCount >= 3 && newSkipCount % 3 === 0) {
      toast.info(CAPTION_PROMPTS.multipleSkips, { duration: 4000 });
    }
  }, [skipCount]);

  const onCaptionSaved = useCallback((caption: string) => {
    setPendingCaption(caption);
    setShowCaptionModal(false);
    setSkipCount(0);
    const wordCount = caption.split(/\s+/).filter((w) => w.length > 0).length;
    toast.success(`Caption saved (${wordCount} word${wordCount !== 1 ? 's' : ''})`);
  }, []);

  const onVoiceCaptionReady = useCallback((caption: string) => {
    setPendingCaption(caption);
    setShowVoiceCaptionModal(false);
    setSkipCount(0);
    const wordCount = caption.split(/\s+/).filter((w) => w.length > 0).length;
    toast.success(
      `Voice caption added (${wordCount} word${wordCount !== 1 ? 's' : ''})`
    );
  }, []);

  return {
    pendingCaption,
    setPendingCaption,
    showCaptionModal,
    setShowCaptionModal,
    showVoiceCaptionModal,
    setShowVoiceCaptionModal,
    skipCount,
    captureCount,
    onCaptureSuccess,
    onCaptionSaved,
    onCaptionSkipped,
    onVoiceCaptionReady,
  };
}
