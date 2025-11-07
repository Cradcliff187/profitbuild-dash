import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Clock, PlusCircle } from "lucide-react";
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

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
      {/* Enhanced Add Note Form */}
      <div className="bg-muted/50 p-3 rounded-lg border-2 border-dashed border-border">
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a project note..."
          rows={3}
          className="text-sm mb-2 resize-none bg-background"
        />
        <Button
          onClick={handleAddNote}
          disabled={addNoteMutation.isPending || !noteText.trim()}
          size="sm"
          className="w-full"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          {addNoteMutation.isPending ? "Adding..." : "Add Note"}
        </Button>
      </div>

      {/* Enhanced Notes Timeline */}
      {notes && notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => {
            const displayName =
              note.profiles?.full_name ||
              note.profiles?.email ||
              "Unknown User";
            const initials = getInitials(displayName);

            return (
              <Card key={note.id} className="p-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {displayName}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(note.created_at)}</span>
                    </div>
                    
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {note.note_text}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            No notes yet. Add the first note above.
          </p>
        </div>
      )}
    </div>
  );
}
