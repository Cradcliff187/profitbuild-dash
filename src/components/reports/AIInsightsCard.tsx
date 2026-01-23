import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIInsightsCardProps {
  insights: string;
  className?: string;
}

export function AIInsightsCard({ insights, className }: AIInsightsCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!insights) return null;

  // Parse insights into bullet points if they aren't already
  const formatInsights = (text: string) => {
    // Split by common bullet point patterns
    const lines = text.split(/\n/).filter(line => line.trim());
    
    return lines.map((line, index) => {
      // Remove leading bullets, dashes, numbers
      const cleanLine = line.replace(/^[\s]*[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      if (!cleanLine) return null;
      
      return (
        <li key={index} className="text-sm text-muted-foreground mb-2 last:mb-0">
          {cleanLine}
        </li>
      );
    }).filter(Boolean);
  };

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            AI Insights
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0 px-4 pb-4">
          <ul className="list-disc list-inside space-y-1">
            {formatInsights(insights)}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
