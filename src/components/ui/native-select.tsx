import * as React from "react";
import { cn } from "@/lib/utils";

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    return (
      <select
        ref={ref}
        className={cn(
          "h-8 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs",
          "focus:outline-none focus:border-foreground/40 focus:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&>option]:bg-background [&>option]:text-foreground",
          className
        )}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
