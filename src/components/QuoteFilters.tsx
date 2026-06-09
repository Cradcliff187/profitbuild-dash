import { EntityFilterBar } from "@/components/filters/EntityFilterBar";
import type { FilterFieldDef, FilterValues } from "@/components/filters/filterTypes";

export interface QuoteSearchFilters {
  searchText: string;
  status: string[];
  payeeName: string[];
  clientName: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  amountRange: {
    min: number | null;
    max: number | null;
  };
}

interface QuoteFiltersProps {
  filters: QuoteSearchFilters;
  onFiltersChange: (filters: QuoteSearchFilters) => void;
  resultCount?: number;
  clients: Array<{ id: string; client_name: string; }>;
  payees: Array<{ id: string; payee_name: string; }>;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' }
];

export const QuoteFilters = ({
  filters,
  onFiltersChange,
  resultCount,
  clients,
  payees
}: QuoteFiltersProps) => {
  const fields: FilterFieldDef[] = [
    {
      kind: "search",
      key: "searchText",
      placeholder: "Search quotes, projects, payees, clients...",
    },
    { kind: "multiSelect", key: "status", label: "Status", options: STATUS_OPTIONS },
    {
      kind: "multiSelect",
      key: "payeeName",
      label: "Payee",
      searchable: true,
      searchPlaceholder: "Search payees...",
      options: payees.map((p) => ({ value: p.payee_name, label: p.payee_name })),
    },
    {
      kind: "multiSelect",
      key: "clientName",
      label: "Client",
      searchable: true,
      searchPlaceholder: "Search clients...",
      options: clients.map((c) => ({ value: c.client_name, label: c.client_name })),
    },
    { kind: "dateRange", key: "dateRange", label: "Date" },
    { kind: "numberRange", key: "amountRange", label: "Amount", prefix: "$" },
  ];

  const handleChange = (patch: FilterValues) => {
    onFiltersChange({ ...filters, ...patch } as QuoteSearchFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({
      searchText: "",
      status: [],
      payeeName: [],
      clientName: [],
      dateRange: { start: null, end: null },
      amountRange: { min: null, max: null },
    });
  };

  return (
    <EntityFilterBar
      entityName="Quotes"
      fields={fields}
      values={filters as unknown as FilterValues}
      onChange={handleChange}
      onClearAll={handleClearAll}
      resultCount={resultCount}
    />
  );
};
