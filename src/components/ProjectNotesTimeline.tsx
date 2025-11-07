import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
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
    <ResizablePanelGroup direction="horizontal" className="min-h-[300px] rounded-lg border">
      {/* Left Panel: Note History */}
      <ResizablePanel defaultSize={60} minSize={40}>
        <div className="h-full flex flex-col">
          <div className="p-2 border-b bg-muted/30">
            <h4 className="text-xs font-semibold">Recent Notes</h4>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {notes && notes.length > 0 ? (
                notes.map((note) => {
                  const displayName =
                    note.profiles?.full_name ||
                    note.profiles?.email ||
                    "Unknown User";
                  const initials = getInitials(displayName);

                  return (
                    <Card key={note.id} className="p-2 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-semibold truncate text-foreground">
                              {displayName}
                            </span>
                            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{formatTimestamp(note.created_at)}</span>
                            </div>
                          </div>
                          
                          <p className="text-xs leading-snug text-foreground whitespace-pre-wrap">
                            {note.note_text}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground">
                    No notes yet
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      {/* Resizable Handle */}
      <ResizableHandle withHandle />

      {/* Right Panel: Add Note Input */}
      <ResizablePanel defaultSize={40} minSize={30}>
        <div className="h-full flex flex-col p-2 bg-muted/20">
          <h4 className="text-xs font-semibold mb-2">Add Note</h4>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type note..."
            rows={4}
            className="text-xs mb-2 resize-none flex-1"
          />
          <Button
            onClick={handleAddNote}
            disabled={addNoteMutation.isPending || !noteText.trim()}
            size="sm"
            className="w-full"
          >
            <PlusCircle className="w-3 h-3 mr-1" />
            {addNoteMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
