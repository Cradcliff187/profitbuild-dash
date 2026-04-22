import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileBackButtonProps {
  to: string;
  label?: string;
  className?: string;
}

// Shared mobile back affordance for non-root routes. Uses an explicit `to`
// path rather than navigate(-1) so it works in PWA standalone mode (no browser
// chrome) and after deep-link entries where the back stack is empty. Sizing +
// styling matches the other mobile-first affordances (44px+ touch target,
// -ml-2 to align with page edge).
export function MobileBackButton({ to, label = "Back", className }: MobileBackButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(to)}
      className={cn("mb-2 -ml-2 min-h-[44px]", className)}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
