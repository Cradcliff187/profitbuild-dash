import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ProjectNote } from "@/types/projectNote";

interface ProjectNotesTimelineProps {
  projectId: string;
}

export function ProjectNotesTimeline({ projectId }: ProjectNotesTimelineProps) {
  const [noteText, setNoteText] = useState("");
  const queryClient = useQueryClient();

  const formatTimestamp = (utcTimestamp: string) => {
    const estTime = toZonedTime(new Date(utcTimestamp), "America/New_York");
    return format(estTime, "MMM d, yyyy h:mm a 'EST'");
  };

  const { data: notes, isLoading } = useQuery({
    queryKey: ["project-notes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_notes")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProjectNote[];
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("project_notes")
        .insert({
          project_id: projectId,
          user_id: user.id,
          note_text: text,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", projectId] });
      setNoteText("");
      toast.success("Note added");
    },
    onError: (error) => {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    },
  });

  const handleAddNote = () => {
    const trimmedText = noteText.trim();
    if (!trimmedText) {
      toast.error("Note cannot be empty");
      return;
    }
    addNoteMutation.mutate(trimmedText);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading notes...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Add Note Form */}
      <div className="space-y-2">
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a project note..."
          rows={2}
          className="resize-none text-sm"
        />
        <Button
          onClick={handleAddNote}
          disabled={addNoteMutation.isPending || !noteText.trim()}
          size="sm"
          className="w-full"
        >
          {addNoteMutation.isPending ? "Adding..." : "Add Note"}
        </Button>
      </div>

      {/* Notes Timeline */}
      {notes && notes.length > 0 ? (
        <div className="space-y-2 mt-3">
          {notes.map((note, index) => {
            const displayName =
              note.profiles?.full_name ||
              note.profiles?.email ||
              "Unknown User";

            return (
              <div key={note.id}>
                {index > 0 && <div className="border-t border-border/50 my-2" />}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-foreground">
                      {displayName}
                    </span>
                    <span className="text-muted-foreground">
                      {formatTimestamp(note.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {note.note_text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          No notes yet. Add the first note above.
        </p>
      )}
    </div>
  );
}
