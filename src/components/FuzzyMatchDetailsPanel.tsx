import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { fuzzyMatchPayee, type PartialPayee } from '@/utils/fuzzyPayeeMatcher';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';

interface UnallocatedExpense {
  id: string;
  amount: number;
  expense_date: Date;
  description?: string;
  category: string;
  payee_name?: string;
  project_name?: string;
}

interface FuzzyMatchDetailsPanelProps {
  payeeName: string;
  unallocatedExpenses: UnallocatedExpense[];
  onAllocateExpense?: (expenseId: string) => void;
  showAllocateButtons?: boolean;
}

export const FuzzyMatchDetailsPanel: React.FC<FuzzyMatchDetailsPanelProps> = ({
  payeeName,
  unallocatedExpenses,
  onAllocateExpense,
  showAllocateButtons = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate fuzzy matches
  const matchResults = useMemo(() => {
    // Convert expenses to PartialPayee format
    const expensePayees: PartialPayee[] = unallocatedExpenses
      .filter(exp => exp.payee_name) // Only expenses with payees
      .map(exp => ({
        id: exp.id,
        payee_name: exp.payee_name!,
        full_name: exp.payee_name
      }));
    
    // Run fuzzy matching
    const fuzzyResult = fuzzyMatchPayee(payeeName, expensePayees);
    
    // Enrich with expense data
    return fuzzyResult.matches.map(match => {
      const expense = unallocatedExpenses.find(exp => exp.id === match.payee.id);
      return {
        ...match,
        expense
      };
    }).filter(m => m.expense); // Only include if expense found
  }, [payeeName, unallocatedExpenses]);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'bg-green-50 text-green-700 border-green-300';
    if (confidence >= 75) return 'bg-blue-50 text-blue-700 border-blue-300';
    if (confidence >= 60) return 'bg-yellow-50 text-yellow-700 border-yellow-300';
    return 'bg-orange-50 text-orange-700 border-orange-300';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 90) return 'Excellent';
    if (confidence >= 75) return 'Good';
    if (confidence >= 60) return 'Possible';
    return 'Weak';
  };

  if (matchResults.length === 0) {
    return (
      <div className="text-center py-3 text-muted-foreground text-xs">
        <AlertCircle className="h-4 w-4 mx-auto mb-1.5 opacity-50" />
        <p>No unallocated expenses with matching payees</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-1.5 mb-2">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Potential Matches
        </div>
        <Badge variant="outline" className="text-[10px] h-4 px-1">
          {matchResults.length}
        </Badge>
      </div>

      {/* Match Results */}
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
        {matchResults.map((result, index) => (
          <div
            key={result.expense!.id}
            className={cn(
              "p-2 rounded border text-[11px]",
              getConfidenceColor(result.confidence)
            )}
          >
            {/* Confidence Badge */}
            <div className="flex items-center justify-between mb-1">
              <Badge 
                variant={result.matchType === 'exact' ? 'default' : 'secondary'}
                className="text-[10px] font-semibold h-4 px-1"
              >
                {Math.round(result.confidence)}% {getConfidenceLabel(result.confidence)}
              </Badge>
              {index === 0 && result.confidence >= 75 && (
                <Badge variant="default" className="text-[10px] h-4 px-1 bg-primary">
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                  Top
                </Badge>
              )}
            </div>

            {/* Expense Details */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(result.expense!.amount)}
                </span>
                <span className="text-muted-foreground flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5" />
                  {format(new Date(result.expense!.expense_date), 'MMM dd')}
                </span>
              </div>
              
              {result.expense!.description && (
                <div className="text-muted-foreground truncate">
                  {result.expense!.description}
                </div>
              )}

              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="font-medium">Payee:</span> {result.expense!.payee_name}
              </div>

              <div className="text-muted-foreground">
                {EXPENSE_CATEGORY_DISPLAY[result.expense!.category as keyof typeof EXPENSE_CATEGORY_DISPLAY]}
              </div>

              {/* Allocate Button */}
              {showAllocateButtons && onAllocateExpense && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-1.5 h-6 text-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAllocateExpense(result.expense!.id);
                  }}
                >
                  Allocate This Expense
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="border-t pt-1.5 mt-2 text-[10px] text-muted-foreground">
        <div className="flex items-start gap-1.5">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            Confidence calculated using fuzzy matching (Jaro-Winkler, Levenshtein, token similarity). 
            Scores ≥75% auto-allocate.
          </div>
        </div>
      </div>
    </div>
  );
};
