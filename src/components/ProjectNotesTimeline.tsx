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
import { Clock, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { ProjectNote } from "@/types/projectNote";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProjectNotesTimelineProps {
  projectId: string;
}

export function ProjectNotesTimeline({ projectId }: ProjectNotesTimelineProps) {
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

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

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase
        .from("project_notes")
        .update({ note_text: text, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", projectId] });
      setEditingNoteId(null);
      setEditText("");
      toast.success("Note updated");
    },
    onError: (error) => {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", projectId] });
      toast.success("Note deleted");
    },
    onError: (error) => {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
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

  const handleStartEdit = (note: ProjectNote) => {
    setEditingNoteId(note.id);
    setEditText(note.note_text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditText("");
  };

  const handleSaveEdit = () => {
    if (!editingNoteId || !editText.trim()) return;
    updateNoteMutation.mutate({ id: editingNoteId, text: editText.trim() });
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this note? This cannot be undone.")) {
      deleteNoteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading notes...</div>;
  }

  return isMobile ? (
    // MOBILE: Compact vertical stack
    <div className="border rounded-lg overflow-hidden">
      {/* Quick Add Form - Top Priority */}
      <div className="p-2 bg-muted/20 border-b">
        <div className="flex gap-1">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add note..."
            rows={2}
            className="text-xs flex-1 min-h-0 resize-none"
          />
          <Button
            onClick={handleAddNote}
            disabled={addNoteMutation.isPending || !noteText.trim()}
            size="sm"
            className="px-2 h-auto self-end"
          >
            <PlusCircle className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Recent Notes - Compact List */}
      <ScrollArea className="h-[200px]">
        <div className="p-1.5 space-y-1.5">
          {notes && notes.length > 0 ? (
            notes.map((note) => {
              const displayName =
                note.profiles?.full_name ||
                note.profiles?.email ||
                "Unknown User";
              const initials = getInitials(displayName);
              const firstName = displayName.split(' ')[0];

              return (
                <div key={note.id} className="p-1.5 bg-card rounded border hover:bg-accent/30 transition-colors group">
                  <div className="flex items-start gap-1.5">
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarFallback className="text-[9px] font-medium bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-semibold truncate">
                          {firstName}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[9px] text-muted-foreground flex-shrink-0">
                            {format(toZonedTime(new Date(note.created_at), "America/New_York"), "MMM d h:mm a")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleStartEdit(note)}
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 text-destructive opacity-0 group-hover:opacity-100"
                            onClick={() => handleDelete(note.id)}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {editingNoteId === note.id ? (
                        <div className="space-y-1">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="text-[11px] min-h-[50px]"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-0.5">
                            <Button size="sm" onClick={handleSaveEdit} className="h-5 text-[9px] px-1.5">
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-5 text-[9px] px-1.5">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] leading-tight text-foreground/90 whitespace-pre-wrap line-clamp-3">
                          {note.note_text}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center py-4 text-[10px] text-muted-foreground">No notes yet</p>
          )}
        </div>
      </ScrollArea>
    </div>
  ) : (
    // DESKTOP: Side-by-side resizable layout
    <ResizablePanelGroup direction="horizontal" className="min-h-[300px] rounded-lg border">
      {/* Left Panel: Note History */}
      <ResizablePanel defaultSize={60} minSize={40}>
        <div className="h-full flex flex-col">
          <div className="p-2 border-b bg-muted/30">
            <h4 className="text-xs font-semibold">Recent Notes</h4>
          </div>
          <ScrollArea className="flex-1 max-h-[280px]">
            <div className="p-2 space-y-2">
              {notes && notes.length > 0 ? (
                notes.map((note) => {
                  const displayName =
                    note.profiles?.full_name ||
                    note.profiles?.email ||
                    "Unknown User";
                  const initials = getInitials(displayName);

                  return (
                    <Card key={note.id} className="p-2 hover:bg-accent/50 transition-colors group">
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
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                <span>{formatTimestamp(note.created_at)}</span>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 ml-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleStartEdit(note)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(note.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {editingNoteId === note.id ? (
                            <div className="space-y-1">
                              <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="text-xs min-h-[60px]"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <Button size="sm" onClick={handleSaveEdit} className="h-6 text-[10px] px-2">
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-6 text-[10px] px-2">
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs leading-snug text-foreground whitespace-pre-wrap">
                              {note.note_text}
                            </p>
                          )}
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
