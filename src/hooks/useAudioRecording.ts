import { useState, useRef, useCallback } from 'react';
import { convertToWav, validateAudioBlob, blobToBase64 } from '@/utils/audioConverter';

const MAX_RECORDING_DURATION = 120; // 2 minutes

type RecordingState = 'idle' | 'recording' | 'processing';

// Detect best supported AUDIO-ONLY format (never video)
function getSupportedAudioType(): string {
  // Priority order: Opus codec (best quality), then MP4 for iOS, then WebM, then MPEG
  const audioFormats = [
    'audio/webm;codecs=opus',
    'audio/mp4', // iOS Safari
    'audio/webm',
    'audio/mpeg',
  ];
  
  for (const format of audioFormats) {
    if (MediaRecorder.isTypeSupported(format)) {
      console.log(`[AudioRecording] Using format: ${format}`);
      return format;
    }
  }
  
  // Last resort fallback (should never happen on modern browsers)
  console.warn('[AudioRecording] No preferred audio format supported, using audio/webm');
  return 'audio/webm';
}

// Pre-flight microphone permission check
async function checkMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
  try {
    // Check if in secure context
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      return { 
        granted: false, 
        error: 'Microphone requires HTTPS. Please use secure connection.' 
      };
    }

    // Check browser support
    if (!navigator.mediaDevices?.getUserMedia) {
      return { 
        granted: false, 
        error: 'Microphone not supported in this browser. Try Chrome or Safari.' 
      };
    }

    // Check permission state (if supported)
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permission.state === 'denied') {
          return { 
            granted: false, 
            error: 'Microphone access denied. Enable in browser settings.' 
          };
        }
      } catch (e) {
        // Permission API not supported, continue to getUserMedia
        console.log('[AudioRecording] Permission query not supported, will try getUserMedia');
      }
    }

    return { granted: true };
  } catch (err) {
    return { granted: false, error: 'Failed to check microphone permission' };
  }
}

// Request microphone with timeout to prevent indefinite hanging
async function requestMicrophoneStream(timeoutMs = 8000): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('MIC_TIMEOUT'));
    }, timeoutMs);

    navigator.mediaDevices.getUserMedia({ 
      audio: true,
      video: false
    })
      .then(stream => {
        clearTimeout(timeoutId);
        resolve(stream);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

export function useAudioRecording() {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [audioFormat, setAudioFormat] = useState<string>('audio/wav');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioData(null);
      setDuration(0);

      // Comprehensive environment diagnostics
      console.log('[AudioRecording] Environment check:', {
        isSecureContext: window.isSecureContext,
        hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
        hasMediaRecorder: !!window.MediaRecorder,
        userAgent: navigator.userAgent,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isInIframe: window.self !== window.top,
        platform: navigator.platform,
      });

      console.log('[AudioRecording] Starting recording flow...');

      // Pre-flight permission check
      const permissionCheck = await checkMicrophonePermission();
      if (!permissionCheck.granted) {
        throw new Error(permissionCheck.error || 'Microphone access denied');
      }

      console.log('[AudioRecording] Requesting microphone access...');
      
      // Use timeout wrapper to prevent indefinite hangs
      const stream = await requestMicrophoneStream(8000);
      
      console.log('[AudioRecording] Microphone access granted', {
        audioTracks: stream.getAudioTracks().length,
      });
      
      // Use best supported audio format
      const mimeType = getSupportedAudioType();
      
      // Double-check we're not accidentally using video format
      if (mimeType.startsWith('video/')) {
        throw new Error('Video format detected - audio-only recording required');
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setState('processing');
        try {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          console.log('[AudioRecording] Processing audio blob', {
            size: audioBlob.size,
            type: audioBlob.type,
          });
          
          // Validate audio
          const isValid = await validateAudioBlob(audioBlob);
          if (!isValid) {
            throw new Error('Invalid audio recording. Please try again.');
          }
          
          // Convert to WAV for universal API support
          const wavBlob = await convertToWav(audioBlob);
          
          // Convert to base64
          const base64 = await blobToBase64(wavBlob);
          
          setAudioData(base64);
          setAudioFormat('audio/wav');
          setState('idle');
        } catch (err) {
          console.error('Audio processing failed:', err);
          setError(err instanceof Error ? err.message : 'Failed to process audio');
          setState('idle');
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      console.log('[AudioRecording] Recording started', { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      setState('recording');

      // Start duration timer with max duration check
      timerRef.current = window.setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          
          // Auto-stop at max duration
          if (newDuration >= MAX_RECORDING_DURATION) {
            console.log('[AudioRecording] Max duration reached, auto-stopping');
            stopRecording();
            setError('Recording stopped: 2 minute maximum reached');
          }
          
          return newDuration;
        });
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      
      // Detailed error diagnostics
      console.error('[AudioRecording] getUserMedia failed:', {
        error: err,
        errorName: err instanceof Error ? err.name : 'unknown',
        errorMessage: err instanceof Error ? err.message : 'unknown',
        isInIframe: window.self !== window.top,
        timestamp: new Date().toISOString(),
      });
      
      // Provide specific error messages based on failure mode
      if (err instanceof Error && err.message === 'MIC_TIMEOUT') {
        // Check if running in iframe (editor preview)
        if (window.self !== window.top) {
          setError('Microphone blocked in embedded preview. Open in a new tab or install the app to use voice captions.');
        } else {
          setError('Microphone permission prompt did not appear. Enable microphone in browser/site settings, then retry.');
        }
      } else if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setError('Failed to access microphone. Please check permissions.');
      }
      
      setState('idle');
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Only check ref, not React state (avoids stale closure)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[AudioRecording] Stopping recording...');
      mediaRecorderRef.current.stop();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setDuration(0);
    setAudioData(null);
    setAudioFormat('audio/wav');
    setError(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    state,
    duration,
    audioData,
    audioFormat,
    error,
    startRecording,
    stopRecording,
    reset,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
  };
}
