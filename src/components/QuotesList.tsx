import { useState, useEffect } from "react";
import { Eye, FileText, Trash2, ArrowUpDown, Edit, Check, X, CheckCircle } from "lucide-react";
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
import { Quote, QuoteStatus } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { calculateEstimateTotalCost } from "@/utils/estimateFinancials";
import { calculateQuoteTotalCost } from "@/utils/quoteFinancials";
import { Project } from "@/types/project";
import { Expense, ExpenseCategory } from "@/types/expense";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { QuoteAcceptanceModal } from "./QuoteAcceptanceModal";
import { QuotesTableView } from "./QuotesTableView";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuotesListProps {
  quotes: Quote[];
  estimates: Estimate[];
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  onCompare: (quote: Quote) => void;
  onAccept?: (quote: Quote) => void;
  onExpire?: (expiredQuoteIds: string[]) => void;
  onCreateNew?: () => void;
}

export const QuotesList = ({ quotes, estimates, onEdit, onDelete, onCompare, onAccept, onExpire, onCreateNew }: QuotesListProps) => {
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState<'date' | 'project' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [selectedQuoteForAcceptance, setSelectedQuoteForAcceptance] = useState<Quote | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectExpenses, setProjectExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getEstimateForQuote = (quote: Quote): Estimate | undefined => {
    return estimates.find(est => est.project_id === quote.project_id);
  };

  const getEstimateLineItemCost = (quote: Quote): number | null => {
    const estimate = getEstimateForQuote(quote);
    if (!estimate || !estimate.lineItems || !quote.lineItems) {
      return null;
    }
    
    // If quote is linked to a specific estimate line item, use that item's cost
    if (quote.estimate_line_item_id) {
      const targetLineItem = estimate.lineItems.find(item => item.id === quote.estimate_line_item_id);
      if (targetLineItem) {
        return targetLineItem.totalCost || (targetLineItem.quantity * targetLineItem.costPerUnit);
      }
    }
    
    // Fallback: If no specific line item link, match by categories present in quote
    const quoteCategorySet = new Set(quote.lineItems.map(item => item.category));
    const matchingItems = estimate.lineItems.filter(item => quoteCategorySet.has(item.category));
    
    if (matchingItems.length === 0) return null;
    
    return matchingItems.reduce((sum, item) => sum + (item.totalCost || item.quantity * item.costPerUnit), 0);
  };

  const getQuotedAmountForEstimateMatch = (quote: Quote): number | null => {
    const estimate = getEstimateForQuote(quote);
    if (!estimate || !estimate.lineItems || !quote.lineItems) {
      return null;
    }

    // If linked to specific estimate line item
    if (quote.estimate_line_item_id) {
      const targetLineItem = estimate.lineItems.find(item => item.id === quote.estimate_line_item_id);
      if (!targetLineItem) return null;
      
      // Find quote line items that match this category
      const matchingQuoteItems = quote.lineItems.filter(item => item.category === targetLineItem.category);
      return matchingQuoteItems.reduce((sum, item) => sum + (item.totalCost || item.quantity * item.costPerUnit), 0);
    } else {
      // Category-based matching - sum all quote line item costs
      return quote.lineItems.reduce((sum, item) => sum + (item.totalCost || item.quantity * item.costPerUnit), 0);
    }
  };

  const getCostVariance = (quote: Quote): { amount: number; percentage: number; status: 'over' | 'under' | 'exact' } => {
    const estimateCost = getEstimateLineItemCost(quote);
    const quotedAmount = getQuotedAmountForEstimateMatch(quote);
    
    if (estimateCost === null || quotedAmount === null) {
      return { amount: 0, percentage: 0, status: 'exact' };
    }

    const difference = quotedAmount - estimateCost;
    const percentage = estimateCost > 0 ? (difference / estimateCost) * 100 : 0;
    
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

  // Auto-expire quotes function
  const checkAndExpireQuotes = async (quotesToCheck: Quote[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiredQuotes = quotesToCheck.filter(quote => 
      quote.status === QuoteStatus.PENDING &&
      quote.valid_until &&
      new Date(quote.valid_until) < today
    );
    
    if (expiredQuotes.length > 0) {
      try {
        // Update database
        const updatePromises = expiredQuotes.map(quote =>
          supabase.from('quotes')
            .update({ status: 'expired' })
            .eq('id', quote.id)
        );
        
        await Promise.all(updatePromises);
        
        const expiredQuoteIds = expiredQuotes.map(q => q.id);
        onExpire?.(expiredQuoteIds);
        
        toast({
          title: "Quotes Auto-Expired",
          description: `${expiredQuotes.length} quote(s) have been automatically expired due to past expiration dates.`,
        });
        
        return expiredQuoteIds;
      } catch (error) {
        console.error('Error expiring quotes:', error);
        toast({
          title: "Error",
          description: "Failed to expire quotes. Please try again.",
          variant: "destructive",
        });
      }
    }
    
    return [];
  };

  // Run auto-expire check on component mount
  useEffect(() => {
    if (quotes.length > 0) {
      checkAndExpireQuotes(quotes);
    }
  }, [quotes.length]); // Only run when quotes array changes length

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const handleAcceptClick = async (quote: Quote) => {
    setLoading(true);
    try {
      // Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', quote.project_id)
        .single();

      if (projectError) throw projectError;

      // Fetch project expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', quote.project_id);

      if (expensesError) throw expensesError;

      // Transform project data to match TypeScript interface
      const transformedProject: Project = {
        ...projectData,
        start_date: projectData.start_date ? new Date(projectData.start_date) : undefined,
        end_date: projectData.end_date ? new Date(projectData.end_date) : undefined,
        created_at: new Date(projectData.created_at),
        updated_at: new Date(projectData.updated_at),
      };

      // Transform expenses data to match TypeScript interface
      const transformedExpenses: Expense[] = (expensesData || []).map(expense => ({
        ...expense,
        category: expense.category as ExpenseCategory,
        expense_date: new Date(expense.expense_date),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
      }));

      setSelectedQuoteForAcceptance(quote);
      setSelectedProject(transformedProject);
      setProjectExpenses(transformedExpenses);
      setShowAcceptanceModal(true);
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast({
        title: "Error",
        description: "Failed to load project data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteAccept = async (updatedQuote: Quote) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: updatedQuote.status,
          accepted_date: updatedQuote.accepted_date?.toISOString(),
        })
        .eq('id', updatedQuote.id);

      if (error) throw error;

      onAccept?.(updatedQuote);
      setShowAcceptanceModal(false);
      setSelectedQuoteForAcceptance(null);
      setSelectedProject(null);
      setProjectExpenses([]);

      toast({
        title: "Quote Accepted",
        description: `Quote ${updatedQuote.quoteNumber} has been accepted successfully.`,
      });
    } catch (error) {
      console.error('Error accepting quote:', error);
      toast({
        title: "Error",
        description: "Failed to accept quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleQuoteReject = async (updatedQuote: Quote) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: updatedQuote.status,
          rejection_reason: updatedQuote.rejection_reason,
        })
        .eq('id', updatedQuote.id);

      if (error) throw error;

      onAccept?.(updatedQuote); // Use same callback for consistency
      setShowAcceptanceModal(false);
      setSelectedQuoteForAcceptance(null);
      setSelectedProject(null);
      setProjectExpenses([]);

      toast({
        title: "Quote Rejected",
        description: `Quote ${updatedQuote.quoteNumber} has been rejected.`,
      });
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        title: "Error",
        description: "Failed to reject quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Use table view for desktop, card view for mobile
  if (!isMobile) {
    return (
      <QuotesTableView
        quotes={quotes}
        estimates={estimates}
        onEdit={onEdit}
        onDelete={onDelete}
        onCompare={onCompare}
        onAccept={onAccept}
        onCreateNew={onCreateNew || (() => {})}
      />
    );
  }

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
          const variance = getCostVariance(quote);
          
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
                    {quote.status === QuoteStatus.PENDING && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAcceptClick(quote)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                    )}
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
                    <div className="text-muted-foreground">Estimate Cost</div>
                    <div className="font-medium">
                      {(() => {
                        const estimateCost = getEstimateLineItemCost(quote);
                        return estimateCost !== null ? `$${estimateCost.toFixed(2)}` : 'N/A';
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Quoted Amount</div>
                    <div className="font-bold">
                      {(() => {
                        const quotedAmount = getQuotedAmountForEstimateMatch(quote);
                        return quotedAmount !== null ? `$${quotedAmount.toFixed(2)}` : 'N/A';
                      })()}
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
                        <span className="text-sm text-muted-foreground">Cost Variance</span>
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
                {quote.status === QuoteStatus.REJECTED && quote.rejection_reason && (
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

      {/* Quote Acceptance Modal */}
      {showAcceptanceModal && selectedQuoteForAcceptance && selectedProject && (
        <QuoteAcceptanceModal
          quote={selectedQuoteForAcceptance}
          estimate={getEstimateForQuote(selectedQuoteForAcceptance)!}
          project={selectedProject}
          expenses={projectExpenses}
          onAccept={handleQuoteAccept}
          onReject={handleQuoteReject}
          onClose={() => {
            setShowAcceptanceModal(false);
            setSelectedQuoteForAcceptance(null);
            setSelectedProject(null);
            setProjectExpenses([]);
          }}
        />
      )}
    </div>
  );
};