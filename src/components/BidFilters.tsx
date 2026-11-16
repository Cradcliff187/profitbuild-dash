import React from "react";
import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues } from "@/components/filters/filterTypes";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
} from "@/types/bid";

import { DEFAULT_BID_FILTERS, LEAD_ATTENTION_FILTER_OPTIONS, type BidSearchFilters } from "@/components/bids/leadListConfig";

export type { BidSearchFilters, LeadOpenFilter } from "@/components/bids/leadListConfig";

interface BidFiltersProps {
  filters: BidSearchFilters;
  onFiltersChange: (filters: BidSearchFilters) => void;
  resultCount?: number;
  leftActions?: React.ReactNode;
  actions?: React.ReactNode;
  clients: Array<{ id: string; client_name: string; }>;
  owners?: Array<{ user_id: string; display_name: string }>;
}

export const BidFilters = ({
  filters,
  onFiltersChange,
  resultCount,
  leftActions,
  actions,
  clients,
  owners = [],
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
      key: "openState",
      label: "Open / closed",
      allLabel: "Open leads",
      options: [
        { value: "closed", label: "Closed leads" },
        { value: "all", label: "Open + closed" },
      ],
    },
    {
      kind: "multiSelect",
      key: "attention",
      label: "Needs",
      options: LEAD_ATTENTION_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
    {
      kind: "multiSelect",
      key: "stage",
      label: "Stage",
      options: LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABELS[s] })),
    },
    {
      kind: "multiSelect",
      key: "owner",
      label: "Owner",
      options: owners.map((o) => ({ value: o.user_id, label: o.display_name })),
    },
    {
      kind: "multiSelect",
      key: "source",
      label: "Source",
      options: LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABELS[s] })),
    },
    {
      kind: "select",
      key: "hasProject",
      label: "Job link",
      allLabel: "All",
      options: [
        { value: "true", label: "Linked to a job" },
        { value: "false", label: "No job yet" },
      ],
    },
    { kind: "dateRange", key: "dateRange", label: "Date" },
  ];

  // The bar treats null as "unset / All". Our resting state is "open", so map
  // open → null (no chip) and closed/all → the explicit value (chip shown).
  const valuesForBar: FilterValues = {
    ...filters,
    openState: filters.openState === "open" ? null : filters.openState,
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
    if ("openState" in next) {
      next.openState =
        next.openState === "closed" || next.openState === "all" ? next.openState : "open";
    }
    onFiltersChange({ ...filters, ...next } as BidSearchFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({ ...DEFAULT_BID_FILTERS });
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
