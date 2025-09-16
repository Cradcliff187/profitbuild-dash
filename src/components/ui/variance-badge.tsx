import { TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VarianceBadgeProps {
  variance: number; // Positive = over budget, Negative = under budget
  percentage: number;
  type?: 'estimate' | 'quote';
  className?: string;
}

export function VarianceBadge({ variance, percentage, type, className }: VarianceBadgeProps) {
  // Don't render if variance is effectively zero
  if (Math.abs(variance) < 1 && Math.abs(percentage) < 0.1) {
    return null;
  }

  const isOverBudget = variance > 0;
  const Icon = isOverBudget ? TrendingUp : TrendingDown;
  
  // Format the amount
  const formattedAmount = Math.abs(variance).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Format the percentage
  const formattedPercentage = Math.abs(percentage).toFixed(1);

  const badgeClass = cn(
    "inline-flex items-center gap-1 text-xs font-medium",
    isOverBudget 
      ? "bg-destructive/10 text-destructive border-destructive/20" 
      : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800",
    className
  );

  return (
    <Badge variant="outline" className={badgeClass}>
      <Icon className="h-3 w-3" />
      <span>{formattedAmount} ({formattedPercentage}%)</span>
      {type && (
        <span className="text-muted-foreground">
          {type === 'estimate' ? 'vs Est.' : 'vs Quote'}
        </span>
      )}
    </Badge>
  );
}