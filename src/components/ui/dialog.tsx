import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

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

// Helper to detect clicks on Radix Popover components
const isRadixPopoverInteraction = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest('[data-radix-popover-trigger]') ||
    target.closest('[data-radix-popover-content]') ||
    target.closest('[data-radix-popper-content-wrapper]')
  );
};

// Combined helper to detect any dropdown-like interaction
const isDropdownLikeInteraction = (target: EventTarget | null): boolean => {
  return isRadixSelectInteraction(target) || 
         isNativePickerInteraction(target) || 
         isRadixPopoverInteraction(target);
};

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-3 border border-t-[3px] border-t-primary bg-background p-3 shadow-[0_20px_60px_-10px_rgba(27,43,67,0.15)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-xl no-horizontal-scroll pointer-events-auto",
          className,
        )}
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
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
