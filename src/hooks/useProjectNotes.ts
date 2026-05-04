import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProjectNote } from '@/types/projectNote';

interface AddNoteParams {
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'file';
  attachmentName?: string;
  mentionedUserIds?: string[];
}

export function useProjectNotes(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['project-notes', projectId];
  // The Notes tab badge in MobileScheduleView uses a separate query key
  // (`project-notes-count`) — invalidate both whenever the underlying notes
  // change so the badge stays in sync without a page reload. Caught during
  // QA: posting a note left the badge stuck on the old count until reload
  // (Gotcha #27 — direct cache-key fanout miss).
  const countQueryKey = ['project-notes-count', projectId];
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: countQueryKey });
  };

  const { data: notes, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_notes')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectNote[];
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (params: AddNoteParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert note and get back the ID
      const { data: noteData, error } = await supabase
        .from('project_notes')
        .insert({
          project_id: projectId,
          user_id: user.id,
          note_text: params.text,
          attachment_url: params.attachmentUrl,
          attachment_type: params.attachmentType,
          attachment_name: params.attachmentName,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Insert mentions + notifications for tagged users
      const mentionedIds = params.mentionedUserIds?.filter((id) => id !== user.id) || [];
      if (mentionedIds.length > 0 && noteData?.id) {
        // Get author name for notification title
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        const authorName = profile?.full_name || profile?.email || 'Someone';

        // Get project name for notification body
        const { data: project } = await supabase
          .from('projects')
          .select('project_name')
          .eq('id', projectId)
          .single();

        // Insert mention records
        await supabase.from('note_mentions').insert(
          mentionedIds.map((uid) => ({
            note_id: noteData.id,
            user_id: uid,
          }))
        );

        // Insert notification records
        const notePreview = params.text
          .replace(/@\[[^\]]+\]\([^)]+\)/g, (m) => '@' + m.slice(2, m.indexOf(']')))
          .slice(0, 100);

        await supabase.from('user_notifications').insert(
          mentionedIds.map((uid) => ({
            user_id: uid,
            type: 'mention',
            title: `${authorName} mentioned you`,
            body: `${project?.project_name || 'Project'}: ${notePreview}`,
            link_url: `/field-schedule/${projectId}`,
            reference_id: noteData.id,
            reference_type: 'project_note',
          }))
        );
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Note added');
    },
    onError: (error) => {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase
        .from('project_notes')
        .update({ note_text: text, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Update doesn't change count, but timeline content does — invalidate
      // the notes list. (Count key is fine to leave alone but harmless to
      // include via invalidateAll for symmetry.)
      invalidateAll();
      toast.success('Note updated');
    },
    onError: (error) => {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Note deleted');
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    },
  });

  const uploadAttachment = async (
    dataUrl: string,
    type: 'image' | 'video' | 'file',
    fileName?: string
  ): Promise<string | null> => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      let fileExt = 'jpg';
      const contentType = blob.type;

      if (type === 'video') {
        fileExt = 'mp4';
      } else if (type === 'file' && fileName) {
        const ext = fileName.split('.').pop();
        fileExt = ext || 'pdf';
      }

      const uploadFileName = `${projectId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('note-attachments')
        .upload(uploadFileName, blob, {
          contentType: contentType || 'application/octet-stream',
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('note-attachments')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Failed to upload attachment');
      return null;
    }
  };

  return {
    notes: notes || [],
    isLoading,
    addNote: addNoteMutation.mutate,
    isAdding: addNoteMutation.isPending,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    uploadAttachment,
  };
}
