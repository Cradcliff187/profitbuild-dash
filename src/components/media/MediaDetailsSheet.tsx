import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Image as ImageIcon, Video as VideoIcon, MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateMediaMetadata } from "@/utils/projectMedia";
import { formatDeviceLabel } from "@/utils/formatDeviceLabel";
import { toast } from "sonner";
import { MEDIA_CATEGORY_LABELS } from "@/types/project";
import type { MediaCategory, ProjectMedia } from "@/types/project";

interface MediaDetailsSheetProps {
  media: ProjectMedia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updated?: ProjectMedia) => void;
}

const UNCLASSIFIED = "__unclassified__";

function formatFileSize(bytes?: number) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export function MediaDetailsSheet({ media, open, onOpenChange, onSaved }: MediaDetailsSheetProps) {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<MediaCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (media) {
      setFileName(media.file_name ?? "");
      setCaption(media.caption ?? "");
      setCategory(media.category ?? null);
    }
  }, [media]);

  const isDirty =
    !!media &&
    (fileName.trim() !== (media.file_name ?? "") ||
      caption.trim() !== (media.caption ?? "") ||
      (category ?? null) !== (media.category ?? null));

  const deviceLabel = formatDeviceLabel(media?.device_model);

  const handleSave = async () => {
    if (!media) return;
    if (!fileName.trim()) {
      toast.error("File name is required");
      return;
    }

    setIsSaving(true);
    const { data, error } = await updateMediaMetadata(media.id, {
      file_name: fileName.trim(),
      caption: caption.trim(),
      category,
    });
    setIsSaving(false);

    if (error) {
      toast.error("Failed to update media", { description: error.message });
      return;
    }

    const projectId = media.project_id;
    queryClient.invalidateQueries({ queryKey: ["project-media", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-media-count", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-documents-timeline", projectId] });

    toast.success("Media updated");
    onSaved?.(data ?? undefined);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Media details</SheetTitle>
          <SheetDescription>Update the name, caption, and category of this photo or video.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {media && (
            <>
              {/* Read-only summary */}
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 h-10 w-10">
                  {media.file_type === "video" ? (
                    <VideoIcon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs text-muted-foreground space-y-0.5">
                  <p>
                    <span className="font-medium text-foreground">Type:</span>{" "}
                    {media.file_type === "video" ? "Video" : "Photo"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Size:</span> {formatFileSize(media.file_size)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Captured:</span>{" "}
                    {format(new Date(media.taken_at || media.created_at), "MMM d, yyyy")}
                  </p>
                  {deviceLabel && (
                    <p className="truncate">
                      <span className="font-medium text-foreground">Device:</span> {deviceLabel}
                    </p>
                  )}
                  {(media.location_name || (media.latitude && media.longitude)) && (
                    <p className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {media.location_name ||
                        `${media.latitude?.toFixed(4)}, ${media.longitude?.toFixed(4)}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-2">
                <Label htmlFor="media-file-name">File name</Label>
                <Input
                  id="media-file-name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Media name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="media-category">Category</Label>
                <Select
                  value={category ?? UNCLASSIFIED}
                  onValueChange={(v) => setCategory(v === UNCLASSIFIED ? null : (v as MediaCategory))}
                >
                  <SelectTrigger id="media-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNCLASSIFIED}>Unclassified</SelectItem>
                    {Object.entries(MEDIA_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="media-caption">Caption</Label>
                <Textarea
                  id="media-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Optional caption"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <footer className="border-t px-6 py-3 flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
