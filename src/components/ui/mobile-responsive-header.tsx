import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeaderAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive";
  showOnMobile?: boolean; // Always show this action on mobile (not in overflow)
}

interface MobileResponsiveHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: HeaderAction[];
  primaryAction?: HeaderAction; // Always visible, even on mobile
  className?: string;
  maxVisibleActions?: number; // Number of actions to show before overflow (desktop)
}

/**
 * Universal mobile-first header component that prevents overflow issues.
 * - Automatically handles action button overflow on mobile
 * - Ensures titles truncate properly
 * - Enforces minimum 44px touch targets on mobile
 * - Never causes horizontal scrolling
 */
export function MobileResponsiveHeader({
  title,
  subtitle,
  actions = [],
  primaryAction,
  className,
  maxVisibleActions = 2,
}: MobileResponsiveHeaderProps) {
  // Separate mobile-visible actions from overflow actions
  const mobileVisibleActions = actions.filter((a) => a.showOnMobile);
  const overflowActions = actions.filter((a) => !a.showOnMobile);

  return (
    <div className={cn("mobile-container", className)}>
      <div className="flex items-start justify-between gap-3 min-w-0">
        {/* Title section - allows truncation */}
        <div className="min-w-0 flex-1">
          <div className="mobile-text-safe font-semibold text-lg sm:text-xl truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>

        {/* Actions section - responsive overflow */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Primary action - always visible */}
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              variant={primaryAction.variant || "default"}
              size="sm"
              className="min-h-[44px] sm:min-h-0"
            >
              {primaryAction.icon}
              <span className="ml-1.5">{primaryAction.label}</span>
            </Button>
          )}

          {/* Mobile: Show only marked actions + overflow menu */}
          <div className="flex items-center gap-2 md:hidden">
            {mobileVisibleActions.map((action, idx) => (
              <Button
                key={idx}
                onClick={action.onClick}
                variant={action.variant || "outline"}
                size="sm"
                className="min-h-[44px]"
              >
                {action.icon}
                {action.label && <span className="ml-1.5">{action.label}</span>}
              </Button>
            ))}

            {overflowActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] px-2"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {overflowActions.map((action, idx) => (
                    <DropdownMenuItem
                      key={idx}
                      onClick={action.onClick}
                      className="min-h-[44px] cursor-pointer"
                    >
                      {action.icon && <span className="mr-2">{action.icon}</span>}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Desktop: Show configured number of actions + overflow if needed */}
          <div className="hidden md:flex items-center gap-2">
            {actions.slice(0, maxVisibleActions).map((action, idx) => (
              <Button
                key={idx}
                onClick={action.onClick}
                variant={action.variant || "outline"}
                size="sm"
              >
                {action.icon}
                {action.label && <span className="ml-1.5">{action.label}</span>}
              </Button>
            ))}

            {actions.length > maxVisibleActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {actions.slice(maxVisibleActions).map((action, idx) => (
                    <DropdownMenuItem
                      key={idx}
                      onClick={action.onClick}
                      className="cursor-pointer"
                    >
                      {action.icon && <span className="mr-2">{action.icon}</span>}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
