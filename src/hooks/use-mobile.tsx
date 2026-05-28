import * as React from "react";
import { isIOSDevice } from "@/utils/platform";

const MOBILE_BREAKPOINT = 768;

// iPads report a width >= 768 (768 portrait, 1024+ landscape) and so were
// treated as desktop. They're touch-first devices that should get the mobile
// experience, so any iOS device (incl. iPadOS, which masquerades as a Mac --
// handled by isIOSDevice) is forced to mobile regardless of width.
function computeIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT || isIOSDevice();
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(computeIsMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(computeIsMobile());
    };
    mql.addEventListener("change", onChange);
    setIsMobile(computeIsMobile());
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
