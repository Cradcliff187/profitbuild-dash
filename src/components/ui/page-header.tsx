import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, MoreVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Single action surfaced in the mobile overflow menu. Pass an array of these as
// `PageHeader.mobileActions` so desktop-only `actions` ReactNodes are not
// silently dropped on phones — closes Gotcha #38 by making the mobile contract
// explicit instead of leaving every page to invent its own workaround.
//
// `divider: true` renders a separator BEFORE the item (use to group destructive
// actions or QB sync flows away from the primary list).
export interface PageHeaderMobileAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
  divider?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Desktop-only action slot (Buttons, etc.). Hidden on mobile. */
  actions?: React.ReactNode;
  /**
   * Mobile-only overflow menu items. When provided, a kebab (`MoreVertical`)
   * button renders on mobile that opens a Radix DropdownMenu with these items.
   * If omitted while `actions` IS provided, dev mode logs a console.warn so
   * authors don't ship pages with silently-missing mobile actions.
   */
  mobileActions?: PageHeaderMobileAction[];
  className?: string;
  children?: React.ReactNode;
  showAccent?: boolean;
}

function MobileActionsMenu({ actions }: { actions: PageHeaderMobileAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 -my-1"
          aria-label="Page actions"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {actions.map((action, idx) => (
          <React.Fragment key={`${action.label}-${idx}`}>
            {action.divider && idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                if (!action.disabled) action.onClick();
              }}
              disabled={action.disabled}
              className={cn(
                "min-h-[44px] cursor-pointer",
                action.variant === "destructive" &&
                  "text-destructive focus:text-destructive"
              )}
            >
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  mobileActions,
  className,
  children,
  showAccent = true,
}: PageHeaderProps) {
  const isMobile = useIsMobile();
  const hasMobileActions = !!(mobileActions && mobileActions.length > 0);

  // Dev-mode warning when desktop actions exist but no mobile equivalent is
  // provided. Fires once per mount via useEffect so HMR + StrictMode don't spam.
  React.useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      isMobile &&
      actions &&
      !hasMobileActions &&
      !children
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[PageHeader] "${title}" has \`actions\` but no \`mobileActions\` — actions are not surfaced on mobile. ` +
          `Pass mobileActions={[{ label, icon, onClick }, ...]} to surface them in the overflow menu, or use a FAB pattern. ` +
          `See docs/design/DESIGN_CRITIQUE_2026-05.md (R1).`
      );
    }
  }, [isMobile, actions, hasMobileActions, children, title]);

  // ---------- MOBILE BRANCHES ----------

  if (isMobile) {
    // (a) No children, no mobile actions — original behavior, just the accent
    //     line (AppLayout's mobile header already shows the page title).
    if (!children && !hasMobileActions) {
      return showAccent ? (
        <div className="h-[3px] bg-gradient-to-r from-primary to-orange-400 mb-3" />
      ) : null;
    }

    // (b) No children, has mobile actions — slim row with the overflow menu
    //     pinned to the right, then the accent line. Keeps mobile header dense
    //     since AppLayout already owns the title.
    if (!children && hasMobileActions) {
      return (
        <>
          <div className="flex justify-end px-3 py-1 mb-1">
            <MobileActionsMenu actions={mobileActions!} />
          </div>
          {showAccent && (
            <div className="h-[3px] bg-gradient-to-r from-primary to-orange-400 mb-3" />
          )}
        </>
      );
    }

    // (c) Children present — wrap in the existing white card. Overflow menu
    //     (if provided) sits in the top-right of the card next to children.
    return (
      <div
        className={cn(
          "bg-white border-b border-slate-200 shadow-sm w-full max-w-full overflow-hidden mb-4",
          className
        )}
      >
        <div className="px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">{children}</div>
            {hasMobileActions && (
              <MobileActionsMenu actions={mobileActions!} />
            )}
          </div>
        </div>
        {showAccent && (
          <div className="h-[3px] bg-gradient-to-r from-primary to-orange-400" />
        )}
      </div>
    );
  }

  // ---------- DESKTOP (unchanged) ----------

  return (
    <div
      className={cn(
        "bg-white border-b border-slate-200 shadow-sm w-full max-w-full overflow-hidden mb-4 lg:mb-3",
        className
      )}
    >
      <div className="px-3 sm:px-6 lg:px-4 py-4 lg:py-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          {/* Left side: Icon + Title + Description */}
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Actions */}
          {actions && (
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Optional children for additional header content (filters, tabs, etc.) */}
        {children && <div className="mt-4">{children}</div>}
      </div>

      {/* Orange accent line */}
      {showAccent && (
        <div className="h-[3px] bg-gradient-to-r from-primary to-orange-400" />
      )}
    </div>
  );
}
