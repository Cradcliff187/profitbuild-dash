import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardCheck, StickyNote, Camera, FileText } from "lucide-react";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useScheduleTasks } from "@/components/schedule/hooks/useScheduleTasks";
import { FieldScheduleTable } from "@/components/schedule/FieldScheduleTable";
import { FieldMediaGallery } from "@/components/schedule/FieldMediaGallery";
import { FieldDocumentsList } from "@/components/schedule/FieldDocumentsList";
import { ProjectNotesTimeline } from "@/components/ProjectNotesTimeline";
import { ScheduleTask } from "@/types/schedule";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type FieldTab = "tasks" | "notes" | "media" | "docs";

const tabs: { id: FieldTab; icon: React.ElementType; label: string }[] = [
  { id: "tasks", icon: ClipboardCheck, label: "Tasks" },
  { id: "notes", icon: StickyNote, label: "Notes" },
  { id: "media", icon: Camera, label: "Media" },
  { id: "docs", icon: FileText, label: "Docs" },
];

interface MobileScheduleViewProps {
  projectId: string;
  projectStartDate: Date | null | undefined;
  projectEndDate: Date | null | undefined;
}

// Mobile-optimized schedule view — Tasks / Notes / Media / Docs tabs.
// Renders inside ProjectDetailView's Outlet, so the project identity header,
// back button, mobile section sheet, and FieldQuickActionBar come from the
// parent shell. This component only owns the tab bar + tab content.
//
// The active tab is URL-driven via ?tab= (matches the /field-schedule legacy
// deep-link pattern from Rule 10, so mention notifications still land on the
// Notes tab after the redirect).
export function MobileScheduleView({ projectId, projectStartDate, projectEndDate }: MobileScheduleViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const activeTab: FieldTab = (["tasks", "notes", "media", "docs"].includes(urlTab ?? "")
    ? (urlTab as FieldTab)
    : "tasks");

  const setActiveTab = (tab: FieldTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "tasks") next.delete("tab");
        else next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  };

  const {
    tasks,
    isLoading,
    error,
    updateTask,
  } = useScheduleTasks({
    projectId,
    projectStartDate: projectStartDate ?? new Date(),
    projectEndDate: projectEndDate ?? new Date(),
  });

  const notesCount = useQuery({
    queryKey: ["project-notes-count", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_notes")
        .select("id")
        .eq("project_id", projectId);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!projectId,
  });

  // Counts both real media rows AND image/video note attachments, matching
  // what getProjectMediaList returns for the grid so the badge stays honest.
  const mediaCount = useQuery({
    queryKey: ["project-media-count", projectId],
    queryFn: async () => {
      const [mediaRes, notesRes] = await Promise.all([
        supabase.from("project_media").select("id").eq("project_id", projectId),
        supabase
          .from("project_notes")
          .select("id")
          .eq("project_id", projectId)
          .not("attachment_url", "is", null)
          .in("attachment_type", ["image", "video"]),
      ]);
      if (mediaRes.error) throw mediaRes.error;
      if (notesRes.error) throw notesRes.error;
      return (mediaRes.data?.length || 0) + (notesRes.data?.length || 0);
    },
    enabled: !!projectId,
  });

  // Includes "other" so field-attached PDFs/docs (via FieldQuickActionBar's
  // Attach button) are visible alongside the reference docs (drawing, permit,
  // license, specification) field workers already see.
  const docsCount = useQuery({
    queryKey: ["project-docs-count", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("id")
        .eq("project_id", projectId)
        .in("document_type", ["drawing", "permit", "license", "specification", "other"]);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!projectId,
  });

  const badgeCounts: Record<FieldTab, number | undefined> = {
    tasks: tasks.length || undefined,
    notes: notesCount.data || undefined,
    media: mediaCount.data || undefined,
    docs: docsCount.data || undefined,
  };

  const handleTaskUpdate = async (task: ScheduleTask) => {
    try {
      await updateTask(task);
      toast.success("Task updated");
    } catch (err) {
      console.error("Error updating task:", err);
      toast.error("Failed to update task");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-4 bg-muted/40 rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = badgeCounts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all min-h-[44px]",
                isActive
                  ? "bg-background shadow-sm text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{tab.label}</span>
              {count !== undefined && count > 0 && (
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className="h-4 min-w-[16px] px-1 text-[9px] font-medium"
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <Card className="p-4 mb-4 border-destructive">
          <p className="text-sm text-destructive">{error.message || "An error occurred"}</p>
        </Card>
      )}

      {activeTab === "tasks" &&
        (isLoading && !tasks.length ? (
          <Card className="p-8">
            <BrandedLoader size="md" message="Loading schedule..." />
          </Card>
        ) : (
          <FieldScheduleTable tasks={tasks} projectId={projectId} onTaskUpdate={handleTaskUpdate} />
        ))}

      {activeTab === "notes" && <ProjectNotesTimeline projectId={projectId} inSheet hideComposer />}

      {activeTab === "media" && <FieldMediaGallery projectId={projectId} />}

      {activeTab === "docs" && <FieldDocumentsList projectId={projectId} />}
    </div>
  );
}
