import { useState, useRef, useCallback } from 'react';

const MAX_RECORDING_DURATION = 120; // 2 minutes

type RecordingState = 'idle' | 'recording' | 'processing';

export function useAudioRecording() {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioData(null);
      setDuration(0);

      // Check if running in secure context (HTTPS or localhost)
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error('Microphone access requires a secure connection (HTTPS)');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setState('processing');
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setAudioData(base64);
          setState('idle');
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setState('recording');

      // Start duration timer with max duration check
      timerRef.current = window.setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          
          // Auto-stop at max duration
          if (newDuration >= MAX_RECORDING_DURATION) {
            stopRecording();
            setError('Recording stopped: 2 minute maximum reached');
          }
          
          return newDuration;
        });
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setState('idle');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state]);

  const reset = useCallback(() => {
    setState('idle');
    setDuration(0);
    setAudioData(null);
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
    error,
    startRecording,
    stopRecording,
    reset,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
  };
}
