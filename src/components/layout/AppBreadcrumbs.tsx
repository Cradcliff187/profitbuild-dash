import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppBreadcrumbItem {
  label: string;
  href?: string;
}

interface AppBreadcrumbsProps {
  items: AppBreadcrumbItem[];
  className?: string;
}

// Renders a compact horizontal breadcrumb row. Hidden when fewer than 2 items
// (a single crumb is just a page title — PageHeader already handles that).
// The terminal crumb is always plain text with aria-current="page"; earlier
// crumbs render as Links when `href` is provided, otherwise as plain spans.
export function AppBreadcrumbs({ items, className }: AppBreadcrumbsProps) {
  if (!items || items.length < 2) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("w-full max-w-full overflow-hidden", className)}>
      <ol className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs sm:text-sm text-muted-foreground scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Fragment key={`${item.label}-${idx}`}>
              <li className={cn("flex items-center min-w-0", isLast && "text-foreground font-medium")}>
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className="truncate max-w-[160px] sm:max-w-[240px] hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="truncate max-w-[200px] sm:max-w-[320px]"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="flex items-center text-muted-foreground/60">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
