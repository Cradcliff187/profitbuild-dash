import { useState, useEffect } from "react";
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
import { Clock, PlusCircle, Pencil, Trash2, MoreVertical, Camera, Video, X, Paperclip, Download, FileText, Maximize2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectNote } from "@/types/projectNote";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCameraCapture } from "@/hooks/useCameraCapture";
import { useVideoCapture } from "@/hooks/useVideoCapture";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { PdfPreviewModal } from "@/components/PdfPreviewModal";

interface ProjectNotesTimelineProps {
  projectId: string;
  inSheet?: boolean; // When true, optimized for mobile Sheet display
}

export function ProjectNotesTimeline({ projectId, inSheet = false }: ProjectNotesTimelineProps) {
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | 'file' | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [enlargedVideo, setEnlargedVideo] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; name: string } | null>(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { capturePhoto, isCapturing: isCapturingPhoto } = useCameraCapture();
  const { startRecording, isRecording } = useVideoCapture();

  // Swipe handlers for image lightbox
  const { 
    handleTouchStart: imageSwipeStart, 
    handleTouchMove: imageSwipeMove, 
    handleTouchEnd: imageSwipeEnd 
  } = useSwipeGesture({
    onSwipeLeft: () => setEnlargedImage(null),
    onSwipeRight: () => setEnlargedImage(null),
    minSwipeDistance: 50
  });

  // Swipe handlers for video lightbox
  const { 
    handleTouchStart: videoSwipeStart, 
    handleTouchMove: videoSwipeMove, 
    handleTouchEnd: videoSwipeEnd 
  } = useSwipeGesture({
    onSwipeLeft: () => setEnlargedVideo(null),
    onSwipeRight: () => setEnlargedVideo(null),
    minSwipeDistance: 50
  });

  // Attach touch listeners to image lightbox
  useEffect(() => {
    const container = document.getElementById('image-lightbox-container');
    if (!container) return;

    container.addEventListener('touchstart', imageSwipeStart as any);
    container.addEventListener('touchmove', imageSwipeMove as any);
    container.addEventListener('touchend', imageSwipeEnd as any);

    return () => {
      container.removeEventListener('touchstart', imageSwipeStart as any);
      container.removeEventListener('touchmove', imageSwipeMove as any);
      container.removeEventListener('touchend', imageSwipeEnd as any);
    };
  }, [imageSwipeStart, imageSwipeMove, imageSwipeEnd, enlargedImage]);

  // Attach touch listeners to video lightbox
  useEffect(() => {
    const container = document.getElementById('video-lightbox-container');
    if (!container) return;

    container.addEventListener('touchstart', videoSwipeStart as any);
    container.addEventListener('touchmove', videoSwipeMove as any);
    container.addEventListener('touchend', videoSwipeEnd as any);

    return () => {
      container.removeEventListener('touchstart', videoSwipeStart as any);
      container.removeEventListener('touchmove', videoSwipeMove as any);
      container.removeEventListener('touchend', videoSwipeEnd as any);
    };
  }, [videoSwipeStart, videoSwipeMove, videoSwipeEnd, enlargedVideo]);

  const formatTimestamp = (utcTimestamp: string | null | undefined) => {
    if (!utcTimestamp) return "No date";
    
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) return "Invalid date";
    
    const estTime = toZonedTime(date, "America/New_York");
    return format(estTime, "MMM d, yyyy h:mm a 'EST'");
  };

  const formatTimestampCompact = (utcTimestamp: string | null | undefined) => {
    if (!utcTimestamp) return "No date";
    
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) return "Invalid date";
    
    const estTime = toZonedTime(date, "America/New_York");
    return format(estTime, "MMM d, h:mm a");
  };

  const isPdfFile = (fileName: string | null | undefined): boolean => {
    if (!fileName) return false;
    return fileName.toLowerCase().endsWith('.pdf');
  };

  const handlePreviewAttachment = async (attachmentUrl: string, attachmentName: string | null | undefined) => {
    if (!attachmentUrl) return;
    
    try {
      const response = await fetch(attachmentUrl);
      const blob = await response.blob();
      setPdfBlob(blob);
      setSelectedAttachment({ url: attachmentUrl, name: attachmentName || 'attachment.pdf' });
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch PDF:', error);
      toast.error('Preview failed', {
        description: 'Unable to load PDF preview',
      });
    }
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

  const handleCapturePhoto = async () => {
    const result = await capturePhoto();
    if (result?.dataUrl) {
      setAttachmentPreview(result.dataUrl);
      setAttachmentType('image');
    }
  };

  const handleCaptureVideo = async () => {
    const result = await startRecording();
    if (result?.dataUrl) {
      setAttachmentPreview(result.dataUrl);
      setAttachmentType('video');
    }
  };

  const handleClearAttachment = () => {
    setAttachmentPreview(null);
    setAttachmentType(null);
    setAttachmentFileName(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 20MB');
      return;
    }

    const acceptedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (!acceptedTypes.includes(file.type)) {
      toast.error('File type not supported. Please use PDF, DOC, XLS, or TXT files');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentPreview(reader.result as string);
      setAttachmentType('file');
      setAttachmentFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const uploadAttachment = async (dataUrl: string, type: 'image' | 'video' | 'file', fileName?: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      let fileExt = 'jpg';
      let contentType = blob.type;
      
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
          upsert: false
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
    } finally {
      setIsUploading(false);
    }
  };

  const addNoteMutation = useMutation({
    mutationFn: async (params: { text: string; attachmentUrl?: string; attachmentType?: 'image' | 'video' | 'file'; attachmentName?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("project_notes")
        .insert({
          project_id: projectId,
          user_id: user.id,
          note_text: params.text,
          attachment_url: params.attachmentUrl,
          attachment_type: params.attachmentType,
          attachment_name: params.attachmentName,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", projectId] });
      setNoteText("");
      setAttachmentPreview(null);
      setAttachmentType(null);
      setAttachmentFileName(null);
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

  const handleAddNote = async () => {
    const trimmedText = noteText.trim();
    if (!trimmedText) {
      toast.error("Note cannot be empty");
      return;
    }
    
    let attachmentUrl: string | null = null;
    
    if (attachmentPreview && attachmentType) {
      attachmentUrl = await uploadAttachment(attachmentPreview, attachmentType, attachmentFileName || undefined);
      if (!attachmentUrl) {
        return;
      }
    }
    
    addNoteMutation.mutate({
      text: trimmedText,
      attachmentUrl: attachmentUrl || undefined,
      attachmentType: attachmentType || undefined,
      attachmentName: attachmentFileName || undefined,
    });
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

  // Determine main content based on view mode
  let mainContent;
  
  // When displayed in Sheet modal (mobile full-screen)
  if (inSheet) {
    mainContent = (
      <div className="flex flex-col h-full">
        {/* Add Note Form - Prominent at top */}
        <div className="p-3 bg-muted/20 border rounded-lg mb-3 shrink-0">
          {attachmentPreview && (
            <div className="mb-2 relative">
              {attachmentType === 'image' ? (
                <img src={attachmentPreview} alt="Preview" className="w-full h-32 object-cover rounded" />
              ) : attachmentType === 'video' ? (
                <video src={attachmentPreview} className="w-full h-32 object-cover rounded" controls />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-muted rounded border">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs truncate">{attachmentFileName}</span>
                </div>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0"
                onClick={handleClearAttachment}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="text-sm flex-1 resize-none"
            />
            <div className="flex flex-col gap-1">
              <Button
                onClick={handleCapturePhoto}
                disabled={isCapturingPhoto || isUploading}
                size="sm"
                variant="outline"
                className="px-2 h-8"
              >
                <Camera className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleCaptureVideo}
                disabled={isRecording || isUploading}
                size="sm"
                variant="outline"
                className="px-2 h-8"
              >
                <Video className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => document.getElementById('file-upload-sheet')?.click()}
                disabled={isUploading}
                size="sm"
                variant="outline"
                className="px-2 h-8"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <input
                id="file-upload-sheet"
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              <Button
                onClick={handleAddNote}
                disabled={addNoteMutation.isPending || !noteText.trim() || isUploading}
                size="sm"
                className="px-2 h-8"
              >
                <PlusCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notes List - Full scrollable area */}
        <ScrollArea className="flex-1">
          <div className="space-y-3 pb-4">
            {notes && notes.length > 0 ? (
              notes.map((note) => {
                const displayName =
                  note.profiles?.full_name ||
                  note.profiles?.email ||
                  "Unknown User";
                const initials = getInitials(displayName);

                return (
                  <div key={note.id} className="p-3 bg-card rounded-lg border hover:bg-accent/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold truncate">
                            {displayName}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatTimestampCompact(note.created_at)}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleStartEdit(note)}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive" 
                                  onClick={() => handleDelete(note.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="text-sm min-h-[80px]"
                              rows={4}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEdit} className="h-8 text-xs px-3">
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8 text-xs px-3">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                              {note.note_text}
                            </p>
                            {note.attachment_url && (
                              <div className="mt-2">
                                {note.attachment_type === 'image' ? (
                                  <div className="relative inline-block group cursor-pointer" onClick={() => setEnlargedImage(note.attachment_url!)}>
                                    <img 
                                      src={note.attachment_url} 
                                      alt="Note attachment" 
                                      className="w-full max-w-xs rounded border hover:opacity-90 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded">
                                      <Maximize2 className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                ) : note.attachment_type === 'video' ? (
                                  <div className="relative inline-block group cursor-pointer" onClick={() => setEnlargedVideo(note.attachment_url!)}>
                                    <video 
                                      src={note.attachment_url} 
                                      className="w-full max-w-xs rounded border" 
                                      controls
                                    />
                                    <div className="absolute top-2 right-2 bg-black/60 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Maximize2 className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {isPdfFile(note.attachment_name) && (
                                      <Button
                                        onClick={() => handlePreviewAttachment(note.attachment_url!, note.attachment_name)}
                                        size="sm"
                                        variant="outline"
                                        className="min-h-[44px]"
                                      >
                                        <Eye className="w-4 h-4 mr-1" />
                                        Preview
                                      </Button>
                                    )}
                                    <a 
                                      href={note.attachment_url} 
                                      download={note.attachment_name}
                                      className="flex items-center gap-2 p-2 bg-muted rounded border hover:bg-muted/80 transition-colors text-sm flex-1"
                                    >
                                      <FileText className="w-4 h-4 text-muted-foreground" />
                                      <span className="truncate">{note.attachment_name || 'Download file'}</span>
                                      <Download className="w-4 h-4 text-muted-foreground ml-auto" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-8 text-sm text-muted-foreground">No notes yet</p>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  } else if (isMobile) {
    mainContent = (
    <div className="border rounded-lg overflow-hidden">
      {/* Quick Add Form - Top Priority */}
      <div className="p-2 bg-muted/20 border-b">
        {attachmentPreview && (
          <div className="mb-1 relative">
            {attachmentType === 'image' ? (
              <img src={attachmentPreview} alt="Preview" className="w-full h-20 object-cover rounded" />
            ) : attachmentType === 'video' ? (
              <video src={attachmentPreview} className="w-full h-20 object-cover rounded" controls />
            ) : (
              <div className="flex items-center gap-2 p-1 bg-muted rounded border">
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] truncate">{attachmentFileName}</span>
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-0.5 right-0.5 h-4 w-4 p-0"
              onClick={handleClearAttachment}
            >
              <X className="h-2 w-2" />
            </Button>
          </div>
        )}
        
        <div className="flex gap-1">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add note..."
            rows={2}
            className="text-xs flex-1 min-h-0 resize-none"
          />
          <div className="flex flex-col gap-0.5">
            <Button
              onClick={handleCapturePhoto}
              disabled={isCapturingPhoto || isUploading}
              size="sm"
              variant="outline"
              className="px-1 h-6"
            >
              <Camera className="w-2.5 h-2.5" />
            </Button>
            <Button
              onClick={handleCaptureVideo}
              disabled={isRecording || isUploading}
              size="sm"
              variant="outline"
              className="px-1 h-6"
            >
              <Video className="w-2.5 h-2.5" />
            </Button>
            <Button
              onClick={() => document.getElementById('file-upload-mobile')?.click()}
              disabled={isUploading}
              size="sm"
              variant="outline"
              className="px-1 h-6"
            >
              <Paperclip className="w-2.5 h-2.5" />
            </Button>
            <input
              id="file-upload-mobile"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button
              onClick={handleAddNote}
              disabled={addNoteMutation.isPending || !noteText.trim() || isUploading}
              size="sm"
              className="px-1 h-6"
            >
              <PlusCircle className="w-2.5 h-2.5" />
            </Button>
          </div>
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
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground flex-shrink-0">
                            {formatTimestampCompact(note.created_at)}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStartEdit(note)}>
                                <Pencil className="h-2.5 w-2.5 mr-1.5" />
                                <span className="text-[10px]">Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive" 
                                onClick={() => handleDelete(note.id)}
                              >
                                <Trash2 className="h-2.5 w-2.5 mr-1.5" />
                                <span className="text-[10px]">Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                        <>
                          <p className="text-[11px] leading-tight text-foreground/90 whitespace-pre-wrap line-clamp-3">
                            {note.note_text}
                          </p>
                          {note.attachment_url && (
                            <div className="mt-1">
                              {note.attachment_type === 'image' ? (
                                <div className="relative inline-block group cursor-pointer" onClick={() => setEnlargedImage(note.attachment_url!)}>
                                  <img 
                                    src={note.attachment_url} 
                                    alt="Note attachment" 
                                    className="w-full max-w-[120px] rounded border hover:opacity-90 transition-opacity"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded">
                                    <Maximize2 className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              ) : note.attachment_type === 'video' ? (
                                <div className="relative inline-block group cursor-pointer" onClick={() => setEnlargedVideo(note.attachment_url!)}>
                                  <video 
                                    src={note.attachment_url} 
                                    className="w-full max-w-[120px] rounded border" 
                                    controls
                                  />
                                  <div className="absolute top-1 right-1 bg-black/60 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Maximize2 className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {isPdfFile(note.attachment_name) && (
                                    <Button
                                      onClick={() => handlePreviewAttachment(note.attachment_url!, note.attachment_name)}
                                      size="sm"
                                      variant="outline"
                                      className="min-h-[44px] px-2 text-[10px]"
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Preview
                                    </Button>
                                  )}
                                  <a 
                                    href={note.attachment_url} 
                                    download={note.attachment_name}
                                    className="flex items-center gap-1 p-1 bg-muted rounded border hover:bg-muted/80 transition-colors text-[10px] flex-1"
                                  >
                                    <FileText className="w-3 h-3 text-muted-foreground" />
                                    <span className="truncate">{note.attachment_name || 'Download'}</span>
                                    <Download className="w-3 h-3 text-muted-foreground ml-auto" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </>
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
    );
  } else {
    mainContent = (
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
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                <span>{formatTimestamp(note.created_at)}</span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleStartEdit(note)}>
                                    <Pencil className="h-3 w-3 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive" 
                                    onClick={() => handleDelete(note.id)}
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                            <>
                              <p className="text-xs leading-snug text-foreground whitespace-pre-wrap">
                                {note.note_text}
                              </p>
                              {note.attachment_url && (
                                <div className="mt-1.5">
                                  {note.attachment_type === 'image' ? (
                                    <div className="relative inline-block group cursor-pointer" onClick={() => setEnlargedImage(note.attachment_url!)}>
                                      <img 
                                        src={note.attachment_url} 
                                        alt="Note attachment" 
                                        className="w-full max-w-[200px] rounded border hover:opacity-90 transition-opacity"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded">
                                        <Maximize2 className="w-5 h-5 text-white" />
                                      </div>
                                    </div>
                                  ) : note.attachment_type === 'video' ? (
                                    <div className="relative inline-block group cursor-pointer" onClick={() => setEnlargedVideo(note.attachment_url!)}>
                                      <video 
                                        src={note.attachment_url} 
                                        className="w-full max-w-[200px] rounded border" 
                                        controls
                                      />
                                      <div className="absolute top-2 right-2 bg-black/60 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Maximize2 className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {isPdfFile(note.attachment_name) && (
                                        <Button
                                          onClick={() => handlePreviewAttachment(note.attachment_url!, note.attachment_name)}
                                          size="sm"
                                          variant="outline"
                                          className="min-h-[44px] sm:h-7"
                                        >
                                          <Eye className="w-3 h-3 mr-1" />
                                          Preview
                                        </Button>
                                      )}
                                      <a 
                                        href={note.attachment_url} 
                                        download={note.attachment_name}
                                        className="flex items-center gap-2 p-1.5 bg-muted rounded border hover:bg-muted/80 transition-colors text-xs flex-1"
                                      >
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <span className="truncate">{note.attachment_name || 'Download file'}</span>
                                        <Download className="w-4 h-4 text-muted-foreground ml-auto" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
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
          
          {attachmentPreview && (
            <div className="mb-2 relative">
              {attachmentType === 'image' ? (
                <img src={attachmentPreview} alt="Preview" className="w-full h-24 object-cover rounded" />
              ) : attachmentType === 'video' ? (
                <video src={attachmentPreview} className="w-full h-24 object-cover rounded" controls />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-muted rounded border">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs truncate">{attachmentFileName}</span>
                </div>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-5 w-5 p-0"
                onClick={handleClearAttachment}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type note..."
            rows={4}
            className="text-xs mb-2 resize-none flex-1"
          />
          
          <div className="flex gap-1 mb-2">
            <Button
              onClick={handleCapturePhoto}
              disabled={isCapturingPhoto || isUploading}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Camera className="w-3 h-3 mr-1" />
              Photo
            </Button>
            <Button
              onClick={handleCaptureVideo}
              disabled={isRecording || isUploading}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Video className="w-3 h-3 mr-1" />
              Video
            </Button>
            <Button
              onClick={() => document.getElementById('file-upload-desktop')?.click()}
              disabled={isUploading}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Paperclip className="w-3 h-3 mr-1" />
              File
            </Button>
            <input
              id="file-upload-desktop"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
          </div>
          
          <Button
            onClick={handleAddNote}
            disabled={addNoteMutation.isPending || !noteText.trim() || isUploading}
            size="sm"
            className="w-full"
          >
            <PlusCircle className="w-3 h-3 mr-1" />
            {isUploading ? "Uploading..." : addNoteMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
    );
  }

  return (
    <>
      {mainContent}
      
      {/* Image Lightbox */}
      {enlargedImage && (
        <div 
          id="image-lightbox-container"
          className="fixed inset-0 bg-background z-50 flex items-center justify-center"
          onClick={() => setEnlargedImage(null)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-10 w-10 z-10"
            onClick={() => setEnlargedImage(null)}
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={enlargedImage}
            alt="Enlarged note attachment"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      {/* Video Lightbox */}
      {enlargedVideo && (
        <div 
          id="video-lightbox-container"
          className="fixed inset-0 bg-background z-50 flex items-center justify-center"
          onClick={() => setEnlargedVideo(null)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-10 w-10 z-10"
            onClick={() => setEnlargedVideo(null)}
          >
            <X className="h-5 w-5" />
          </Button>
          <video
            src={enlargedVideo}
            className="max-h-[90vh] max-w-[90vw]"
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <PdfPreviewModal
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        pdfBlob={pdfBlob}
        fileName={selectedAttachment?.name || "attachment.pdf"}
      />
    </>
  );
}

