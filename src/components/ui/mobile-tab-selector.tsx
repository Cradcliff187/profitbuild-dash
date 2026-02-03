import * as React from "react";
import { LucideIcon, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface TabOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface MobileTabSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  options: TabOption[];
  className?: string;
}

export function MobileTabSelector({
  value,
  onValueChange,
  options,
  className,
}: MobileTabSelectorProps) {
  // Find the current tab to display its icon
  const currentTab = options.find((opt) => opt.value === value);
  const CurrentIcon = currentTab?.icon;

  return (
    <div
      className={cn(
        "border-2 border-slate-200 rounded-xl overflow-hidden",
        "hover:border-primary hover:shadow-md",
        "transition-all duration-200",
        className
      )}
    >
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-12 w-full border-0 bg-gradient-to-r from-white to-slate-50 hover:from-primary/5 hover:to-primary/10 text-sm font-medium">
          <div className="flex items-center gap-3 w-full">
            {CurrentIcon && (
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 transition-colors">
                <CurrentIcon className="h-4 w-4 text-primary" />
              </div>
            )}
            <span className="flex-1 text-left">{currentTab?.label}</span>
            <ChevronDown className="h-5 w-5 text-primary ml-auto flex-shrink-0 transition-transform duration-300" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
