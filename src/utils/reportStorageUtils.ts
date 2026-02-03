import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SaveReportResult {
  documentId: string;
  fileUrl: string;       // publicUrl for DB
  signedUrl: string;     // signed URL (30 days)
  fileName: string;
  storagePath: string;
}

/**
 * Upload a generated PDF report to Storage and save a record in project_documents.
 * Used by BOTH the Download and Email delivery paths.
 * 
 * Follows the exact pattern from DocumentUpload.tsx:
 * - Upload to 'project-documents' bucket
 * - Get publicUrl for the DB record
 * - Insert into project_documents table
 */
export async function saveReportToProjectDocuments(
  pdfBlob: Blob,
  projectId: string,
  projectNumber: string,
  reportTitle: string,
  mediaCount: number
): Promise<SaveReportResult> {
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 2. Build file name and storage path
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const timestamp = Date.now();
  const sanitizedTitle = reportTitle.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 60);
  const fileName = `${projectNumber}_Media_Report_${dateStr}.pdf`;
  const storagePath = `${projectId}/reports/${timestamp}-${sanitizedTitle}.pdf`;

  // 3. Upload to project-documents bucket (same bucket as DocumentUpload.tsx)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('project-documents')
    .upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw new Error(`Failed to upload report: ${uploadError.message}`);

  // 4. Get publicUrl (same pattern as DocumentUpload.tsx)
  const { data: { publicUrl } } = supabase.storage
    .from('project-documents')
    .getPublicUrl(storagePath);

  // 5. Generate signed URL for email sharing (30 days)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('project-documents')
    .createSignedUrl(storagePath, 2592000); // 30 days

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error('Failed to generate download link');
  }

  // 6. Insert record into project_documents table
  const description = `Media report with ${mediaCount} item${mediaCount !== 1 ? 's' : ''} — generated ${format(new Date(), 'MMM d, yyyy h:mm a')}`;

  const { data: docRecord, error: dbError } = await supabase
    .from('project_documents')
    .insert({
      project_id: projectId,
      document_type: 'report',
      file_name: fileName,
      file_url: publicUrl,
      file_size: pdfBlob.size,
      mime_type: 'application/pdf',
      uploaded_by: user.id,
      description,
    })
    .select('id')
    .single();

  if (dbError) throw new Error(`Failed to save report record: ${dbError.message}`);

  return {
    documentId: docRecord.id,
    fileUrl: publicUrl,
    signedUrl: signedUrlData.signedUrl,
    fileName,
    storagePath,
  };
}
