import { ChevronRight, StickyNote } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProjectNotesTimeline } from "@/components/ProjectNotesTimeline";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NotesSheetTriggerProps {
  projectId: string;
  projectName?: string;
}

export function NotesSheetTrigger({ projectId, projectName }: NotesSheetTriggerProps) {
  const { data: notes } = useQuery({
    queryKey: ["project-notes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_notes")
        .select("id")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
  });

  const noteCount = notes?.length || 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="w-full h-12 px-3 rounded-lg border-2 border-primary/30 bg-gradient-to-r from-primary/20 via-primary/12 to-primary/5 hover:from-primary/25 hover:via-primary/17 hover:to-primary/8 active:from-primary/30 active:via-primary/20 active:to-primary/10 shadow-sm transition-all flex items-center justify-between group">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/20 rounded-md p-1.5">
              <StickyNote className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Project Notes</span>
            <span className="text-xs font-medium text-primary bg-primary/15 px-2 py-0.5 rounded-full">
              {noteCount}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </SheetTrigger>
      
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-2xl p-0 flex flex-col"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className="text-left">
            {projectName ? `${projectName} - Notes` : 'Project Notes'}
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden px-4 py-3">
          <ProjectNotesTimeline projectId={projectId} inSheet />
        </div>
      </SheetContent>
    </Sheet>
  );
}
