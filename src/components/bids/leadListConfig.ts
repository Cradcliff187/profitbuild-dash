/**
 * Leads list configuration shared by BranchBids.tsx (page), BidsTableView
 * (table + mobile cards) and BidFilters (EntityFilterBar adapter). ONE copy —
 * Gotcha #50 is about parents keeping their own hardcoded column lists.
 */

export interface BidColumnDefinition {
  key: string;
  label: string;
  required: boolean;
  sortable?: boolean;
}

export const BID_COLUMN_DEFINITIONS: BidColumnDefinition[] = [
  { key: "name", label: "Lead Name", required: true, sortable: true },
  { key: "stage", label: "Stage", required: false, sortable: true },
  { key: "source", label: "Source", required: false, sortable: true },
  { key: "client_name", label: "Client", required: false, sortable: true },
  { key: "created_at", label: "Created", required: false, sortable: true },
  { key: "project", label: "Linked Jobs", required: false, sortable: false },
  { key: "created_by", label: "Created By", required: false, sortable: true },
  { key: "actions", label: "Actions", required: true, sortable: false },
];

/** Closed leads are hidden by default — "open" is the resting state, not "all". */
export type LeadOpenFilter = "open" | "closed" | "all";

export interface BidSearchFilters {
  searchText: string;
  clientName: string[];
  source: string[];
  stage: string[];
  /** open (default) · closed · all */
  openState: LeadOpenFilter;
  hasProject: boolean | null; // null = all, true = linked to a job, false = no job
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

export const DEFAULT_BID_FILTERS: BidSearchFilters = {
  searchText: "",
  clientName: [],
  source: [],
  stage: [],
  openState: "open",
  hasProject: null,
  dateRange: { start: null, end: null },
};
