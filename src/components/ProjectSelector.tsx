import { useState } from "react";
import { Check, ChevronsUpDown, FolderOpen } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Estimate } from "@/types/estimate";

interface ProjectSelectorProps {
  estimates: Estimate[];
  selectedEstimate?: Estimate;
  onSelect: (estimate: Estimate) => void;
  placeholder?: string;
}

export const ProjectSelector = ({
  estimates,
  selectedEstimate,
  onSelect,
  placeholder = "Select a project..."
}: ProjectSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center">
            <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
            {selectedEstimate ? (
              <div className="flex flex-col items-start">
                <span className="font-medium">{selectedEstimate.project_name}</span>
                <span className="text-sm text-muted-foreground">
                  {selectedEstimate.estimate_number}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandEmpty>No projects found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {estimates.map((estimate) => (
                <CommandItem
                  key={estimate.id}
                  value={`${estimate.project_name} ${estimate.estimate_number}`}
                  onSelect={() => {
                    onSelect(estimate);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedEstimate?.id === estimate.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{estimate.project_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {estimate.estimate_number} • ${estimate.total_amount.toFixed(2)}
                    </span>
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