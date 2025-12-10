import { useProjectContext } from "@/components/ProjectDetailView";
import { ChangeOrdersList } from "@/components/ChangeOrdersList";
import type { Database } from "@/integrations/supabase/types";

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

export function ProjectChangesRoute() {
  const { project, onEditChangeOrder, onCreateChangeOrder } = useProjectContext();

  return (
    <ChangeOrdersList
      projectId={project.id}
      projectContingencyRemaining={project.contingency_remaining || 0}
      onEdit={onEditChangeOrder}
      onCreateNew={onCreateChangeOrder}
    />
  );
}

