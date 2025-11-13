import { cn } from "@/lib/utils";

export interface ProjectOptionProps {
  projectNumber?: string | null;
  projectName?: string | null;
  clientName?: string | null;
  meta?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export const formatProjectLabel = (
  projectNumber?: string | null,
  projectName?: string | null
) => {
  const number = projectNumber?.trim();
  const name = projectName?.trim();

  if (number && name) return `${number} - ${name}`;
  if (number) return number;
  if (name) return name;
  return "Unknown Project";
};

export function ProjectOption({
  projectNumber,
  projectName,
  clientName,
  meta,
  className,
  size = "md",
}: ProjectOptionProps) {
  const primary = formatProjectLabel(projectNumber, projectName);
  const primaryClasses = size === "sm" ? "text-xs font-medium" : "text-sm font-medium";
  const secondaryClasses = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className={cn("truncate", primaryClasses)}>{primary}</span>
      {clientName && (
        <span className={cn("truncate text-muted-foreground", secondaryClasses)}>
          {clientName}
        </span>
      )}
      {meta && (
        <span className={cn("truncate text-muted-foreground", secondaryClasses)}>
          {meta}
        </span>
      )}
    </div>
  );
}
