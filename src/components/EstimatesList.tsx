import { useIsMobile } from "@/hooks/use-mobile";
import { EstimatesTableView } from "./EstimatesTableView";
import { EstimatesCardView } from "./EstimatesCardView";
import type { Estimate } from "@/types/estimate";

interface EstimatesListProps {
  estimates: (Estimate & { quotes?: Array<{ id: string; total_amount: number; status: string }> })[];
  onEdit: (estimate: Estimate) => void;
  onDelete: (id: string) => void;
  onView: (estimate: Estimate) => void;
  onCreateNew: () => void;
}

/**
 * @deprecated Use EstimatesCardView or EstimatesTableView directly at the page level
 * This component is kept for backward compatibility
 */
export const EstimatesList = ({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesListProps) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <EstimatesCardView estimates={estimates} onEdit={onEdit} onDelete={onDelete} onView={onView} onCreateNew={onCreateNew} />;
  }
  
  return <EstimatesTableView estimates={estimates} onEdit={onEdit} onDelete={onDelete} onView={onView} onCreateNew={onCreateNew} />;
};