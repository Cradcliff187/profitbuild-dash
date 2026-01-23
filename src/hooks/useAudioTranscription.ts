import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAudioTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(async (audioBase64: string, format: string = 'audio/wav') => {
    try {
      setIsTranscribing(true);
      setError(null);

      // Pre-flight validation
      console.log('[Transcription] Starting validation...', { 
        base64Length: audioBase64?.length,
        format 
      });

      if (!audioBase64 || audioBase64.length < 100) {
        console.error('[Transcription] Audio data too short:', audioBase64?.length);
        throw new Error('Audio data is too short or invalid');
      }

      // Check size (base64 to bytes: length * 0.75)
      const sizeKB = (audioBase64.length * 0.75) / 1024;
      console.log('[Transcription] Audio size:', { sizeKB: sizeKB.toFixed(2), format });
      
      if (sizeKB < 1) {
        console.error('[Transcription] Audio too short:', sizeKB);
        throw new Error('Recording too short. Please speak for at least 1 second.');
      }
      
      if (sizeKB > 25000) {
        console.error('[Transcription] Audio too large:', sizeKB);
        throw new Error('Recording too long. Maximum 2 minutes allowed.');
      }

      console.log('[Transcription] Invoking edge function transcribe-audio...', { 
        format, 
        approxSizeKB: Math.round(sizeKB) 
      });

      const { data, error: functionError } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: audioBase64,
          format: format 
        },
      });

      if (functionError) {
        console.error('[Transcription] Edge function error:', {
          message: functionError.message,
          details: functionError
        });
        throw functionError;
      }

      if (!data) {
        console.error('[Transcription] No response from transcription service');
        throw new Error('No response from transcription service. Please check your connection.');
      }

      console.log('[Transcription] Response received:', { 
        hasText: !!data.text, 
        textLength: data.text?.length,
        hasError: !!data.error 
      });

      if (data?.error) {
        console.error('[Transcription] Service returned error:', data.error);
        throw new Error(data.error);
      }

      if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
        console.error('[Transcription] Empty or invalid transcription:', data);
        throw new Error('No speech detected in recording. Please try again.');
      }

      console.log('[Transcription] Success! Text preview:', data.text.substring(0, 50) + '...');
      setTranscription(data.text);
      return data.text;

    } catch (err) {
      console.error('[Transcription] Failed with error:', err);
      let errorMessage = 'Transcription failed';
      
      if (err instanceof Error) {
        console.error('[Transcription] Error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        });

        if (err.message.includes('Rate limit') || err.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait 30 seconds and try again.';
        } else if (err.message.includes('credits exhausted') || err.message.includes('402')) {
          errorMessage = 'AI credits exhausted. Please contact your administrator.';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Connection issue. Please check your internet and try again.';
        } else if (err.message.includes('No speech detected')) {
          errorMessage = 'No speech detected. Please speak clearly and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      console.error('[Transcription] Setting error message:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTranscription(null);
    setError(null);
    setIsTranscribing(false);
  }, []);

  return {
    transcribe,
    isTranscribing,
    transcription,
    error,
    reset,
  };
}
