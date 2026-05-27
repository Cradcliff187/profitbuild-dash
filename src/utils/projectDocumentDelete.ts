import { supabase } from "@/integrations/supabase/client";
import type { ProjectDocument } from "@/types/document";

// Deletes a project_documents row and its underlying storage object.
// Mirrors the path-parsing used by uploadProjectDocument (public URL →
// bucket-relative path). Storage removal is best-effort: when the path can't
// be parsed (a non-standard file_url) we still delete the DB row so the
// document disappears from every surface rather than leaving a ghost row.
export async function deleteProjectDocument(
  doc: Pick<ProjectDocument, "id" | "file_url">,
): Promise<{ error: Error | null }> {
  try {
    const filePath = doc.file_url?.split("/project-documents/")[1];
    if (filePath) {
      await supabase.storage.from("project-documents").remove([filePath]);
    }

    const { error } = await supabase
      .from("project_documents")
      .delete()
      .eq("id", doc.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
