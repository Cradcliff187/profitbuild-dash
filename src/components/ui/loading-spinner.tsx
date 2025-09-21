import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

const loadingSpinnerVariants = cva(
  "flex items-center justify-center",
  {
    variants: {
      variant: {
        spinner: "text-muted-foreground",
        skeleton: "",
        text: "text-muted-foreground",
        page: "min-h-[400px] text-muted-foreground",
      },
      size: {
        sm: "h-8",
        md: "h-16",
        lg: "h-32",
        full: "h-64",
      },
    },
    defaultVariants: {
      variant: "spinner",
      size: "md",
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingSpinnerVariants> {
  message?: string;
  showIcon?: boolean;
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, variant, size, message, showIcon = true, ...props }, ref) => {
    const renderContent = () => {
      switch (variant) {
        case "skeleton":
          return (
            <div className="space-y-4 w-full max-w-md">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          );
        
        case "text":
          return (
            <div className="text-center">
              {message || "Loading..."}
            </div>
          );
        
        case "page":
          return (
            <div className="text-center space-y-4">
              {showIcon && <Loader2 className="h-8 w-8 animate-spin mx-auto" />}
              <p className="text-lg font-medium">
                {message || "Loading page..."}
              </p>
            </div>
          );
        
        default: // spinner
          return (
            <div className="text-center">
              {showIcon && (
                <Loader2 
                  className={cn(
                    "animate-spin mx-auto mb-2",
                    size === "sm" && "h-4 w-4",
                    size === "md" && "h-6 w-6", 
                    size === "lg" && "h-8 w-8",
                    size === "full" && "h-8 w-8"
                  )} 
                />
              )}
              {message && (
                <p className="text-sm">
                  {message}
                </p>
              )}
            </div>
          );
      }
    };

    return (
      <div
        ref={ref}
        className={cn(loadingSpinnerVariants({ variant, size }), className)}
        role="status"
        aria-label={message || "Loading"}
        {...props}
      >
        {renderContent()}
      </div>
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner, loadingSpinnerVariants };