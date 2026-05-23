import * as React from "react";
import { Search, X } from "lucide-react";
import { EmptyState, EmptyStateProps } from "./empty-state";

export interface NoResultsStateProps extends Omit<EmptyStateProps, "icon" | "title"> {
  /** Defaults to "No results match your filters". */
  title?: string;
  /** When provided, renders a "Clear filters" secondary action. */
  onClearFilters?: () => void;
}

/**
 * Thin wrapper around EmptyState for the "filtered to zero results" case.
 * Visually identical to EmptyState but uses the Search icon and a
 * standardized title + optional "Clear filters" affordance.
 */
export const NoResultsState = React.forwardRef<HTMLDivElement, NoResultsStateProps>(
  ({ title = "No results match your filters", description = "Try adjusting your search or filter criteria.", onClearFilters, secondaryAction, ...rest }, ref) => {
    const clearAction = onClearFilters
      ? { label: "Clear filters", onClick: onClearFilters, icon: X, variant: "ghost" as const }
      : undefined;
    return (
      <EmptyState
        ref={ref}
        icon={Search}
        title={title}
        description={description}
        secondaryAction={secondaryAction ?? clearAction}
        {...rest}
      />
    );
  },
);
NoResultsState.displayName = "NoResultsState";
