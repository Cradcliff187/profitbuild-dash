import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Helper to detect clicks on Radix Select components (trigger or portal)
const isRadixSelectInteraction = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest('[data-radix-select-trigger]') ||  // Button being clicked
    target.closest('[data-radix-select-content]') ||  // Dropdown portal (once open)
    target.closest('[role="combobox"]') ||            // ARIA role on trigger
    target.closest('[role="listbox"]') ||             // ARIA role on content
    target.closest('[data-radix-popper-content-wrapper]') // Radix popper wrapper
  );
};

// Helper to detect clicks on native HTML pickers (select, date inputs, etc.)
const isNativePickerInteraction = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  const element = target as Element;
  
  // Check if it's a select element or inside one
  const isSelect = element.tagName === 'SELECT' || !!element.closest('select');
  
  // Check if it's a picker-type input (date, time, etc.)
  const isPickerInput = (el: Element): boolean => {
    if (el.tagName !== 'INPUT') return false;
    const type = (el as HTMLInputElement).type;
    return ['date', 'time', 'datetime-local', 'month', 'week', 'color'].includes(type);
  };
  
  const isPicker = isPickerInput(element) || !!element.closest('input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"], input[type="color"]');
  
  return isSelect || isPicker;
};

// Combined helper to detect any dropdown-like interaction
const isDropdownLikeInteraction = (target: EventTarget | null): boolean => {
  return isRadixSelectInteraction(target) || isNativePickerInteraction(target);
};

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, ...props }, ref) => {
    const isMobile = useIsMobile();
    
    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content 
          ref={ref} 
          className={cn(sheetVariants({ side }), "no-horizontal-scroll pointer-events-auto", className)}
          onPointerDownOutside={(e) => {
            // Allow dropdowns and pickers to work
            if (isDropdownLikeInteraction(e.target)) {
              e.stopPropagation();
              return;
            }
            props.onPointerDownOutside?.(e);
          }}
          onInteractOutside={(e) => {
            // Allow dropdowns and pickers to work
            if (isDropdownLikeInteraction(e.target)) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            props.onInteractOutside?.(e);
          }}
          onFocusOutside={(e) => {
            // Allow dropdowns and pickers to work
            if (isDropdownLikeInteraction(e.target)) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            props.onFocusOutside?.(e);
          }}
          onOpenAutoFocus={(e) => {
            if (isMobile) e.preventDefault();
            props.onOpenAutoFocus?.(e);
          }}
          onCloseAutoFocus={(e) => {
            if (isMobile) e.preventDefault();
            props.onCloseAutoFocus?.(e);
          }}
          {...props}
        >
          {children}
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
