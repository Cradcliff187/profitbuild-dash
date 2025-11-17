import * as React from "react";
import { Calculator, Lock, Edit3, RefreshCw, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/ui/required-label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

// Base field wrapper component
interface BaseFieldProps {
  label: string;
  required?: boolean;
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
}

const BaseField = React.forwardRef<HTMLDivElement, BaseFieldProps>(
  ({ label, required, tooltip, className, children }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        {required ? (
          <RequiredLabel className="text-sm font-medium">{label}</RequiredLabel>
        ) : (
          <Label className="text-sm font-medium">{label}</Label>
        )}
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  )
);
BaseField.displayName = "BaseField";

// Editable Field - Regular input fields
interface EditableFieldProps extends React.ComponentPropsWithoutRef<typeof Input> {
  label: string;
  required?: boolean;
  tooltip?: string;
  error?: string;
  showIcon?: boolean;
}

const EditableField = React.forwardRef<React.ElementRef<typeof Input>, EditableFieldProps>(
  ({ label, required, tooltip, className, error, showIcon = true, ...props }, ref) => (
    <BaseField label={label} required={required} tooltip={tooltip}>
      <div className="relative">
        {showIcon && (
          <Edit3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        )}
        <Input
          ref={ref}
          className={cn(
            showIcon ? "pl-9" : "pl-3",
            "field-editable border-input bg-background",
            "focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "transition-all duration-200",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}
    </BaseField>
  )
);
EditableField.displayName = "EditableField";

// Read-Only Field - Display-only fields with locked appearance
interface ReadOnlyFieldProps {
  label: string;
  value: string | number;
  tooltip?: string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

const ReadOnlyField = React.forwardRef<HTMLDivElement, ReadOnlyFieldProps>(
  ({ label, value, tooltip, className, prefix, suffix }, ref) => (
    <BaseField label={label} tooltip={tooltip} className={className}>
      <div
        ref={ref}
        className={cn(
          "field-readonly flex items-center gap-2 px-3 py-2",
          "bg-muted/50 border border-dashed border-muted-foreground/30 rounded-md",
          "text-sm font-medium text-muted-foreground"
        )}
      >
        <Lock className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">
          {prefix}{value}{suffix}
        </span>
        <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
          Read-only
        </Badge>
      </div>
    </BaseField>
  )
);
ReadOnlyField.displayName = "ReadOnlyField";

// Calculated Field - Shows computed values with formula hints
interface CalculatedFieldProps {
  label: string;
  value: string | number;
  formula?: string;
  tooltip?: string;
  className?: string;
  prefix?: string;
  suffix?: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

const CalculatedField = React.forwardRef<HTMLDivElement, CalculatedFieldProps>(
  ({ label, value, formula, tooltip, className, prefix, suffix, variant = "default" }, ref) => {
    const variantStyles = {
      default: "bg-blue-50 border-blue-200 text-blue-900",
      success: "bg-green-50 border-green-200 text-green-900",
      warning: "bg-amber-50 border-amber-200 text-amber-900",
      destructive: "bg-red-50 border-red-200 text-red-900"
    };

    // Smart formatting: if value is a number and prefix is $, format as currency without adding prefix
    const displayValue = typeof value === 'number' && prefix === '$' 
      ? formatCurrency(value) 
      : `${prefix || ''}${value}${suffix || ''}`;

    return (
      <BaseField label={label} tooltip={tooltip || formula} className={className}>
        <div
          ref={ref}
          className={cn(
            "field-calculated flex items-center gap-2 px-3 py-2",
            "border rounded-md font-mono text-sm font-semibold",
            variantStyles[variant]
          )}
        >
          <Calculator className="h-3 w-3 flex-shrink-0" />
          <span className="truncate flex-1 min-w-0">
            {displayValue}
          </span>
          <Badge variant="secondary" className="text-xs ml-auto flex-shrink-0">
            Calculated
          </Badge>
        </div>
        {formula && (
          <p className="text-xs text-muted-foreground mt-1">
            Formula: {formula}
          </p>
        )}
      </BaseField>
    );
  }
);
CalculatedField.displayName = "CalculatedField";

// Auto-Generated Field - For fields like project numbers with regeneration capability
interface AutoGeneratedFieldProps {
  label: string;
  value: string;
  onRegenerate?: () => void;
  tooltip?: string;
  className?: string;
  regenerateLabel?: string;
}

const AutoGeneratedField = React.forwardRef<HTMLDivElement, AutoGeneratedFieldProps>(
  ({ label, value, onRegenerate, tooltip, className, regenerateLabel = "Regenerate" }, ref) => (
    <BaseField label={label} tooltip={tooltip} className={className}>
      <div
        ref={ref}
        className={cn(
          "field-auto flex items-center gap-2 p-2",
          "bg-amber-50 border border-amber-200 rounded-md"
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          <RefreshCw className="h-3 w-3 text-amber-600 flex-shrink-0" />
          <Badge variant="outline" className="font-mono text-sm px-3 py-1 bg-background">
            {value}
          </Badge>
        </div>
        {onRegenerate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 text-xs px-2 py-1 h-auto"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {regenerateLabel}
          </Button>
        )}
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          Auto
        </Badge>
      </div>
    </BaseField>
  )
);
AutoGeneratedField.displayName = "AutoGeneratedField";

export {
  EditableField,
  ReadOnlyField,
  CalculatedField,
  AutoGeneratedField,
  BaseField
};