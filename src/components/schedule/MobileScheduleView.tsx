import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Clock,
  FileText,
  Package,
  StickyNote,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useScheduleTasks } from "@/components/schedule/hooks/useScheduleTasks";
import { FieldScheduleTable } from "@/components/schedule/FieldScheduleTable";
import { FieldMediaGallery } from "@/components/schedule/FieldMediaGallery";
import { FieldDocumentsList } from "@/components/schedule/FieldDocumentsList";
import { ProjectNotesTimeline } from "@/components/ProjectNotesTimeline";
import { ProjectMaterialsList } from "@/components/materials/ProjectMaterialsList";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateForDB, parseDateOnly } from "@/utils/dateUtils";
import {
  formatStartTime12h,
  useProjectDayAssignment,
} from "@/components/today/todayData";
import { ScheduleTask } from "@/types/schedule";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Project field view — the "what am I doing here?" screen (`/projects/:id/schedule`
 * on mobile, and at every width for pure field workers).
 *
 * Shape (Jul 2026): a HUB plus drill-down sub-pages. It replaced a five-tab
 * strip that was a second tab bar nested inside the app's `FieldTabBar` — two
 * identical interaction patterns 500px apart, in different visual languages.
 * At 390px the strip also scrolled horizontally, which parked Materials off the
 * right edge with no affordance: a shipped feature that was undiscoverable on
 * the exact device it was built for.
 *
 * The hub follows the Today home's rules (Rule 35): the hero answers the
 * question, payload beats counts, and there is ONE navigation layer per screen.
 * Verbs live in the `FieldQuickActionBar` (Note / Camera / Attach) mounted by
 * ProjectDetailView — this surface is reference + navigation only.
 *
 *   hub          → "Today here" dispatch note · tasks · drill-down rows
 *   sub-page     → one section, full viewport, with a back row
 *
 * URL contract is UNCHANGED — `?tab=` still selects the section, so mention
 * notifications deep-linking to `?tab=notes` (Rule 18 / the legacy
 * `/field-schedule/:id` redirect) land exactly where they always did. The
 * param now picks a sub-page instead of a tab; absent (or the legacy
 * `?tab=tasks`) means the hub, where tasks live inline.
 *
 * House rules shared with Today (Gotchas #53/#54/#55/#56/#63): no realtime,
 * user from `useAuth()` context — never `supabase.auth.getUser()` — plain
 * `useQuery`, errors thrown.
 */

type SubPage = "notes" | "media" | "docs" | "materials";

const SUB_PAGES: { id: SubPage; icon: React.ElementType; label: string; blurb: string }[] = [
  { id: "media", icon: Camera, label: "Photos & video", blurb: "Site progress and issues" },
  { id: "docs", icon: FileText, label: "Drawings & docs", blurb: "Plans, permits, specs" },
  { id: "materials", icon: Package, label: "Materials", blurb: "Deliveries and long-lead items" },
  { id: "notes", icon: StickyNote, label: "Notes", blurb: "Messages about this job" },
];

interface MobileScheduleViewProps {
  projectId: string;
  projectStartDate: Date | null | undefined;
  projectEndDate: Date | null | undefined;
}

export function MobileScheduleView({ projectId, projectStartDate, projectEndDate }: MobileScheduleViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const urlTab = searchParams.get("tab");
  // Anything that isn't a known sub-page — including the legacy "tasks" value,
  // which now lives on the hub — resolves to the hub.
  const subPage: SubPage | null = SUB_PAGES.some((p) => p.id === urlTab)
    ? (urlTab as SubPage)
    : null;

  const openSubPage = (id: SubPage) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", id);
        return next;
      },
      // Push (not replace) so the device Back gesture returns to the hub —
      // matching the back row and the platform expectation for a drill-down.
      { replace: false }
    );
  };

  const closeSubPage = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("tab");
        return next;
      },
      { replace: false }
    );
  };

  const {
    tasks,
    isLoading,
    error,
    updateTask,
    loadTasks,
  } = useScheduleTasks({
    projectId,
    projectStartDate: projectStartDate ?? new Date(),
    projectEndDate: projectEndDate ?? new Date(),
  });

  // Today's dispatch instruction for THIS project, if this worker is on it.
  // Recomputed each render so a focus refetch after midnight rolls forward.
  const todayISO = formatDateForDB(new Date());
  // Anchors the Tasks section's RELATIVE groupings — "Today / Active" and
  // "This Week" only mean something against a stated date, and this view can
  // sit open on a phone in a truck for hours before a focus refetch.
  const friendlyDate = parseDateOnly(todayISO).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const assignmentQuery = useProjectDayAssignment(user?.id, projectId, todayISO);
  const assignment = assignmentQuery.data ?? null;
  const assignmentTime = assignment ? formatStartTime12h(assignment.start_time) : null;

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
  // what getProjectMediaList returns for the grid so the count stays honest.
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

  const { materials } = useProjectMaterials(projectId);

  const counts: Record<SubPage, number | undefined> = {
    notes: notesCount.data,
    media: mediaCount.data,
    docs: docsCount.data,
    materials: materials.length || undefined,
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

  // --- Sub-page: one section, full viewport ---
  if (subPage) {
    const meta = SUB_PAGES.find((p) => p.id === subPage)!;
    return (
      <div className="mx-auto max-w-2xl md:max-w-3xl lg:max-w-5xl">
        <div className="flex items-center gap-1 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 -ml-2"
            onClick={closeSubPage}
            aria-label="Back to project"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">{meta.label}</h2>
        </div>

        {subPage === "media" && <FieldMediaGallery projectId={projectId} />}
        {subPage === "docs" && <FieldDocumentsList projectId={projectId} />}
        {subPage === "materials" && <ProjectMaterialsList projectId={projectId} />}
        {subPage === "notes" && (
          <ProjectNotesTimeline projectId={projectId} inSheet hideComposer />
        )}
      </div>
    );
  }

  // --- Hub ---
  // Layout mirrors the Today home exactly (Rule 35's iPad-first directive):
  // phones stack, iPad portrait (md:) widens, iPad landscape / desktop (lg:)
  // splits into main + rail. Field-only users reach this at EVERY width
  // (ProjectScheduleRoute branches on isMobile || isFieldWorkerOnly), so
  // without this it was a full-bleed phone column stretched across 1024px.
  // Tailwind breakpoints only — never useIsMobile() (it breaks at 768 and
  // buckets iPads as desktop).
  return (
    <div className="mx-auto max-w-2xl md:max-w-3xl lg:max-w-5xl">
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
        {/* Main column: the dispatch note + the work */}
        <div className="space-y-4 lg:col-span-2">
          {/* Hero — the dispatcher's instruction, carried from Today to the
              site. Rendered only when this worker is actually dispatched here
              today; otherwise the tasks below are the answer and an empty
              state would be pure noise (an admin browsing a project never has
              an assignment). Note treatment matches AssignmentHeroCard and
              AssignmentDetail so the same content wears the same chrome on all
              three screens. */}
          {assignment && (
            <div className="rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden">
              {/* The WHOLE hero is one nav button to `/my-day/:assignmentId`.
                  Rule 35: everything representing an assignment routes to the
                  canonical detail screen — it's the only place a worker gets
                  the date, Call owner, and the untruncated note for ANY date.
                  Structure mirrors AssignmentHeroCard so the same object
                  behaves identically on Today and on the project. */}
              <button
                type="button"
                onClick={() => navigate(`/my-day/${assignment.id}`)}
                className="w-full text-left p-4 hover:bg-accent/50 active:bg-accent transition-colors min-h-[44px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Today here
                  </span>
                  {assignmentTime && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold shrink-0">
                      <Clock className="h-3 w-3" />
                      {assignmentTime}
                    </span>
                  )}
                </div>

                {/* Never truncate — may carry gate codes. Line breaks preserved. */}
                {assignment.task_note ? (
                  <div className="mt-3 flex items-start gap-2">
                    <div className="flex-1 min-w-0 rounded-lg border-l-2 border-primary bg-primary/5 px-3 py-2">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {assignment.task_note}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-2" />
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="flex-1 text-sm text-muted-foreground">
                      You're on this site today. No note from the office.
                    </p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Tasks — inline, because they're the reason this screen exists. */}
          <section>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Tasks
              </h2>
              <span className="text-xs text-muted-foreground shrink-0">
                {friendlyDate}
              </span>
            </div>
            {error ? (
              <Card className="p-6 text-center">
                <p className="text-sm font-medium mb-1">Couldn't load the schedule</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Check your connection and try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => loadTasks()}
                >
                  Try again
                </Button>
              </Card>
            ) : isLoading && !tasks.length ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : (
              <FieldScheduleTable tasks={tasks} projectId={projectId} onTaskUpdate={handleTaskUpdate} />
            )}
          </section>
        </div>

        {/* Rail on lg; stacked below tasks on phones/iPad portrait.
            Counts are context on the row, not a nav badge — and each section
            gets the full viewport rather than being nested inside this scroll
            container (Gotcha #40's nested-scroll class). */}
        <div className="lg:col-span-1">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              On this job
            </h2>
            <div className="rounded-xl border bg-card overflow-hidden">
              {SUB_PAGES.map((p, i) => {
                const Icon = p.icon;
                const count = counts[p.id];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openSubPage(p.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left",
                      "hover:bg-accent/50 active:bg-accent transition-colors",
                      i > 0 && "border-t border-border"
                    )}
                  >
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium truncate">{p.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.blurb}</div>
                    </div>
                    {count !== undefined && count > 0 && (
                      <span className="text-sm font-semibold text-muted-foreground tabular-nums shrink-0">
                        {count}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
