import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RequiredLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  children: React.ReactNode;
}

const RequiredLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  RequiredLabelProps
>(({ className, children, ...props }, ref) => (
  <Label ref={ref} className={cn("", className)} {...props}>
    {children}
    <span className="text-destructive ml-1">*</span>
  </Label>
));
RequiredLabel.displayName = "RequiredLabel";

export { RequiredLabel };