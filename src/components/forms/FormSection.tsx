import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** Render a divider above the section. Use on every section except the first. */
  withDivider?: boolean;
  className?: string;
}

/**
 * Shared section wrapper for project/work-order forms.
 *
 * Gives the "flat sections with dividers" layout a single source of truth so the
 * create form (ProjectFormSimple) and the edit form (ProjectEditForm) read
 * identically across desktop and mobile. Chromeless by design — the container
 * (page or sheet) owns the outer frame.
 */
export function FormSection({
  title,
  description,
  children,
  withDivider = false,
  className,
}: FormSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {withDivider && <Separator className="mb-4" />}
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground/80">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
