import { useState } from "react";
import { Copy, ExternalLink, MapPin, Navigation, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProjectAddressLocatorProps {
  /** Project street address. Falsy renders the variant's explicit empty state. */
  address: string | null | undefined;
  /**
   * - `card`: Overview card block — full address + Get Directions / Copy actions.
   * - `header-chip`: desktop/iPad header — single-line truncated maps link.
   * - `header-badge-icon`: 44px pin button opening a bottom sheet.
   * - `header-inline`: mobile project header — pin + FULL wrapping address text
   *   (always glanceable, per Chris's Jul 2026 call: field crews read this off
   *   the header; never hide it behind a tap). Tap opens the same bottom sheet.
   */
  variant: "card" | "header-chip" | "header-badge-icon" | "header-inline";
  /**
   * Card-variant empty-state CTA. When provided, the dashed empty state renders
   * an "Add address" button calling it; when omitted, a muted "No address on
   * file" message renders instead.
   */
  onAddAddress?: () => void;
  className?: string;
}

/**
 * Google Maps universal deep-link. House pattern (the documented `?api=1` form)
 * — previously duplicated in ProjectDetailView + ProjectOperationalDashboard;
 * this component is now the single owner of the URL shape.
 */
const getMapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const copyAddress = async (address: string) => {
  try {
    await navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  } catch {
    toast.error("Couldn't copy address to clipboard");
  }
};

/**
 * Navigation apps — deliberately https universal links, NOT native URL
 * schemes: they open the installed app when present and fall back to the
 * web (or store) when not, with zero scheme-sniffing to go wrong.
 */
const NAV_APPS = [
  {
    key: "apple",
    name: "Apple Maps",
    url: (a: string) => `https://maps.apple.com/?daddr=${encodeURIComponent(a)}`,
  },
  {
    key: "google",
    name: "Google Maps",
    url: (a: string) =>
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a)}`,
  },
  {
    key: "waze",
    name: "Waze",
    url: (a: string) => `https://waze.com/ul?q=${encodeURIComponent(a)}&navigate=yes`,
  },
];

/** Platform-aware ordering only (all three always offered): Apple devices
 *  lead with Apple Maps, everything else leads with Google Maps. */
const getOrderedNavApps = () => {
  const isApple =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
  return isApple ? NAV_APPS : [NAV_APPS[1], NAV_APPS[0], NAV_APPS[2]];
};

/**
 * Canonical project-address affordance. NEVER returns null — every variant
 * renders an explicit empty state when no address is on file, so headers and
 * the Overview card always carry the same predictable slot.
 */
export function ProjectAddressLocator({
  address,
  variant,
  onAddAddress,
  className,
}: ProjectAddressLocatorProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Shared bottom sheet: full address + "Navigate with" (Apple Maps / Google
  // Maps / Waze, platform-ordered) + Copy. Used by the card, header-inline,
  // and header-badge-icon variants; header-chip (desktop) keeps its direct
  // maps link.
  const orderedNavApps = getOrderedNavApps();
  const directionsSheet = address ? (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent side="bottom" className="rounded-t-2xl sm:max-w-lg sm:mx-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Project address</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate with your preferred maps app or copy the address.
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-start gap-2 py-3 text-sm text-foreground">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 leading-snug">{address}</span>
        </div>
        <div className="flex flex-col gap-2 pb-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Navigate with
          </span>
          {orderedNavApps.map((app, i) => (
            <Button
              key={app.key}
              asChild
              variant={i === 0 ? "default" : "outline"}
              className="min-h-[44px]"
            >
              <a
                href={app.url(address)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Navigate to ${address} with ${app.name}`}
                onClick={() => setSheetOpen(false)}
              >
                <Navigation className="h-4 w-4 mr-2" aria-hidden="true" />
                {app.name}
              </a>
            </Button>
          ))}
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={() => copyAddress(address)}
            aria-label={`Copy address: ${address}`}
          >
            <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
            Copy address
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  ) : null;

  // ------------------------------------------------------------------ card
  if (variant === "card") {
    if (!address) {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-md border border-dashed border-border/80 px-3 py-2.5",
            className
          )}
        >
          {onAddAddress ? (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] sm:min-h-0 text-muted-foreground hover:text-foreground"
              onClick={onAddAddress}
              aria-label="Add address"
            >
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Add address
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">No address on file</span>
          )}
        </div>
      );
    }

    return (
      <>
        <div className={cn("space-y-2", className)}>
          <div className="flex items-start gap-1.5 text-sm text-foreground">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 leading-snug">{address}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Opens the app-chooser sheet (Apple/Google/Waze) rather than
                hard-linking one provider — crews have strong nav-app habits. */}
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0"
              onClick={() => setSheetOpen(true)}
              aria-label={`Get directions to ${address}`}
            >
              <Navigation className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Get Directions
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0"
              onClick={() => copyAddress(address)}
              aria-label={`Copy address: ${address}`}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Copy
            </Button>
          </div>
        </div>
        {directionsSheet}
      </>
    );
  }

  // ----------------------------------------------------------- header-chip
  if (variant === "header-chip") {
    if (!address) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs text-muted-foreground/70",
            className
          )}
          aria-label="No address on file"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>No address</span>
        </span>
      );
    }

    return (
      <a
        href={getMapsUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        title={address}
        aria-label={`Open ${address} in Google Maps`}
        className={cn(
          "group inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate max-w-xs">{address}</span>
        <ExternalLink
          className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />
      </a>
    );
  }

  // ------------------------------------- header-inline + header-badge-icon
  // Both open the same bottom sheet (Get Directions + Copy) — built once below.
  if (variant === "header-inline" && !address) {
    return (
      <span
        className={cn(
          "flex items-start gap-1.5 text-xs text-muted-foreground/60",
          className
        )}
        aria-label="No address on file"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <span>No address on file</span>
      </span>
    );
  }

  if (variant === "header-badge-icon" && !address) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className={cn("h-11 w-11 shrink-0 text-muted-foreground/50", className)}
        aria-label="No address on file"
      >
        <MapPin className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      {variant === "header-inline" ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={`Project address: ${address}. Opens directions and copy options.`}
          className={cn(
            "flex w-full items-start gap-1.5 text-left text-xs text-muted-foreground",
            "hover:text-foreground active:text-foreground transition-colors py-1",
            className
          )}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="flex-1 leading-snug">{address}</span>
        </button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-11 w-11 shrink-0 text-muted-foreground", className)}
          onClick={() => setSheetOpen(true)}
          aria-label={`Project address: ${address}`}
        >
          <MapPin className="h-5 w-5" />
        </Button>
      )}

      {directionsSheet}
    </>
  );
}
