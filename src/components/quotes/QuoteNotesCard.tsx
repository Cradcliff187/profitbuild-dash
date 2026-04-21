import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StickyNote } from "lucide-react";

interface QuoteNotesCardProps {
  notes?: string | null;
  rejectionReason?: string | null;
}

export function QuoteNotesCard({ notes, rejectionReason }: QuoteNotesCardProps) {
  if (!notes && !rejectionReason) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {rejectionReason && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Rejection reason
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {rejectionReason}
            </p>
          </div>
        )}
        {notes && (
          <div>
            {rejectionReason && (
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Notes
              </p>
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
