import { useState, useCallback } from 'react';

interface CaptionFlowState {
  pendingCaption: string;
  setPendingCaption: (caption: string) => void;
  showCaptionModal: boolean;
  setShowCaptionModal: (show: boolean) => void;
  showVoiceCaptionModal: boolean;
  setShowVoiceCaptionModal: (show: boolean) => void;
  skipCount: number;
  captureCount: number;
  /** Call after successful capture — increments captureCount. Kept as a
   *  no-arg callable so existing call sites (which pass a hasGps boolean)
   *  remain compatible at the JS layer. */
  onCaptureSuccess: (hasGps?: boolean) => void;
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

  // The auto-prompt sheet was removed (Apr 2026) — it fired 3s after capture
  // and blocked the next action for 5s while showing voice/type buttons that
  // already exist on the preview screen. We keep capture-count tracking in
  // case future analytics need it, but no UI side-effects.
  const onCaptureSuccess = useCallback(() => {
    setCaptureCount((c) => c + 1);
  }, []);

  const onCaptionSkipped = useCallback(() => {
    setSkipCount((c) => c + 1);
  }, []);

  const onCaptionSaved = useCallback((caption: string) => {
    setPendingCaption(caption);
    setShowCaptionModal(false);
    setSkipCount(0);
  }, []);

  const onVoiceCaptionReady = useCallback((caption: string) => {
    setPendingCaption(caption);
    setShowVoiceCaptionModal(false);
    setSkipCount(0);
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
