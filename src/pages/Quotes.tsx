import { useState, useEffect } from "react";
import { FileText, Plus, List, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteForm } from "@/components/QuoteForm";
import { QuotesList } from "@/components/QuotesList";
import { QuoteComparison } from "@/components/QuoteComparison";
import { Quote } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { useToast } from "@/hooks/use-toast";

const Quotes = () => {
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'create' | 'compare'>('list');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote>();

  // Load data from localStorage on mount
  useEffect(() => {
    const savedQuotes = localStorage.getItem('quotes');
    if (savedQuotes) {
      const parsedQuotes = JSON.parse(savedQuotes);
      // Convert date strings back to Date objects
      const quotesWithDates = parsedQuotes.map((quote: any) => ({
        ...quote,
        dateReceived: new Date(quote.dateReceived),
        createdAt: new Date(quote.createdAt)
      }));
      setQuotes(quotesWithDates);
    }

    const savedEstimates = localStorage.getItem('estimates');
    if (savedEstimates) {
      const parsedEstimates = JSON.parse(savedEstimates);
      // Convert date strings back to Date objects
      const estimatesWithDates = parsedEstimates.map((estimate: any) => ({
        ...estimate,
        date: new Date(estimate.date),
        createdAt: new Date(estimate.createdAt)
      }));
      setEstimates(estimatesWithDates);
    }
  }, []);

  // Save quotes to localStorage whenever quotes change
  useEffect(() => {
    localStorage.setItem('quotes', JSON.stringify(quotes));
  }, [quotes]);

  const handleSaveQuote = (quote: Quote) => {
    setQuotes(prev => [...prev, quote]);
    setView('list');
  };

  const handleDeleteQuote = (quoteId: string) => {
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
    toast({
      title: "Quote Deleted",
      description: "The quote has been successfully deleted."
    });
  };

  const handleCompareQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setView('compare');
  };

  const selectedEstimate = selectedQuote ? 
    estimates.find(est => est.project_id === selectedQuote.project_id) : undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quotes</h1>
            <p className="text-muted-foreground">
              {view === 'create' ? 'Create new quote' : 
               view === 'compare' ? 'Compare estimate vs quote' : 
               'Manage project quotes and compare against estimates'}
            </p>
          </div>
        </div>
        
        {view === 'list' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4 mr-2" />
              All Quotes
            </Button>
            <Button onClick={() => setView('create')}>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'create' && (
        <QuoteForm
          estimates={estimates}
          onSave={handleSaveQuote}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'list' && (
        <QuotesList
          quotes={quotes}
          estimates={estimates}
          onDelete={handleDeleteQuote}
          onCompare={handleCompareQuote}
        />
      )}

      {view === 'compare' && selectedQuote && selectedEstimate && (
        <QuoteComparison
          quote={selectedQuote}
          estimate={selectedEstimate}
          onBack={() => setView('list')}
        />
      )}
    </div>
  );
};

export default Quotes;