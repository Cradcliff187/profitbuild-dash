import { useState, useEffect } from "react";
import { FileText, Plus, List, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteForm } from "@/components/QuoteForm";
import { QuotesList } from "@/components/QuotesList";
import { QuoteComparison } from "@/components/QuoteComparison";
import { Quote, QuoteStatus } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Quotes = () => {
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'compare'>('list');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote>();
  const [loading, setLoading] = useState(true);

  // Load data from Supabase on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch quotes with related data
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          payees(vendor_name),
          projects(project_name, client_name),
          quote_line_items(*)
        `);
      
      if (quotesError) throw quotesError;

      // Fetch estimates with related data
      const { data: estimatesData, error: estimatesError } = await supabase
        .from('estimates')
        .select(`
          *,
          projects(project_name, client_name)
        `);

      if (estimatesError) throw estimatesError;

      // Transform quotes to match the expected Quote type
      const transformedQuotes: Quote[] = (quotesData || []).map(quote => ({
        id: quote.id,
        project_id: quote.project_id,
        estimate_id: quote.estimate_id,
        projectName: quote.projects?.project_name || '',
        client: quote.projects?.client_name || '',
        payee_id: quote.payee_id,
        quotedBy: quote.payees?.vendor_name || '',
        dateReceived: new Date(quote.date_received),
        quoteNumber: quote.quote_number,
         status: quote.status as QuoteStatus,
        accepted_date: quote.accepted_date ? new Date(quote.accepted_date) : undefined,
        valid_until: quote.valid_until ? new Date(quote.valid_until) : undefined,
        rejection_reason: quote.rejection_reason,
        estimate_line_item_id: quote.estimate_line_item_id,
        includes_materials: quote.includes_materials ?? true,
        includes_labor: quote.includes_labor ?? true,
        lineItems: quote.quote_line_items?.map((item: any) => ({
          id: item.id,
          estimateLineItemId: item.estimate_line_item_id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          total: item.total
        })) || [],
        subtotals: {
          labor: 0,
          subcontractors: 0,
          materials: 0,
          equipment: 0,
          other: 0
        },
        total: quote.total_amount,
        notes: quote.notes,
        attachment_url: quote.attachment_url,
        createdAt: new Date(quote.created_at)
      }));

      // Transform estimates to match the expected Estimate type
      const transformedEstimates: Estimate[] = (estimatesData || []).map(estimate => ({
        id: estimate.id,
        project_id: estimate.project_id,
        project_name: estimate.projects?.project_name || '',
        client_name: estimate.projects?.client_name || '',
        estimate_number: estimate.estimate_number,
        revision_number: estimate.revision_number,
        date: new Date(estimate.date_created),
        date_created: new Date(estimate.date_created),
        total_amount: estimate.total_amount,
        status: estimate.status,
        notes: estimate.notes,
        contingency_percent: estimate.contingency_percent || 10.0,
        contingency_amount: estimate.contingency_amount,
        contingency_used: estimate.contingency_used || 0,
        version_number: estimate.version_number || 1,
        parent_estimate_id: estimate.parent_estimate_id || undefined,
        is_current_version: estimate.is_current_version ?? true,
        valid_for_days: estimate.valid_for_days || 30,
        created_at: new Date(estimate.created_at),
        updated_at: new Date(estimate.updated_at),
        createdAt: new Date(estimate.created_at),
        lineItems: []
      }));

      setQuotes(transformedQuotes);
      setEstimates(transformedEstimates);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load quotes and estimates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuote = async (quote: Quote) => {
    try {
      if (selectedQuote) {
        // Update existing quote
        const { error } = await supabase
          .from('quotes')
          .update({
            project_id: quote.project_id,
            estimate_id: quote.estimate_id,
            payee_id: quote.payee_id,
            quote_number: quote.quoteNumber,
            date_received: quote.dateReceived.toISOString().split('T')[0],
            status: quote.status,
            accepted_date: quote.accepted_date ? quote.accepted_date.toISOString() : null,
            valid_until: quote.valid_until ? quote.valid_until.toISOString().split('T')[0] : null,
            rejection_reason: quote.rejection_reason,
            estimate_line_item_id: quote.estimate_line_item_id,
            includes_materials: quote.includes_materials,
            includes_labor: quote.includes_labor,
            total_amount: quote.total,
            notes: quote.notes,
            attachment_url: quote.attachment_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', quote.id);

        if (error) throw error;
        
        // Update line items - delete existing and insert new ones
        await supabase.from('quote_line_items').delete().eq('quote_id', quote.id);
        
        if (quote.lineItems.length > 0) {
          const { error: lineItemsError } = await supabase
            .from('quote_line_items')
            .insert(quote.lineItems.map(item => ({
              quote_id: quote.id,
              estimate_line_item_id: item.estimateLineItemId,
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              total: item.total,
              sort_order: 0
            })));

          if (lineItemsError) throw lineItemsError;
        }
      } else {
        // Create new quote
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .insert({
            project_id: quote.project_id,
            estimate_id: quote.estimate_id,
            payee_id: quote.payee_id,
            quote_number: quote.quoteNumber,
            date_received: quote.dateReceived.toISOString().split('T')[0],
            status: quote.status,
            accepted_date: quote.accepted_date ? quote.accepted_date.toISOString() : null,
            valid_until: quote.valid_until ? quote.valid_until.toISOString().split('T')[0] : null,
            rejection_reason: quote.rejection_reason,
            estimate_line_item_id: quote.estimate_line_item_id,
            includes_materials: quote.includes_materials,
            includes_labor: quote.includes_labor,
            total_amount: quote.total,
            notes: quote.notes,
            attachment_url: quote.attachment_url
          })
          .select()
          .single();

        if (quoteError) throw quoteError;

        // Insert line items
        if (quote.lineItems.length > 0) {
          const { error: lineItemsError } = await supabase
            .from('quote_line_items')
            .insert(quote.lineItems.map(item => ({
              quote_id: quoteData.id,
              estimate_line_item_id: item.estimateLineItemId,
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              total: item.total,
              sort_order: 0
            })));

          if (lineItemsError) throw lineItemsError;
        }
      }

      await fetchData(); // Refresh the data
      setView('list');
      setSelectedQuote(undefined);
      
      toast({
        title: selectedQuote ? "Quote Updated" : "Quote Created",
        description: `Quote ${quote.quoteNumber} has been ${selectedQuote ? 'updated' : 'created'} successfully.`
      });
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      // Delete line items first
      await supabase.from('quote_line_items').delete().eq('quote_id', quoteId);
      
      // Delete the quote
      const { error } = await supabase.from('quotes').delete().eq('id', quoteId);
      
      if (error) throw error;
      
      await fetchData(); // Refresh the data
      
      toast({
        title: "Quote Deleted",
        description: "The quote has been successfully deleted."
      });
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast({
        title: "Error",
        description: "Failed to delete quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setView('edit');
  };

  const handleCompareQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setView('compare');
  };

  const handleAcceptQuote = async (updatedQuote: Quote) => {
    // Update the local state immediately for UI responsiveness
    setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
    
    // Optionally refresh data to ensure consistency
    await fetchData();
  };

  const handleExpireQuotes = async (expiredQuoteIds: string[]) => {
    // Update the local state immediately for UI responsiveness
    setQuotes(prev => prev.map(q => 
      expiredQuoteIds.includes(q.id) 
        ? { ...q, status: QuoteStatus.EXPIRED }
        : q
    ));
    
    // Optionally refresh data to ensure consistency
    await fetchData();
  };

  const selectedEstimate = selectedQuote ? 
    estimates.find(est => est.project_id === selectedQuote.project_id) : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quotes...</p>
        </div>
      </div>
    );
  }

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
               view === 'edit' ? 'Edit quote' :
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

      {view === 'edit' && selectedQuote && (
        <QuoteForm
          estimates={estimates}
          initialQuote={selectedQuote}
          onSave={handleSaveQuote}
          onCancel={() => { setView('list'); setSelectedQuote(undefined); }}
        />
      )}

      {view === 'list' && (
        <QuotesList
          quotes={quotes}
          estimates={estimates}
          onEdit={handleEditQuote}
          onDelete={handleDeleteQuote}
          onCompare={handleCompareQuote}
          onAccept={handleAcceptQuote}
          onExpire={handleExpireQuotes}
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