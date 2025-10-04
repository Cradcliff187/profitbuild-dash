import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAudioTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transcribe = async (audioBase64: string) => {
    try {
      setIsTranscribing(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: audioBase64 },
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setTranscription(data.text);
      return data.text;

    } catch (err) {
      console.error('Transcription failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Transcription failed';
      setError(errorMessage);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const reset = () => {
    setTranscription(null);
    setError(null);
    setIsTranscribing(false);
  };

  return {
    transcribe,
    isTranscribing,
    transcription,
    error,
    reset,
  };
}
