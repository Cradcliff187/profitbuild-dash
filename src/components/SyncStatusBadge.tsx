import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Clock, X, Minus, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

type SyncStatus = 'success' | 'failed' | 'pending' | null;

interface SyncStatusBadgeProps {
  status: SyncStatus;
  lastSyncedAt?: string | null;
  onMarkAsSynced?: () => void;
  onResetSync?: () => void;
  showActions?: boolean;
}

export function SyncStatusBadge({ 
  status, 
  lastSyncedAt, 
  onMarkAsSynced, 
  onResetSync,
  showActions = false 
}: SyncStatusBadgeProps) {
  const getBadgeContent = () => {
    switch (status) {
      case 'success':
        return {
          icon: <Check className="h-3 w-3" />,
          variant: "default" as const,
          text: "Synced"
        };
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3" />,
          variant: "secondary" as const,
          text: "Pending"
        };
      case 'failed':
        return {
          icon: <X className="h-3 w-3" />,
          variant: "destructive" as const,
          text: "Failed"
        };
      default:
        return {
          icon: <Minus className="h-3 w-3" />,
          variant: "outline" as const,
          text: "Not synced"
        };
    }
  };

  const getTooltipContent = () => {
    if (lastSyncedAt) {
      return `Last synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`;
    }
    return status ? "Sync in progress" : "Not synced with QuickBooks";
  };

  const { icon, variant, text } = getBadgeContent();

  const badge = (
    <Badge variant={variant} className="flex items-center gap-1 text-xs">
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </Badge>
  );

  if (showActions && (onMarkAsSynced || onResetSync)) {
    return (
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent>
              <p>{getTooltipContent()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onMarkAsSynced && (
              <DropdownMenuItem onClick={onMarkAsSynced}>
                Mark as Synced
              </DropdownMenuItem>
            )}
            {onResetSync && (
              <DropdownMenuItem onClick={onResetSync}>
                Reset Sync Status
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}