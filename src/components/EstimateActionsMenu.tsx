import React from "react";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  FilePlus,
  DollarSign
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { EstimateStatus } from "@/types/estimate";
import { cn } from "@/lib/utils";

type EstimateWithQuotes = {
  id: string;
  estimate_number: string;
  status: EstimateStatus;
  project_id: string;
  lineItems?: any[];
  total_amount: number;
};

interface EstimateActionsMenuProps {
  estimate: EstimateWithQuotes;
  onView: (estimate: EstimateWithQuotes) => void;
  onEdit: (estimate: EstimateWithQuotes) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export const EstimateActionsMenu = ({
  estimate,
  onView,
  onEdit,
  onDelete,
  className
}: EstimateActionsMenuProps) => {
  const navigate = useNavigate();

  // Blank new estimate scoped to this estimate's project — no source copy,
  // no version lineage. Matches the canonical "Create Estimate" empty-state
  // button in ProjectEstimatesView which also routes here without a source.
  const newEstimateForProject = () => {
    navigate(`/projects/${estimate.project_id}/estimates/new`);
  };

  // Route to the new-estimate form with source preloaded. EstimateForm's
  // auto-copy effect calls handleCopyFromChange locally (in-memory only)
  // so nothing persists until the user clicks Save. Previous implementation
  // eagerly inserted via the create_estimate_version RPC, which left an
  // orphan draft in the DB whenever the user cancelled.
  const duplicateEstimate = () => {
    navigate(`/projects/${estimate.project_id}/estimates/new?sourceEstimateId=${estimate.id}`);
  };

  const createQuote = () => {
    // Navigate to quotes page with estimate and project pre-selected
    // Include returnUrl to go back to estimates page
    const returnUrl = encodeURIComponent('/estimates');
    window.location.href = `/quotes?projectId=${estimate.project_id}&estimateId=${estimate.id}&returnUrl=${returnUrl}`;
  };

  const hasLineItems = estimate.lineItems && estimate.lineItems.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 hover:bg-muted/50",
            className
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {estimate.estimate_number}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* View & Edit Actions */}
        <DropdownMenuItem onClick={() => onView(estimate)}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onEdit(estimate)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Estimate
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={createQuote}
          disabled={!hasLineItems}
          className={cn(!hasLineItems && "opacity-50")}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Create Quote
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Versioning & Duplication Actions */}
        <DropdownMenuItem onClick={duplicateEstimate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate Estimate
        </DropdownMenuItem>

        <DropdownMenuItem onClick={newEstimateForProject}>
          <FilePlus className="h-4 w-4 mr-2" />
          New Estimate for Project
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        {/* Danger Zone */}
        <DropdownMenuItem 
          onClick={() => onDelete(estimate.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Estimate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};