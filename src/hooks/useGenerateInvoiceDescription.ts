import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GenerateArgs {
  projectId: string;
  estimateId?: string | null;
}

interface GenerateInvoiceDescriptionResult {
  description: string;
  reason:
    | 'ok'
    | 'no_approved_estimate'
    | 'no_line_items'
    | 'missing_auth'
    | 'missing_project_id'
    | 'error';
  estimateId?: string;
}

/**
 * Calls the `generate-invoice-description` edge function. Returns the AI-drafted
 * narrative (≤150 words) or an empty string when no approved current-version
 * estimate exists. Caller controls toast/UI side effects.
 */
export function useGenerateInvoiceDescription() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async ({ projectId, estimateId }: GenerateArgs): Promise<GenerateInvoiceDescriptionResult> => {
      setIsGenerating(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          'generate-invoice-description',
          {
            body: { projectId, estimateId: estimateId ?? null },
          }
        );

        if (fnError) {
          // Edge function may have returned a 4xx/5xx with a body; try to read it.
          const ctx = (fnError as { context?: { json?: () => Promise<{ error?: string }> } })
            .context;
          let serverMessage: string | null = null;
          if (typeof ctx?.json === 'function') {
            try {
              const body = await ctx.json();
              serverMessage = body?.error ?? null;
            } catch {
              // ignore
            }
          }
          throw new Error(serverMessage || fnError.message);
        }

        const result = (data ?? {
          description: '',
          reason: 'error',
        }) as GenerateInvoiceDescriptionResult;
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate description';
        setError(msg);
        return { description: '', reason: 'error' };
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generate, isGenerating, error };
}
