import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, collisionPadding = 8, onOpenAutoFocus, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      onOpenAutoFocus={(e) => {
        onOpenAutoFocus?.(e);
        // Touch-primary devices: keep focus on the trigger instead of moving it
        // into the popover. When the first focusable is a search input (every
        // cmdk combobox), autofocus summons the on-screen keyboard while the
        // panel is still positioning — the keyboard shrinks the visible
        // viewport and the panel top (search box + first rows) lands offscreen.
        // The keyboard should only appear when the user taps the search box.
        // Desktop (fine pointer) keeps type-ahead autofocus. `pointer: coarse`,
        // not a viewport breakpoint, so iPads behave like phones (Gotcha #74).
        if (!e.defaultPrevented && typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
          e.preventDefault();
        }
      }}
      className={cn(
        "z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
