import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EnhancementMode = 'technical' | 'client-friendly' | 'next-steps';

export interface EnhancementOptions {
  mode: EnhancementMode;
  includeImageAnalysis: boolean;
}

export interface EnhancementResult {
  enhancedCaption: string;
  originalCaption: string;
  mode: EnhancementMode;
  processingTime?: number;
}

export function useAICaptionEnhancement() {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhance = async (
    imageUrl: string,
    originalCaption: string,
    options: EnhancementOptions
  ): Promise<EnhancementResult | null> => {
    setIsEnhancing(true);
    setError(null);
    const startTime = Date.now();

    try {
      const { data, error: functionError } = await supabase.functions.invoke('enhance-caption', {
        body: {
          imageUrl,
          originalCaption,
          mode: options.mode,
          includeImageAnalysis: options.includeImageAnalysis
        }
      });

      if (functionError) {
        // Handle specific error types
        if (functionError.message?.includes('429')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (functionError.message?.includes('402')) {
          throw new Error('AI credits exhausted. Please add credits to continue.');
        }
        throw new Error(functionError.message || 'Failed to enhance caption');
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        enhancedCaption: data.enhancedCaption,
        originalCaption,
        mode: options.mode,
        processingTime
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to enhance caption';
      setError(errorMsg);
      console.error('Caption enhancement error:', err);
      return null;
    } finally {
      setIsEnhancing(false);
    }
  };

  const reset = () => {
    setError(null);
  };

  return { enhance, isEnhancing, error, reset };
}
