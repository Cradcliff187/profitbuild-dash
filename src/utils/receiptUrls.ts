import { supabase } from '@/integrations/supabase/client';

// Receipts store a signed URL in `receipts.image_url`, not the bare storage path
// — ReceiptPreviewModal and the download utils both assume a URL. All three write
// paths (AddReceiptModal, EditReceiptModal, EditReceiptDialog) stamp 1-year
// expiry. Centralized here so a future TTL change is one edit, not three. PR #78
// fixed EditReceiptDialog after it drifted to bare-path; this helper keeps that
// class of bug from coming back.
export const RECEIPT_URL_TTL_SECONDS = 31536000; // 1 year

const RECEIPTS_BUCKET = 'time-tracker-documents';

/**
 * Generate a 1-year signed URL for a receipt image just uploaded to storage.
 * Throws on signing failure (callers should treat the upload as failed and roll back).
 */
export async function createReceiptSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, RECEIPT_URL_TTL_SECONDS);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Failed to get signed URL for receipt');

  return data.signedUrl;
}
