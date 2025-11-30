import { MoreVertical, Star, Copy, Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportTemplate } from "@/hooks/useReportTemplates";

interface ReportActionsMenuProps {
  template: ReportTemplate;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onUse: (template: ReportTemplate) => void;
  onViewDetails?: (template: ReportTemplate) => void;
  onDuplicate?: (template: ReportTemplate) => void;
}

export function ReportActionsMenu({
  template,
  isFavorite,
  onToggleFavorite,
  onUse,
  onViewDetails,
  onDuplicate,
}: ReportActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onUse(template)}>
          <Play className="mr-2 h-4 w-4" />
          Use Template
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleFavorite}>
          <Star className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </DropdownMenuItem>
        {onViewDetails && (
          <DropdownMenuItem onClick={() => onViewDetails(template)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDuplicate(template)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

