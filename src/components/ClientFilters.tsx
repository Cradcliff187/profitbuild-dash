import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { ClientType, CLIENT_TYPES } from "@/types/client";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";

interface ClientFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: ClientType | "all";
  onTypeFilterChange: (value: ClientType | "all") => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusFilterChange: (value: "all" | "active" | "inactive") => void;
  resultCount?: number;
}

export const ClientFilters = ({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  resultCount,
}: ClientFiltersProps) => {
  const hasActiveFilters = !!searchTerm || typeFilter !== "all" || statusFilter !== "all";

  const handleClearFilters = () => {
    onSearchChange("");
    onTypeFilterChange("all");
    onStatusFilterChange("all");
  };

  return (
    <CollapsibleFilterSection
      title="Filter Clients"
      hasActiveFilters={hasActiveFilters}
      onClearFilters={handleClearFilters}
      resultCount={resultCount}
      defaultExpanded={hasActiveFilters}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CLIENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CollapsibleFilterSection>
  );
};