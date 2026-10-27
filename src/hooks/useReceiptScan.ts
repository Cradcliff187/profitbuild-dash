/**
 * useReceiptScan — client half of the receipt pre-fill (docs/RECEIPT_SCAN_PLAN.md).
 *
 * Calls the `scan-receipt` edge function with a phone-resized JPEG and returns
 * the extraction + vendor match. The scan is a PRE-FILL, never a gate: every
 * failure path resolves to `null` and the caller's form stays exactly as it is.
 *
 * House rules honoured here:
 * - Flag-gated via `useDbFeatureFlag('receipt_scan')` (per-user overrides aware).
 *   Flag off ⇒ `scan()` is a no-op that resolves null — byte-identical behaviour
 *   to the pre-feature modal.
 * - No realtime, no `auth.getUser()` (Gotchas #53 / #63). Plain `functions.invoke`.
 * - The browser does the resize (Gotcha #75: the isolate never touches bytes).
 * - A request id guards against a retake racing an in-flight result.
 */
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/utils/imageCompression';
import { useDbFeatureFlag } from '@/hooks/useDbFeatureFlag';

export const RECEIPT_SCAN_FLAG = 'receipt_scan';
const CLIENT_TIMEOUT_MS = 15_000;
const SCAN_MAX_WIDTH = 1600;
const SCAN_JPEG_QUALITY = 0.8;

export type ReceiptScanStatus = 'idle' | 'scanning' | 'done' | 'failed' | 'timeout' | 'skipped';

export type VendorMatchTier = 'alias_exact' | 'brand' | 'alias_token' | 'name' | 'fuzzy' | 'none';

export interface ReceiptExtraction {
  is_receipt: boolean;
  vendor_name: string | null;
  brand: string | null;
  total: number | null;
  subtotal: number | null;
  tax: number | null;
  date: string | null; // YYYY-MM-DD
  confidence: { vendor_name: number; total: number; date: number };
}

export interface ReceiptVendorMatch {
  payee_id: string | null;
  payee_name: string | null;
  tier: VendorMatchTier;
  score: number;
  alias_id: string | null;
  candidates: Array<{ payee_id: string; payee_name: string; score: number }>;
}

export interface ReceiptScanResult {
  status: 'success' | 'partial' | 'no_receipt' | 'failed';
  extraction: ReceiptExtraction | null;
  vendorMatch: ReceiptVendorMatch | null;
  normalized: { vendor: string; brand: string };
  meta: { model: string; provider?: 'anthropic' | 'openai'; latency_ms: number; dropped?: string[] };
  error?: string;
  /** Stable failure class from the function — the chip shows honest copy for credits_exhausted. */
  error_code?: 'credits_exhausted' | 'timeout' | 'model_error';
}

interface UseReceiptScanOptions {
  /** Payee types the host surface can display — the function filters its candidate pool to these. */
  allowedPayeeTypes: string[];
}

interface UseReceiptScanReturn {
  enabled: boolean;
  status: ReceiptScanStatus;
  result: ReceiptScanResult | null;
  /** Resolves the scan result, or null on any non-usable outcome. Never throws. */
  scan: (file: File) => Promise<ReceiptScanResult | null>;
  reset: () => void;
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export function useReceiptScan({ allowedPayeeTypes }: UseReceiptScanOptions): UseReceiptScanReturn {
  const { enabled } = useDbFeatureFlag(RECEIPT_SCAN_FLAG);
  const [status, setStatus] = useState<ReceiptScanStatus>('idle');
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const requestIdRef = useRef(0);

  const reset = useCallback(() => {
    requestIdRef.current += 1; // orphan any in-flight request
    setStatus('idle');
    setResult(null);
  }, []);

  const scan = useCallback(
    async (file: File): Promise<ReceiptScanResult | null> => {
      const requestId = ++requestIdRef.current;
      const isCurrent = () => requestId === requestIdRef.current;

      if (!enabled) {
        setStatus('skipped');
        return null;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus('skipped');
        return null;
      }

      setStatus('scanning');
      setResult(null);
      const startedAt = Date.now();

      try {
        // Resize on the phone. targetSizeKB is the "skip compression below"
        // threshold in compressImage — set low so near-full-res camera JPEGs
        // always get downscaled before leaving the device.
        const resized = await compressImage(file, {
          maxWidth: SCAN_MAX_WIDTH,
          maxHeight: SCAN_MAX_WIDTH,
          quality: SCAN_JPEG_QUALITY,
          targetSizeKB: 200,
        });
        const imageBase64 = await fileToBase64(resized);
        const mimeType = resized.type === 'image/png' || resized.type === 'image/webp' ? resized.type : 'image/jpeg';

        const invoke = supabase.functions.invoke<ReceiptScanResult>('scan-receipt', {
          body: { imageBase64, mimeType, allowedPayeeTypes },
        });
        const timeout = new Promise<'timeout'>((resolve) =>
          setTimeout(() => resolve('timeout'), CLIENT_TIMEOUT_MS),
        );

        const outcome = await Promise.race([invoke, timeout]);
        if (!isCurrent()) return null; // retake / close happened mid-flight

        if (outcome === 'timeout') {
          console.warn('[receipt-scan] client timeout after', Date.now() - startedAt, 'ms');
          setStatus('timeout');
          return null;
        }

        const { data, error } = outcome;
        if (error || !data) {
          console.warn('[receipt-scan] invoke error', error?.message ?? 'no data');
          setStatus('failed');
          return null;
        }

        setResult(data);
        setStatus(data.status === 'failed' ? 'failed' : 'done');
        return data.status === 'failed' ? null : data;
      } catch (err) {
        if (!isCurrent()) return null;
        console.warn('[receipt-scan] scan failed', err);
        setStatus('failed');
        return null;
      }
    },
    [enabled, allowedPayeeTypes],
  );

  return { enabled, status, result, scan, reset };
}
