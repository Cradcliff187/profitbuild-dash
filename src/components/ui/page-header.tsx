import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  showAccent?: boolean;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
  children,
  showAccent = true,
}: PageHeaderProps) {
  const isMobile = useIsMobile();

  // On mobile: AppLayout header already shows the page title.
  // Only render the accent line and any children content.
  if (isMobile && !children) {
    return (
      <>
        {showAccent && (
          <div className="h-0.5 bg-gradient-to-r from-primary to-orange-400 mb-3" />
        )}
      </>
    );
  }

  if (isMobile && children) {
    return (
      <div className={cn("bg-white border-b border-slate-200 shadow-sm w-full max-w-full overflow-hidden mb-4", className)}>
        <div className="px-3 py-3">
          {children}
        </div>
        {showAccent && (
          <div className="h-0.5 bg-gradient-to-r from-primary to-orange-400" />
        )}
      </div>
    );
  }

  // Desktop: render everything as before (NO CHANGES to desktop behavior)
  return (
    <div className={cn("bg-white border-b border-slate-200 shadow-sm w-full max-w-full overflow-hidden mb-4 lg:mb-3", className)}>
      <div className="px-3 sm:px-6 lg:px-4 py-4 lg:py-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          {/* Left side: Icon + Title + Description */}
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">
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
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>

      {/* Orange accent line */}
      {showAccent && (
        <div className="h-0.5 bg-gradient-to-r from-primary to-orange-400" />
      )}
    </div>
  );
}

