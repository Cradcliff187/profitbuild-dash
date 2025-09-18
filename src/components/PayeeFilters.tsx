import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";
import { PayeeType } from "@/types/payee";

interface PayeeFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  servicesFilter: string;
  onServicesFilterChange: (filter: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const PayeeFilters = ({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  servicesFilter,
  onServicesFilterChange,
  onClearFilters,
  hasActiveFilters
}: PayeeFiltersProps) => {
  const getPayeeTypeLabel = (type: PayeeType) => {
    switch (type) {
      case PayeeType.SUBCONTRACTOR: return "Subcontractor";
      case PayeeType.MATERIAL_SUPPLIER: return "Material Supplier";
      case PayeeType.EQUIPMENT_RENTAL: return "Equipment Rental";
      case PayeeType.INTERNAL_LABOR: return "Internal Labor";
      case PayeeType.MANAGEMENT: return "Management";
      case PayeeType.PERMIT_AUTHORITY: return "Permit Authority";
      case PayeeType.OTHER: return "Other";
      default: return type;
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">Active</Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payees..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Type Filter */}
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.values(PayeeType).map((type) => (
              <SelectItem key={type} value={type}>
                {getPayeeTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Services Filter */}
        <Select value={servicesFilter} onValueChange={onServicesFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="labor">Provides Labor</SelectItem>
            <SelectItem value="materials">Provides Materials</SelectItem>
            <SelectItem value="1099">Requires 1099</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="permit_issuer">Permit Issuer</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};