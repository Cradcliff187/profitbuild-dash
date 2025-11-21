import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Plus, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteForm } from "@/components/QuoteForm";
import { QuotesList } from "@/components/QuotesList";
import { QuoteComparison } from "@/components/QuoteComparison";
import { QuoteFilters, QuoteSearchFilters } from "@/components/QuoteFilters";
import { QuoteExportModal } from "@/components/QuoteExportModal";
import { Quote, QuoteStatus } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandedLoader } from "@/components/ui/branded-loader";

const Quotes = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'view' | 'compare'>('list');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote>();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Array<{ id: string; client_name: string; }>>([]);
  const [payees, setPayees] = useState<Array<{ id: string; payee_name: string; }>>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [preSelectedEstimateId, setPreSelectedEstimateId] = useState<string | undefined>();
  const [searchFilters, setSearchFilters] = useState<QuoteSearchFilters>({
    searchText: '',
    status: [],
    payeeName: [],
    clientName: [],
    dateRange: { start: null, end: null },
    amountRange: { min: null, max: null },
  });

  // Load data from Supabase on mount
  useEffect(() => {
    fetchData();
    loadClients();
    loadPayees();
  }, []);

  // Apply filters when quotes or filters change
  useEffect(() => {
    applyFilters();
  }, [quotes, searchFilters]);

  // Apply URL parameters to filters on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    
    if (filterParam === 'expiring') {
      // Calculate 7 days from now for expiring quotes
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);
      
      setSearchFilters(prev => ({
        ...prev,
        status: ['pending'],
        dateRange: {
          start: today,
          end: sevenDaysFromNow
        }
      }));
    }
  }, [searchParams]);

  // Auto-open quote creation form when navigating from project details
  useEffect(() => {
    const projectIdParam = searchParams.get('projectId');
    const estimateIdParam = searchParams.get('estimateId');
    
    if (projectIdParam && estimateIdParam && view === 'list') {
      // Find the matching estimate
      const preSelectedEstimate = estimates.find(e => e.id === estimateIdParam);
      
      if (preSelectedEstimate) {
        setView('create');
        setPreSelectedEstimateId(estimateIdParam);
        
        // Clear URL params after processing (will trigger on next render)
        window.history.replaceState({}, '', '/quotes');
      } else if (estimates.length > 0) {
        // Estimates loaded but estimate not found
        setView('create');
        toast({
          title: "Estimate not found",
          description: "Please select the estimate manually",
          variant: "default"
        });
        window.history.replaceState({}, '', '/quotes');
      }
    }
  }, [searchParams, estimates, view, toast]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, client_name')
      .eq('is_active', true)
      .order('client_name', { ascending: true });
    
    if (error) {
      console.error('Error loading clients:', error);
      return;
    }
    
    setClients(data || []);
  };

  const loadPayees = async () => {
    const { data, error } = await supabase
      .from('payees')
      .select('id, payee_name')
      .eq('is_active', true)
      .order('payee_name', { ascending: true });
    
    if (error) {
      console.error('Error loading payees:', error);
      return;
    }
    
    setPayees(data || []);
  };

  const applyFilters = () => {
    let filtered = [...quotes];

    // Text search
    if (searchFilters.searchText) {
      const searchText = searchFilters.searchText.toLowerCase();
      filtered = filtered.filter(quote => 
        quote.quoteNumber.toLowerCase().includes(searchText) ||
        quote.projectName?.toLowerCase().includes(searchText) ||
        quote.client?.toLowerCase().includes(searchText) ||
        quote.quotedBy?.toLowerCase().includes(searchText) ||
        quote.notes?.toLowerCase().includes(searchText)
      );
    }

    // Status filter
    if (searchFilters.status.length > 0) {
      filtered = filtered.filter(quote => 
        searchFilters.status.includes(quote.status)
      );
    }

    // Payee filter
    if (searchFilters.payeeName.length > 0) {
      filtered = filtered.filter(quote => {
        if (!quote.quotedBy) return false;
        return searchFilters.payeeName.some(payee =>
          quote.quotedBy!.toLowerCase().includes(payee.toLowerCase())
        );
      });
    }

    // Client filter
    if (searchFilters.clientName.length > 0) {
      filtered = filtered.filter(quote => {
        if (!quote.client) return false;
        return searchFilters.clientName.some(client =>
          quote.client!.toLowerCase().includes(client.toLowerCase())
        );
      });
    }

    // Date range filter
    if (searchFilters.dateRange.start) {
      filtered = filtered.filter(quote => 
        new Date(quote.dateReceived) >= searchFilters.dateRange.start!
      );
    }
    if (searchFilters.dateRange.end) {
      filtered = filtered.filter(quote => 
        new Date(quote.dateReceived) <= searchFilters.dateRange.end!
      );
    }

    // Amount range filter
    if (searchFilters.amountRange.min !== null) {
      filtered = filtered.filter(quote => 
        quote.total >= searchFilters.amountRange.min!
      );
    }
    if (searchFilters.amountRange.max !== null) {
      filtered = filtered.filter(quote => 
        quote.total <= searchFilters.amountRange.max!
      );
    }

    setFilteredQuotes(filtered);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch quotes with related data
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          payees(payee_name),
          projects(project_number, project_name, client_name),
          quote_line_items(*)
        `);
      
      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
        throw new Error(`Failed to fetch quotes: ${quotesError.message}`);
      }

      // Fetch estimates with related data
      const { data: estimatesData, error: estimatesError } = await supabase
        .from('estimates')
        .select(`
          *,
          projects(project_name, client_name),
          estimate_line_items(*)
        `);

      if (estimatesError) {
        console.error('Error fetching estimates:', estimatesError);
        throw new Error(`Failed to fetch estimates: ${estimatesError.message}`);
      }

      // Transform quotes to match the expected Quote type with error handling
      const transformedQuotes: Quote[] = (quotesData || []).map(quote => {
        try {
          // Helper function to safely parse numbers
          const safeNumber = (value: any, defaultValue: number = 0): number => {
            const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
            return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
          };

          // Helper function to safely parse dates
          const safeDate = (dateStr: any): Date => {
            if (!dateStr) return new Date();
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? new Date() : date;
          };

          // Handle nested Supabase response (could be object, array, or null)
          const projectData = Array.isArray(quote.projects) ? quote.projects[0] : quote.projects;
          const payeeData = Array.isArray(quote.payees) ? quote.payees[0] : quote.payees;

          return {
            id: quote.id || '',
            project_id: quote.project_id || '',
            estimate_id: quote.estimate_id || '',
            project_number: projectData?.project_number || '',
            projectName: projectData?.project_name || '',
            client: projectData?.client_name || '',
            payee_id: quote.payee_id || '',
            quotedBy: payeeData?.payee_name || '',
            dateReceived: safeDate(quote.date_received),
            quoteNumber: quote.quote_number || '',
            status: (quote.status as QuoteStatus) || QuoteStatus.PENDING,
            accepted_date: quote.accepted_date ? safeDate(quote.accepted_date) : undefined,
            valid_until: quote.valid_until ? safeDate(quote.valid_until) : undefined,
            rejection_reason: quote.rejection_reason || undefined,
            estimate_line_item_id: undefined, // Removed field - quote links via quote_line_items.estimate_line_item_id
            includes_materials: quote.includes_materials ?? true,
            includes_labor: quote.includes_labor ?? true,
            lineItems: (quote.quote_line_items || []).map((item: any) => ({
              id: item.id || '',
              estimateLineItemId: item.estimate_line_item_id || undefined,
              category: item.category,
              description: item.description || '',
              quantity: safeNumber(item.quantity, 1),
              pricePerUnit: safeNumber(item.rate),
              total: safeNumber(item.total),
              costPerUnit: safeNumber(item.cost_per_unit),
              markupPercent: item.markup_percent ? safeNumber(item.markup_percent) : null,
              markupAmount: item.markup_amount ? safeNumber(item.markup_amount) : null,
              totalCost: safeNumber(item.total_cost) || (safeNumber(item.quantity, 1) * safeNumber(item.cost_per_unit)),
              totalMarkup: safeNumber(item.total_markup)
            })),
            subtotals: {
              labor: 0,
              subcontractors: 0,
              materials: 0,
              equipment: 0,
              other: 0
            },
            total: safeNumber(quote.total_amount),
            notes: quote.notes || undefined,
            attachment_url: quote.attachment_url || undefined,
            createdAt: safeDate(quote.created_at)
          };
        } catch (error) {
          console.error('Error transforming quote:', error, quote);
          // Return a minimal valid quote object to prevent crashes
          return {
            id: quote.id || Date.now().toString(),
            project_id: quote.project_id || '',
            estimate_id: quote.estimate_id || '',
            projectName: 'Unknown Project',
            client: 'Unknown Client',
            payee_id: quote.payee_id || '',
            quotedBy: 'Unknown Payee',
            dateReceived: new Date(),
            quoteNumber: 'INVALID',
            status: QuoteStatus.PENDING,
            includes_materials: true,
            includes_labor: true,
            lineItems: [],
            subtotals: { labor: 0, subcontractors: 0, materials: 0, equipment: 0, other: 0 },
            total: 0,
            createdAt: new Date()
          };
        }
      });

      // Transform estimates to match the expected Estimate type with error handling
      const transformedEstimates: Estimate[] = (estimatesData || []).map(estimate => {
        try {
          // Helper function to safely parse numbers
          const safeNumber = (value: any, defaultValue: number = 0): number => {
            const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
            return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
          };

          // Helper function to safely parse dates
          const safeDate = (dateStr: any): Date => {
            if (!dateStr) return new Date();
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? new Date() : date;
          };

          return {
            id: estimate.id || '',
            project_id: estimate.project_id || '',
            project_name: estimate.projects?.project_name || '',
            client_name: estimate.projects?.client_name || '',
            estimate_number: estimate.estimate_number || '',
            revision_number: safeNumber(estimate.revision_number, 1),
            date: safeDate(estimate.date_created),
            date_created: safeDate(estimate.date_created),
            total_amount: safeNumber(estimate.total_amount),
            status: estimate.status || 'draft',
            notes: estimate.notes || undefined,
            contingency_percent: safeNumber(estimate.contingency_percent, 10.0),
            contingency_amount: safeNumber(estimate.contingency_amount),
            contingency_used: safeNumber(estimate.contingency_used),
            version_number: safeNumber(estimate.version_number, 1),
            parent_estimate_id: estimate.parent_estimate_id || undefined,
            is_current_version: estimate.is_current_version ?? true,
            valid_for_days: safeNumber(estimate.valid_for_days, 30),
            created_at: safeDate(estimate.created_at),
            updated_at: safeDate(estimate.updated_at),
            createdAt: safeDate(estimate.created_at),
            lineItems: (estimate.estimate_line_items || []).map((item: any) => ({
              id: item.id || '',
              category: item.category,
              description: item.description || '',
              quantity: safeNumber(item.quantity, 1),
              rate: safeNumber(item.rate),
              pricePerUnit: safeNumber(item.price_per_unit || item.rate),
              total: safeNumber(item.total),
              unit: item.unit || undefined,
              costPerUnit: safeNumber(item.cost_per_unit),
              markupPercent: item.markup_percent ? safeNumber(item.markup_percent) : null,
              markupAmount: item.markup_amount ? safeNumber(item.markup_amount) : null,
              totalCost: safeNumber(item.total_cost) || (safeNumber(item.quantity, 1) * safeNumber(item.cost_per_unit)),
              totalMarkup: safeNumber(item.total_markup),
              sortOrder: safeNumber(item.sort_order)
            })),
            defaultMarkupPercent: 25,
            targetMarginPercent: 20
          };
        } catch (error) {
          console.error('Error transforming estimate:', error, estimate);
          // Return a minimal valid estimate object to prevent crashes
          return {
            id: estimate.id || Date.now().toString(),
            project_id: estimate.project_id || '',
            project_name: 'Unknown Project',
            client_name: 'Unknown Client',
            estimate_number: 'INVALID',
            revision_number: 1,
            date: new Date(),
            date_created: new Date(),
            total_amount: 0,
            status: 'draft',
            contingency_percent: 10.0,
            contingency_used: 0,
            version_number: 1,
            is_current_version: true,
            valid_for_days: 30,
            created_at: new Date(),
            updated_at: new Date(),
            createdAt: new Date(),
            lineItems: [],
            defaultMarkupPercent: 25,
            targetMarginPercent: 20
          };
        }
      });

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
        // Extract sequence number from quote_number (e.g., "225-012-QTE-01-02" → 2)
        const sequenceNumber = parseInt(quote.quoteNumber.split('-').pop() || '1', 10);
        
        const { error } = await supabase
          .from('quotes')
          .update({
            project_id: quote.project_id,
            estimate_id: quote.estimate_id,
            payee_id: quote.payee_id,
            quote_number: quote.quoteNumber,
            sequence_number: sequenceNumber,
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
              rate: item.pricePerUnit,
              cost_per_unit: item.costPerUnit || 0,
              markup_percent: item.markupPercent,
              markup_amount: item.markupAmount,
              sort_order: 0
            })));

          if (lineItemsError) throw lineItemsError;
        }
      } else {
        // Create new quote with retry logic for duplicate quote numbers
        let quoteData;
        let quoteError;
        let retryAttempt = 0;
        const maxRetries = 1;
        
        while (retryAttempt <= maxRetries) {
          // Extract sequence number from quote_number (e.g., "225-012-QTE-01-02" → 2)
          const sequenceNumber = parseInt(quote.quoteNumber.split('-').pop() || '1', 10);
          
          const insertResult = await supabase
            .from('quotes')
            .insert({
              project_id: quote.project_id,
              estimate_id: quote.estimate_id,
              payee_id: quote.payee_id,
              quote_number: quote.quoteNumber,
              sequence_number: sequenceNumber,
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
          
          quoteData = insertResult.data;
          quoteError = insertResult.error;
          
          // Check if it's a duplicate key error (PostgreSQL code 23505)
          if (quoteError && quoteError.code === '23505' && retryAttempt < maxRetries) {
            // Regenerate quote number and retry
            const { data: newQuoteNumber, error: rpcError } = await supabase
              .rpc('generate_quote_number', {
                project_number_param: quote.project_number || '',
                project_id_param: quote.project_id,
                estimate_id_param: quote.estimate_id
              });
            
            if (rpcError || !newQuoteNumber) {
              toast({
                title: "Error",
                description: "Failed to generate new quote number",
                variant: "destructive",
              });
              throw quoteError;
            }
            
            quote.quoteNumber = newQuoteNumber;
            retryAttempt++;
            continue;
          }
          
          break;
        }

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
              rate: item.pricePerUnit,
              cost_per_unit: item.costPerUnit || 0,
              markup_percent: item.markupPercent,
              markup_amount: item.markupAmount,
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

  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setView('view');
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
    return <BrandedLoader message="Loading quotes..." />;
  }

  return (
    <div className="space-y-3">
      {!isMobile && view === 'list' && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Quotes</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">
            {view === 'list' ? 'Quotes' : 
             view === 'create' ? 'Create New Quote' :
             view === 'edit' ? 'Edit Quote' :
             view === 'view' ? 'View Quote' :
             'Compare Quote'}
          </h1>
          <p className="text-muted-foreground">
            {view === 'list' ? 'Manage project quotes and compare against estimates' :
             view === 'create' ? 'Enter quote details below' :
             view === 'edit' ? 'Update quote details' :
             view === 'view' ? 'Review quote details' :
             selectedQuote ? `Compare quote ${selectedQuote.quoteNumber} against estimate` : ''}
          </p>
        </div>
        
        {view === 'list' && (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowExportModal(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setView('create')} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'list' && (
        <>
          <QuoteFilters
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            resultCount={filteredQuotes.length}
            clients={clients}
            payees={payees}
          />
          <QuotesList
            quotes={filteredQuotes}
            estimates={estimates}
            onView={handleViewQuote}
            onEdit={handleEditQuote}
            onDelete={handleDeleteQuote}
            onCompare={handleCompareQuote}
            onExpire={handleExpireQuotes}
            onCreateNew={() => setView('create')}
          />
        </>
      )}

      {view === 'create' && (
        <QuoteForm
          estimates={estimates}
          preSelectedEstimateId={preSelectedEstimateId}
          onSave={handleSaveQuote}
          onCancel={() => {
            setView('list');
            setPreSelectedEstimateId(undefined);
          }}
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

      {view === 'view' && selectedQuote && (
        <QuoteForm
          mode="view"
          estimates={estimates}
          initialQuote={selectedQuote}
          onSave={() => {}}
          onCancel={() => { setView('list'); setSelectedQuote(undefined); }}
        />
      )}

      {view === 'compare' && selectedQuote && selectedEstimate && (
        <QuoteComparison
          quote={selectedQuote}
          estimate={selectedEstimate}
          onBack={() => setView('list')}
        />
      )}

      <QuoteExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        filters={searchFilters}
      />
    </div>
  );
};

export default Quotes;