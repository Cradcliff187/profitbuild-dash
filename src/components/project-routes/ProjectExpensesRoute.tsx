import { useProjectContext } from "@/components/ProjectDetailView";
import { ExpensesList } from "@/components/ExpensesList";

export function ProjectExpensesRoute() {
  const { project, expenses, loadProjectData } = useProjectContext();

  return (
    <ExpensesList
      expenses={expenses}
      projectId={project.id}
      onEdit={() => loadProjectData()}
      onDelete={() => loadProjectData()}
      onRefresh={loadProjectData}
    />
  );
}

