import { supabase } from "@/integrations/supabase/client";
import type { DocumentType } from "@/types/document";

export interface UploadProjectDocumentParams {
  projectId: string;
  file: File;
  documentType?: DocumentType;
}

export interface UploadProjectDocumentResult {
  data: { id: string; file_url: string } | null;
  error: Error | null;
}

// Uploads a file to the project-documents bucket + inserts a project_documents
// row. Used by the mobile FieldQuickActionBar's Attach button when the
// selected file is a non-media document (PDF, Word, Excel, txt, etc.) so the
// upload lands on the project's Documents tab rather than stuck as an
// empty-text note attachment.
//
// Mirrors the storage path + insert pattern from QuoteAttachmentUpload so the
// filter-by-type dropdown in ProjectDocumentsTable + the field-schedule
// Documents tab can both see it.
export async function uploadProjectDocument({
  projectId,
  file,
  documentType = "other",
}: UploadProjectDocumentParams): Promise<UploadProjectDocumentResult> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: new Error("Not authenticated") };
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${projectId}/attachments/${timestamp}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("project-documents").getPublicUrl(filePath);

    const { data: inserted, error: dbError } = await supabase
      .from("project_documents")
      .insert({
        project_id: projectId,
        document_type: documentType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        uploaded_by: user.id,
      })
      .select("id, file_url")
      .single();

    if (dbError) {
      // Rollback storage upload if DB insert fails — otherwise we orphan a file.
      await supabase.storage.from("project-documents").remove([filePath]);
      throw dbError;
    }

    return { data: inserted as { id: string; file_url: string }, error: null };
  } catch (error) {
    console.error("uploadProjectDocument failed:", error);
    return { data: null, error: error as Error };
  }
}
