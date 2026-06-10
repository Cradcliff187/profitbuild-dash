import React from "react";
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues } from "@/components/filters/filterTypes";

export interface BidSearchFilters {
  searchText: string;
  clientName: string[];
  hasProject: boolean | null; // null = all, true = linked to project, false = no project
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface BidFiltersProps {
  filters: BidSearchFilters;
  onFiltersChange: (filters: BidSearchFilters) => void;
  resultCount?: number;
  leftActions?: React.ReactNode;
  actions?: React.ReactNode;
  clients: Array<{ id: string; client_name: string; }>;
}

export const BidFilters = ({
  filters,
  onFiltersChange,
  resultCount,
  leftActions,
  actions,
  clients
}: BidFiltersProps) => {
  const fields: FilterFieldDef[] = [
    {
      kind: "search",
      key: "searchText",
      placeholder: "Search leads, clients, descriptions...",
    },
    {
      kind: "multiSelect",
      key: "clientName",
      label: "Client",
      searchable: true,
      searchPlaceholder: "Search clients...",
      options: clients.map((c) => ({ value: c.client_name, label: c.client_name })),
    },
    {
      kind: "select",
      key: "hasProject",
      label: "Project Link",
      allLabel: "All",
      options: [
        { value: "true", label: "Linked to Project" },
        { value: "false", label: "No Project" },
      ],
    },
    { kind: "dateRange", key: "dateRange", label: "Date" },
  ];

  const valuesForBar: FilterValues = {
    ...filters,
    hasProject: filters.hasProject === null ? null : String(filters.hasProject),
  };

  const handleChange = (patch: FilterValues) => {
    const next = { ...patch } as Record<string, unknown>;
    if ("hasProject" in next) {
      next.hasProject =
        next.hasProject === null || next.hasProject === undefined
          ? null
          : next.hasProject === "true";
    }
    onFiltersChange({ ...filters, ...next } as BidSearchFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({
      searchText: "",
      clientName: [],
      hasProject: null,
      dateRange: { start: null, end: null },
    });
  };

  return (
    <EntityFilterBar
      entityName="Leads"
      fields={fields}
      values={valuesForBar}
      onChange={handleChange}
      onClearAll={handleClearAll}
      resultCount={resultCount}
      actions={
        (leftActions || actions) ? (
          <>
            {leftActions}
            {actions}
          </>
        ) : undefined
      }
    />
  );
};
