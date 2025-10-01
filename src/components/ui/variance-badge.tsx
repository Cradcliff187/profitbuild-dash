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
    "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0 h-4 leading-none",
    isOverBudget 
      ? "text-red-700 border-red-300" 
      : "text-green-700 border-green-300",
    className
  );

  return (
    <Badge variant="outline" className={badgeClass}>
      <Icon className="h-2 w-2" />
      <span>{formattedAmount} ({formattedPercentage}%)</span>
    </Badge>
  );
}