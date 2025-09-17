import { useState } from "react";
import { Eye, FileText, Trash2, ArrowUpDown, Edit } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Quote } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { QuoteStatusBadge } from "./QuoteStatusBadge";

interface QuotesListProps {
  quotes: Quote[];
  estimates: Estimate[];
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  onCompare: (quote: Quote) => void;
}

export const QuotesList = ({ quotes, estimates, onEdit, onDelete, onCompare }: QuotesListProps) => {
  const [sortBy, setSortBy] = useState<'date' | 'project' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getEstimateForQuote = (quote: Quote): Estimate | undefined => {
    return estimates.find(est => est.project_id === quote.project_id);
  };

  const getBudgetVariance = (quote: Quote): { amount: number; percentage: number; status: 'over' | 'under' | 'exact' } => {
    const estimate = getEstimateForQuote(quote);
    if (!estimate) return { amount: 0, percentage: 0, status: 'exact' };
    
    const difference = quote.total - estimate.total_amount;
    const percentage = estimate.total_amount > 0 ? (difference / estimate.total_amount) * 100 : 0;
    
    return {
      amount: Math.abs(difference),
      percentage: Math.abs(percentage),
      status: difference > 0 ? 'over' : difference < 0 ? 'under' : 'exact'
    };
  };

  const sortedQuotes = [...quotes].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime();
        break;
      case 'project':
        comparison = a.projectName.localeCompare(b.projectName);
        break;
      case 'total':
        comparison = a.total - b.total;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  if (quotes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Quotes Yet</h3>
            <p>Create your first quote to start comparing against estimates.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quotes ({quotes.length})</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('date')}
              >
                Date {sortBy === 'date' && <ArrowUpDown className="ml-1 h-3 w-3" />}
              </Button>
              <Button
                variant={sortBy === 'project' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('project')}
              >
                Project {sortBy === 'project' && <ArrowUpDown className="ml-1 h-3 w-3" />}
              </Button>
              <Button
                variant={sortBy === 'total' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('total')}
              >
                Total {sortBy === 'total' && <ArrowUpDown className="ml-1 h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quotes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedQuotes.map((quote) => {
          const estimate = getEstimateForQuote(quote);
          const variance = getBudgetVariance(quote);
          
          return (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{quote.projectName}</CardTitle>
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {quote.client} • {quote.quoteNumber}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(quote)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCompare(quote)}
                      disabled={!estimate}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Compare
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Quote</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this quote from {quote.quotedBy}? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(quote.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quote Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Quoted By</div>
                    <div className="font-medium">{quote.quotedBy}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Date Received</div>
                    <div className="font-medium">{format(quote.dateReceived, "MMM dd, yyyy")}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Quote Total</div>
                    <div className="font-bold text-lg">${quote.total.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Estimate Total</div>
                    <div className="font-medium">
                      {estimate ? `$${estimate.total_amount.toFixed(2)}` : 'N/A'}
                    </div>
                  </div>
                  {quote.valid_until && (
                    <>
                      <div>
                        <div className="text-muted-foreground">Valid Until</div>
                        <div className="font-medium">{format(quote.valid_until, "MMM dd, yyyy")}</div>
                      </div>
                      <div></div>
                    </>
                  )}
                  {quote.accepted_date && (
                    <>
                      <div>
                        <div className="text-muted-foreground">Accepted Date</div>
                        <div className="font-medium">{format(quote.accepted_date, "MMM dd, yyyy")}</div>
                      </div>
                      <div></div>
                    </>
                  )}
                </div>

                {/* Budget Variance */}
                {estimate && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Budget Variance</span>
                      <Badge 
                        variant={
                          variance.status === 'over' ? 'destructive' : 
                          variance.status === 'under' ? 'default' : 
                          'secondary'
                        }
                      >
                        {variance.status === 'over' && '+'}
                        {variance.status === 'under' && '-'}
                        ${variance.amount.toFixed(2)} ({variance.percentage.toFixed(1)}%)
                      </Badge>
                    </div>
                    {variance.status === 'over' && (
                      <div className="text-xs text-destructive mt-1">
                        Over budget
                      </div>
                    )}
                    {variance.status === 'under' && (
                      <div className="text-xs text-green-600">
                        Under budget
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection Reason */}
                {quote.status === 'rejected' && quote.rejection_reason && (
                  <div className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <div className="text-red-600 dark:text-red-400 font-medium mb-1">Rejection Reason</div>
                    <div className="text-red-800 dark:text-red-200">{quote.rejection_reason}</div>
                  </div>
                )}

                {/* Notes */}
                {quote.notes && (
                  <div className="text-sm">
                    <div className="text-muted-foreground mb-1">Notes</div>
                    <div className="text-foreground">{quote.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};