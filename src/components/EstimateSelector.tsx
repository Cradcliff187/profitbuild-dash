/**
 * @file EstimateSelector.tsx
 * @description Dropdown selector for estimates matching app's selector patterns.
 * Used in QuoteForm for selecting which estimate to quote against.
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { Estimate } from "@/types/estimate";

interface EstimateSelectorProps {
  estimates: Estimate[];
  selectedEstimate?: Estimate;
  onSelect: (estimate: Estimate) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const EstimateSelector = ({
  estimates,
  selectedEstimate,
  onSelect,
  placeholder = "Select an estimate...",
  disabled = false
}: EstimateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (triggerRef.current) {
      setPopoverWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  const filteredEstimates = useMemo(() => {
    if (!searchQuery.trim()) return estimates;
    
    const query = searchQuery.toLowerCase();
    return estimates.filter(estimate =>
      estimate.project_name?.toLowerCase().includes(query) ||
      estimate.project_number?.toLowerCase().includes(query) ||
      estimate.client_name?.toLowerCase().includes(query) ||
      estimate.estimate_number?.toLowerCase().includes(query)
    );
  }, [estimates, searchQuery]);

  // Sort by estimate number descending (newest first)
  const sortedEstimates = useMemo(() => {
    return [...filteredEstimates].sort((a, b) => {
      const getNumber = (estNum: string) => {
        const match = estNum?.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return getNumber(b.estimate_number) - getNumber(a.estimate_number);
    });
  }, [filteredEstimates]);

  const handleSelect = (estimate: Estimate) => {
    onSelect(estimate);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-auto min-h-[2.5rem] py-2",
            !selectedEstimate && "text-muted-foreground"
          )}
        >
          {selectedEstimate ? (
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex items-center gap-2 text-left min-w-0">
                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {selectedEstimate.project_number ? `${selectedEstimate.project_number} - ${selectedEstimate.project_name}` : selectedEstimate.project_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedEstimate.estimate_number} • {selectedEstimate.client_name}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-sm">{formatCurrency(selectedEstimate.total_amount)}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedEstimate.lineItems?.length || 0} items
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0" 
        align="start"
        style={popoverWidth ? { width: `${popoverWidth}px` } : undefined}
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by project, client, or estimate number..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[500px]">
            <CommandEmpty>
              {estimates.length === 0 
                ? "No estimates available. Create an estimate first."
                : "No estimates match your search."
              }
            </CommandEmpty>
            <CommandGroup>
              {sortedEstimates.map((estimate) => (
                <CommandItem
                  key={estimate.id}
                  value={estimate.id}
                  onSelect={() => handleSelect(estimate)}
                  className="flex items-center justify-between py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        selectedEstimate?.id === estimate.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {estimate.project_number ? `${estimate.project_number} - ${estimate.project_name}` : estimate.project_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {estimate.client_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {estimate.estimate_number}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="font-mono">{formatCurrency(estimate.total_amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {estimate.lineItems?.length || 0} line items
                    </div>
                    <Badge 
                      variant={estimate.lineItems?.length > 0 ? "default" : "secondary"} 
                      className="text-xs mt-1"
                    >
                      {estimate.lineItems?.length > 0 ? "Ready" : "Empty"}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

