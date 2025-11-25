import { useState, useEffect, useMemo } from "react";
import { Save, Calendar as CalendarIcon, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatCurrency } from "@/lib/utils";
import { ProjectSelector } from "./ProjectSelector";
import { PayeeSelector } from "./PayeeSelector";
import { EstimateSelector } from "./EstimateSelector";
import { QuoteAttachmentUpload } from "./QuoteAttachmentUpload";
import { Info } from "lucide-react";
import { Estimate, LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { Quote, QuoteLineItem, QuoteStatus } from "@/types/quote";
import { Payee, PayeeType } from "@/types/payee";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateQuoteFinancials, calculateQuoteTotalProfit, calculateQuoteProfitMargin, getProfitStatus } from "@/utils/quoteFinancials";
import { calculateEstimateFinancials } from "@/utils/estimateFinancials";

interface QuoteValidationResult {
  isValid: boolean;
  error?: string;
  severity?: 'critical' | 'warning';
}

const validateQuoteAmount = (costPerUnit: number, quantity: number, estimateLineItem?: LineItem): QuoteValidationResult => {
  if (!estimateLineItem) return { isValid: true };
  
  const quoteAmount = costPerUnit * quantity;
  const clientPrice = estimateLineItem.pricePerUnit * quantity;
  const estimatedCost = estimateLineItem.costPerUnit * quantity;
  
  // Critical: Quote cost >= client price
  if (quoteAmount >= clientPrice) {
    return {
      isValid: false,
      error: `Vendor cost (${formatCurrency(quoteAmount)}) equals/exceeds client price (${formatCurrency(clientPrice)}). Quotes should be vendor COSTS, not client prices.`,
      severity: 'critical'
    };
  }
  
  // Warning: Quote cost >20% higher than estimate
  if (quoteAmount > estimatedCost * 1.2) {
    return {
      isValid: false,
      error: `Vendor cost (${formatCurrency(quoteAmount)}) is 20% higher than estimated cost (${formatCurrency(estimatedCost)}). Please verify this is the vendor cost, not client price.`,
      severity: 'warning'
    };
  }
  
  return { isValid: true };
};

interface QuoteFormProps {
  estimates: Estimate[];
  initialQuote?: Quote;
  preSelectedEstimateId?: string;
  onSave: (quote: Quote) => void;
  onCancel: () => void;
  mode?: 'edit' | 'view';
}

export const QuoteForm = ({ estimates, initialQuote, preSelectedEstimateId, onSave, onCancel, mode = 'edit' }: QuoteFormProps) => {
  const { toast } = useToast();
  const isEdit = !!initialQuote;
  const isViewMode = mode === 'view';
  
  // Initialize selectedEstimate synchronously when editing
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | undefined>(() => {
    if (!initialQuote) return undefined;
    // Try to resolve immediately from provided estimates
    return estimates.find(e => e.id === initialQuote.estimate_id) || undefined;
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedLineItemIds, setSelectedLineItemIds] = useState<string[]>([]);
  const [selectedPayee, setSelectedPayee] = useState<Payee>();
  const [dateReceived, setDateReceived] = useState<Date>(new Date());
  const [status, setStatus] = useState<QuoteStatus>(QuoteStatus.PENDING);
  const [validUntil, setValidUntil] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, QuoteValidationResult>>({});
  const [changeOrderLineItems, setChangeOrderLineItems] = useState<any[]>([]);
  const [existingQuotesCoverage, setExistingQuotesCoverage] = useState<Record<string, {
    count: number;
    lowestCost: number | null;
    hasAccepted: boolean;
  }>>({});

  // Auto-select estimate when navigating from project details
  useEffect(() => {
    if (preSelectedEstimateId && !selectedEstimate && !initialQuote) {
      const estimate = estimates.find(e => e.id === preSelectedEstimateId);
      if (estimate) {
        setSelectedProjectId(estimate.project_id); // Auto-select project
        setSelectedEstimate(estimate); // Auto-select estimate
      }
    }
  }, [preSelectedEstimateId, estimates, selectedEstimate, initialQuote]);

  // Create unique project list from estimates
  const uniqueProjects = useMemo(() => {
    const projectMap = new Map();
    estimates.forEach(est => {
      if (est.project_id && !projectMap.has(est.project_id)) {
        projectMap.set(est.project_id, {
          id: est.project_id,
          project_number: est.project_number,
          project_name: est.project_name,
          client_name: est.client_name
        });
      }
    });
    return Array.from(projectMap.values()).sort((a, b) => 
      (a.project_number || '').localeCompare(b.project_number || '', undefined, { numeric: true })
    );
  }, [estimates]);

  // Filter estimates by selected project
  const projectEstimates = useMemo(() => {
    if (!selectedProjectId) return [];
    return estimates.filter(est => est.project_id === selectedProjectId);
  }, [estimates, selectedProjectId]);

  const generateQuoteNumber = async (projectId: string, projectNumber: string, estimateId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_quote_number', {
        project_number_param: projectNumber,
        project_id_param: projectId,
        estimate_id_param: estimateId
      });
      
      if (error) {
        console.error('Error generating quote number:', error);
        // Fallback to timestamp-based number
        return `QTE-${Date.now().toString().slice(-6)}`;
      }
      
      return data;
    } catch (error) {
      console.error('Error generating quote number:', error);
      // Fallback to timestamp-based number  
      return `QTE-${Date.now().toString().slice(-6)}`;
    }
  };

  const createQuoteLineItemFromSource = (item: any, source: 'estimate' | 'change_order'): QuoteLineItem => ({
    id: Date.now().toString() + Math.random(),
    estimateLineItemId: source === 'estimate' ? item.id : undefined,
    changeOrderLineItemId: source === 'change_order' ? item.id : undefined,
    changeOrderNumber: source === 'change_order' ? item.change_order_number : undefined,
    category: item.category,
    description: source === 'change_order' 
      ? `[${item.change_order_number}] ${item.description}`
      : item.description,
    quantity: item.quantity,
    pricePerUnit: source === 'change_order' ? item.pricePerUnit : item.pricePerUnit,
    total: source === 'change_order' ? item.total : item.total,
    costPerUnit: source === 'change_order' ? item.costPerUnit : item.costPerUnit,
    markupPercent: null,
    markupAmount: null,
    totalCost: source === 'change_order' ? item.totalCost : item.totalCost,
    totalMarkup: 0
  });

  const createNewQuoteLineItem = (): QuoteLineItem => ({
    id: Date.now().toString() + Math.random(),
    category: LineItemCategory.LABOR,
    description: '',
    quantity: 0,
    pricePerUnit: 0,
    total: 0,
    costPerUnit: 0,
    markupPercent: null,
    markupAmount: null,
    totalCost: 0,
    totalMarkup: 0
  });

  // Fallback effect to resolve estimate if not found synchronously
  useEffect(() => {
    if (!isEdit) return;
    
    // Skip estimate resolution for change order quotes (they don't have an estimate)
    if (initialQuote && !initialQuote.estimate_id) return;
    
    if (!selectedEstimate && estimates.length) {
      const match = initialQuote?.estimate_id
        ? estimates.find(e => e.id === initialQuote.estimate_id)
        : undefined;
      const fallback =
        match ||
        estimates.find(e => e.is_current_version) ||
        [...estimates].sort((a, b) => b.version_number - a.version_number)[0] ||
        estimates[0];

      if (fallback) {
        setSelectedEstimate(fallback);
      }
    }
  }, [isEdit, initialQuote?.estimate_id, estimates, selectedEstimate]);

  useEffect(() => {
    if (initialQuote) {
      const estimate = estimates.find(e => e.id === initialQuote.estimate_id);
      if (estimate) setSelectedEstimate(estimate);
      setDateReceived(initialQuote.dateReceived);
      setStatus(initialQuote.status);
      setValidUntil(initialQuote.valid_until);
      setNotes(initialQuote.notes || "");
      setLineItems(initialQuote.lineItems);
      setAttachmentUrl(initialQuote.attachment_url || "");
    }
  }, [initialQuote, estimates]);

  // Fetch and set payee in edit mode
  useEffect(() => {
    const loadPayee = async () => {
      if (!initialQuote?.payee_id) return;
      const { data, error } = await supabase
        .from('payees')
        .select('*')
        .eq('id', initialQuote.payee_id)
        .maybeSingle();
      if (!error && data) {
        setSelectedPayee(data as Payee);
      }
    };
    if (isEdit) loadPayee();
  }, [isEdit, initialQuote?.payee_id]);

  useEffect(() => {
    if (selectedEstimate && !initialQuote) {
      // Fetch approved change orders for the same project
      const fetchChangeOrders = async () => {
        const { data, error } = await supabase
          .from('change_orders')
          .select(`
            id,
            change_order_number,
            description,
            change_order_line_items (
              id,
              category,
              description,
              quantity,
              cost_per_unit,
              price_per_unit,
              total_cost,
              total_price,
              payee_id,
              unit
            )
          `)
          .eq('project_id', selectedEstimate.project_id)
          .eq('status', 'approved');
        
        if (!error && data) {
          const allCOLineItems = data.flatMap(co => 
            co.change_order_line_items.map(item => ({
              ...item,
              source: 'change_order',
              change_order_number: co.change_order_number,
              change_order_id: co.id,
              // Map to estimate line item structure
              pricePerUnit: item.price_per_unit,
              costPerUnit: item.cost_per_unit,
              totalCost: item.total_cost,
              total: item.total_price,
            }))
          );
          setChangeOrderLineItems(allCOLineItems);
        }
      };
      
      fetchChangeOrders();
      
      // Set default valid until date
      const defaultValidUntil = new Date();
      defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
      setValidUntil(defaultValidUntil);
    }
  }, [selectedEstimate, initialQuote]);

  // Default to no line items selected - user must manually select
  useEffect(() => {
    if (selectedEstimate && !initialQuote) {
      // Default to no line items selected
      setSelectedLineItemIds([]);
      setLineItems([]);
    }
  }, [selectedEstimate?.id, initialQuote]);

  // Fetch existing quotes coverage when estimate is selected
  useEffect(() => {
    const fetchExistingQuotes = async () => {
      if (!selectedEstimate) {
        setExistingQuotesCoverage({});
        return;
      }

      try {
        const { data: quotes, error } = await supabase
          .from('quotes')
          .select(`
            id,
            status,
            quote_line_items (
              estimate_line_item_id,
              cost_per_unit,
              total_cost
            )
          `)
          .eq('estimate_id', selectedEstimate.id)
          .neq('id', initialQuote?.id || '');

        if (error) {
          console.error('Error fetching existing quotes:', error);
          return;
        }

        // Calculate coverage per line item
        const coverage: Record<string, {
          count: number;
          lowestCost: number | null;
          hasAccepted: boolean;
        }> = {};

        quotes?.forEach((quote: any) => {
          const quoteLineItems = quote.quote_line_items || [];
          quoteLineItems.forEach((qli: any) => {
            if (qli.estimate_line_item_id) {
              const lineItemId = qli.estimate_line_item_id;
              if (!coverage[lineItemId]) {
                coverage[lineItemId] = {
                  count: 0,
                  lowestCost: null,
                  hasAccepted: false
                };
              }
              coverage[lineItemId].count++;
              const cost = qli.total_cost || (qli.cost_per_unit || 0);
              if (coverage[lineItemId].lowestCost === null || cost < coverage[lineItemId].lowestCost!) {
                coverage[lineItemId].lowestCost = cost;
              }
              if (quote.status === QuoteStatus.ACCEPTED) {
                coverage[lineItemId].hasAccepted = true;
              }
            }
          });
        });

        setExistingQuotesCoverage(coverage);
      } catch (error) {
        console.error('Error processing existing quotes:', error);
      }
    };

    fetchExistingQuotes();
  }, [selectedEstimate?.id, initialQuote?.id]);

  // Update line items when selection changes
  useEffect(() => {
    if (selectedEstimate && !initialQuote && selectedLineItemIds.length > 0) {
      // Combine all sources
      const allItems = [
        ...selectedEstimate.lineItems.map(item => ({ ...item, source: 'estimate' as const })),
        ...changeOrderLineItems
      ];
      
      const selectedItems = allItems.filter(item => 
        selectedLineItemIds.includes(item.id)
      );

      // Filter out internal labor items
      const validItems = selectedItems.filter(item => 
        !(item.source === 'estimate' && (
          item.category === LineItemCategory.LABOR || 
          item.category === LineItemCategory.MANAGEMENT
        ))
      );

      const quoteLineItems = validItems.map(item => 
        createQuoteLineItemFromSource(item, item.source)
      );
      setLineItems(quoteLineItems);
    } else if (selectedEstimate && !initialQuote && selectedLineItemIds.length === 0) {
      setLineItems([]);
    }
  }, [selectedLineItemIds, selectedEstimate, changeOrderLineItems, initialQuote]);

  const toggleLineItemSelection = (lineItemId: string) => {
    setSelectedLineItemIds(prev => 
      prev.includes(lineItemId) 
        ? prev.filter(id => id !== lineItemId)
        : [...prev, lineItemId]
    );
  };

  const selectAllLineItems = () => {
    // Only select eligible items (exclude internal labor/management)
    const eligibleEstimateIds = selectedEstimate?.lineItems
      .filter(item => item.category !== LineItemCategory.LABOR && item.category !== LineItemCategory.MANAGEMENT)
      .map(item => item.id) || [];
    const allIds = [
      ...eligibleEstimateIds,
      ...changeOrderLineItems.map(item => item.id)
    ];
    setSelectedLineItemIds(allIds);
  };

  const clearAllLineItems = () => {
    setSelectedLineItemIds([]);
  };

  const updateLineItem = (id: string, field: keyof QuoteLineItem, value: any) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          
          // Safely parse and validate numeric values
          const parseNumber = (val: any): number => {
            const parsed = typeof val === 'string' ? parseFloat(val) : Number(val);
            return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
          };
          
          // For quotes, price per unit is locked to estimate price
          // Only quantity affects the total revenue
          if (field === 'quantity') {
            const quantity = parseNumber(updated.quantity);
            updated.quantity = quantity;
            updated.total = quantity * updated.pricePerUnit; // Keep estimate price
          }
          
          if (field === 'quantity' || field === 'costPerUnit') {
            const quantity = parseNumber(updated.quantity);
            const costPerUnit = parseNumber(updated.costPerUnit);
            updated.quantity = quantity;
            updated.costPerUnit = costPerUnit;
            updated.totalCost = quantity * costPerUnit;
            
            // Validate quote amount when cost changes (only if we have an estimate to compare against)
            if ((field === 'costPerUnit' || field === 'quantity') && selectedEstimate) {
              const estimateLineItem = selectedEstimate.lineItems.find(est => est.id === updated.estimateLineItemId);
              const validation = validateQuoteAmount(costPerUnit, quantity, estimateLineItem);
              setValidationErrors(prev => ({
                ...prev,
                [id]: validation
              }));
            }
          }
          
          // Ensure all numeric fields are valid numbers
          if (field === 'quantity') updated.quantity = parseNumber(value);
          if (field === 'costPerUnit') updated.costPerUnit = parseNumber(value);
          // pricePerUnit is locked to estimate value
          
          return updated;
        }
        return item;
      })
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, createNewQuoteLineItem()]);
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-green-600";
    if (profit < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const getProfitIcon = (profit: number) => {
    if (profit > 0) return <TrendingUp className="h-3 w-3" />;
    if (profit < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  const formatProfit = (estimatePrice: number, vendorCost: number, quantity: number = 1) => {
    const profitPerUnit = estimatePrice - vendorCost;
    const totalProfit = profitPerUnit * quantity;
    const marginPercent = estimatePrice > 0 ? (profitPerUnit / estimatePrice) * 100 : 0;
    
    return `${formatCurrency(totalProfit)} (${marginPercent.toFixed(1)}%)`;
  };

  const determineQuoteIncludes = (lineItems: QuoteLineItem[]) => {
    const includes_materials = lineItems.some(item => 
      item.category === LineItemCategory.MATERIALS
    );
    
    const includes_labor = lineItems.some(item => 
      item.category === LineItemCategory.LABOR
    );
    
    return { includes_materials, includes_labor };
  };

  const handleSave = async () => {
    if (!selectedEstimate && !initialQuote) {
      toast({
        title: "Missing Project",
        description: "Please select a project estimate.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPayee) {
      toast({
        title: "Missing Payee",
        description: "Please select a payee/vendor.",
        variant: "destructive"
      });
      return;
    }

    // Optimistic update: Show saving state
    toast({
      title: "Saving Quote",
      description: "Processing quote details...",
    });

    // Only validate line item selection if we have an estimate (not for change order quotes)
    if (selectedEstimate && selectedLineItemIds.length === 0) {
      toast({
        title: "No Line Items Selected",
        description: "Please select at least one line item to quote.",
        variant: "destructive"
      });
      return;
    }

    if (lineItems.every(item => !item.description.trim())) {
      toast({
        title: "Missing Line Items",
        description: "Please add at least one line item.",
        variant: "destructive"
      });
      return;
    }

    // Validate all line items before saving
    const validLineItems = lineItems.filter(item => item.description.trim());
    let hasErrors = false;
    let hasWarnings = false;
    
    validLineItems.forEach(item => {
      const estimateLineItem = selectedEstimate?.lineItems.find(est => est.id === item.estimateLineItemId);
      const validation = validateQuoteAmount(item.costPerUnit, item.quantity, estimateLineItem);
      
      if (!validation.isValid) {
        if (validation.severity === 'critical') {
          hasErrors = true;
        } else {
          hasWarnings = true;
        }
        setValidationErrors(prev => ({
          ...prev,
          [item.id]: validation
        }));
      }
    });

    // Prevent save if critical errors exist
    if (hasErrors) {
      toast({
        title: "Validation Errors",
        description: "Please fix the critical validation errors before saving.",
        variant: "destructive"
      });
      return;
    }

    // Show warning confirmation if warnings exist
    if (hasWarnings) {
      const proceed = window.confirm(
        "There are validation warnings for some line items. These may indicate price/cost confusion. Do you want to proceed anyway?"
      );
      if (!proceed) return;
    }

    const financials = calculateQuoteFinancials(lineItems);
    const { includes_materials, includes_labor } = determineQuoteIncludes(lineItems.filter(item => item.description.trim()));

    let quoteNumber = initialQuote?.quoteNumber;
    if (!quoteNumber) {
      if (selectedEstimate) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('project_number')
          .eq('id', selectedEstimate.project_id)
          .single();

        if (projectError) {
          console.error('Error fetching project:', projectError);
          // Fallback to old format if project fetch fails
          quoteNumber = `QTE-${Date.now().toString().slice(-6)}`;
        } else {
          quoteNumber = await generateQuoteNumber(
            selectedEstimate.project_id, 
            projectData.project_number, 
            selectedEstimate.id
          );
        }
      } else {
        // No estimate (e.g., change order quote) - fallback number
        quoteNumber = `QTE-${Date.now().toString().slice(-6)}`;
      }
    }

    const quote: Quote = {
      id: initialQuote?.id || Date.now().toString(),
      project_id: selectedEstimate?.project_id || initialQuote!.project_id,
      estimate_id: selectedEstimate?.id || initialQuote?.estimate_id,
      projectName: selectedEstimate?.project_name || initialQuote?.projectName || '',
      client: selectedEstimate?.client_name || initialQuote?.client || '',
      payee_id: selectedPayee.id,
      quotedBy: selectedPayee.payee_name,
      dateReceived,
      status,
      valid_until: validUntil,
      accepted_date: status === QuoteStatus.ACCEPTED ? new Date() : undefined,
      quoteNumber,
      includes_materials,
      includes_labor,
      lineItems: lineItems.filter(item => item.description.trim()),
      subtotals: {
        labor: 0,
        subcontractors: 0,
        materials: 0,
        equipment: 0,
        other: 0
      },
      total: financials.totalAmount,
      notes: notes.trim() || undefined,
      attachment_url: attachmentUrl || undefined,
      createdAt: initialQuote?.createdAt || new Date()
    };

    onSave(quote);
    // Success toast moved to Quotes.tsx handleSaveQuote (shown after DB confirms save)
  };

  // Change order quotes don't need an estimate - show loading only if we're expecting an estimate
  if (!selectedEstimate) {
    const isChangeOrderQuote = isEdit && initialQuote && !initialQuote.estimate_id;
    
    if (isEdit && !isChangeOrderQuote) {
      return (
        <Card className="compact-card">
          <CardHeader className="p-compact">
            <CardTitle className="text-interface">Loading Quote…</CardTitle>
          </CardHeader>
          <CardContent className="p-compact text-label text-muted-foreground">
            Preparing quote for editing
          </CardContent>
        </Card>
      );
    }
  }

  // Filter estimate line items to only include those that correspond to quote line items
  const relevantEstimateLineItems = (selectedEstimate?.lineItems || []).filter(item => 
    lineItems.some(quoteItem => quoteItem.estimateLineItemId === item.id)
  );
  const estimateFinancials = calculateEstimateFinancials(relevantEstimateLineItems);
  const quoteFinancials = calculateQuoteFinancials(lineItems);
  
  // Calculate profit metrics
  const totalProfit = calculateQuoteTotalProfit(lineItems, relevantEstimateLineItems);
  const profitMargin = calculateQuoteProfitMargin(totalProfit, estimateFinancials.totalAmount);
  const profitStatus = getProfitStatus(profitMargin);

  return (
    <div className="space-y-4">
      {/* Main Form Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isViewMode ? 'Quote Details' : (initialQuote ? 'Edit Quote' : 'New Quote')}
              </CardTitle>
              {selectedEstimate && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedEstimate.project_name} • {selectedEstimate.client_name}
                </p>
              )}
            </div>
            {initialQuote && (
              <Badge variant="outline">{initialQuote.quoteNumber}</Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Row 1: Project Selection → Estimate Selection */}
          {!initialQuote && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Dropdown */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Project <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={selectedProjectId} 
                  onValueChange={(value) => {
                    setSelectedProjectId(value);
                    setSelectedEstimate(undefined); // Reset estimate when project changes
                  }}
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_number} - {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Estimate Dropdown (only enabled after project selected) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Estimate <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={selectedEstimate?.id} 
                  onValueChange={(value) => {
                    const estimate = estimates.find(e => e.id === value);
                    if (estimate) setSelectedEstimate(estimate);
                  }}
                  disabled={!selectedProjectId || isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedProjectId ? "Select estimate..." : "Select project first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projectEstimates.map(estimate => (
                      <SelectItem key={estimate.id} value={estimate.id}>
                        {estimate.estimate_number} (v{estimate.version_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Row 2: Vendor, Date, Status - 3 column grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Vendor <span className="text-destructive">*</span>
              </Label>
              <PayeeSelector
                value={selectedPayee?.id || ''}
                onValueChange={(payeeId, payeeName, payee) => {
                  if (payee && !isViewMode) setSelectedPayee(payee);
                }}
                placeholder="Select vendor..."
                filterInternal={false}
                defaultPayeeType={PayeeType.SUBCONTRACTOR}
                defaultIsInternal={false}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date Received</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isViewMode}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateReceived && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateReceived ? format(dateReceived, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateReceived}
                    onSelect={(date) => date && setDateReceived(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select 
                value={status} 
                onValueChange={(value: QuoteStatus) => setStatus(value)} 
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QuoteStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={QuoteStatus.ACCEPTED}>Accepted</SelectItem>
                  <SelectItem value={QuoteStatus.REJECTED}>Rejected</SelectItem>
                  <SelectItem value={QuoteStatus.EXPIRED}>Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vendor Context Banner */}
          {selectedPayee && !isViewMode && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Quote from {selectedPayee.payee_name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select only the line items this vendor is bidding on. Other vendors can submit separate quotes.
                </p>
              </div>
            </div>
          )}

          {/* Line Items Section - Only show when estimate is selected */}
          {selectedEstimate && (
            <>
              <Separator />
              
              {/* Line Items Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    {selectedPayee ? 'Select line items this vendor is bidding on' : 'Line Items'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {!selectedPayee ? (
                      <span className="text-orange-600">Select a vendor first to choose line items</span>
                    ) : (
                      `${selectedLineItemIds.length} of ${selectedEstimate.lineItems.length} items selected`
                    )}
                  </p>
                </div>
                {selectedPayee && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={selectAllLineItems}
                      disabled={isViewMode || !selectedPayee}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={clearAllLineItems}
                      disabled={isViewMode || !selectedPayee}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              <div className={cn(
                "border rounded-lg overflow-hidden",
                !selectedPayee && "opacity-50"
              )}>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="w-10 p-3 text-left"></th>
                      <th className="p-3 text-left font-medium">Description</th>
                      <th className="p-3 text-left font-medium">Category</th>
                      <th className="p-3 text-right font-medium">Est. Cost</th>
                      <th className="p-3 text-right font-medium">Existing Quotes</th>
                      <th className="p-3 text-right font-medium">Quote Cost</th>
                      <th className="p-3 text-right font-medium">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedEstimate.lineItems.map((item) => {
                      const isInternal = item.category === LineItemCategory.LABOR || 
                                        item.category === LineItemCategory.MANAGEMENT;
                      const isSelected = selectedLineItemIds.includes(item.id);
                      const quoteItem = lineItems.find(li => li.estimateLineItemId === item.id);
                      const variance = quoteItem 
                        ? (item.totalCost || 0) - (quoteItem.totalCost || 0)
                        : 0;
                      const coverage = existingQuotesCoverage[item.id] || { count: 0, lowestCost: null, hasAccepted: false };

                      return (
                        <tr 
                          key={item.id}
                          className={cn(
                            "transition-colors",
                            isInternal && "bg-muted/30 text-muted-foreground",
                            isSelected && !isInternal && "bg-primary/5",
                            !selectedPayee && "cursor-not-allowed"
                          )}
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => selectedPayee && toggleLineItemSelection(item.id)}
                              disabled={isInternal || isViewMode || !selectedPayee}
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{item.description}</div>
                            {isInternal && (
                              <div className="text-xs text-orange-600">
                                Internal labor - use time entries
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_DISPLAY_MAP[item.category]}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatCurrency(item.totalCost || 0)}
                          </td>
                          <td className="p-3 text-right">
                            {coverage.count > 0 ? (
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">
                                  {coverage.count} quote{coverage.count !== 1 ? 's' : ''}
                                </div>
                                {coverage.lowestCost !== null && (
                                  <div className="text-xs font-mono">
                                    Lowest: {formatCurrency(coverage.lowestCost)}
                                  </div>
                                )}
                                {coverage.hasAccepted && (
                                  <Badge variant="default" className="bg-green-600 text-white text-xs">
                                    Accepted
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">No quotes yet</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isSelected && quoteItem ? (
                              <Input
                                type="number"
                                value={quoteItem.costPerUnit}
                                onChange={(e) => updateLineItem(quoteItem.id, 'costPerUnit', e.target.value)}
                                className="w-24 h-8 text-right font-mono ml-auto"
                                disabled={isViewMode || !selectedPayee}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className={cn(
                            "p-3 text-right font-mono",
                            variance > 0 && "text-green-600",
                            variance < 0 && "text-destructive"
                          )}>
                            {isSelected && quoteItem ? formatCurrency(variance) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Cost:</span>
                    <span className="font-mono">{formatCurrency(estimateFinancials.totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quote Total:</span>
                    <span className="font-mono">{formatCurrency(quoteFinancials.totalCost)}</span>
                  </div>
                  <Separator />
                  <div className={cn(
                    "flex justify-between font-medium",
                    totalProfit > 0 && "text-green-600",
                    totalProfit < 0 && "text-destructive"
                  )}>
                    <span>Profit:</span>
                    <span className="font-mono">{formatCurrency(totalProfit)} ({profitMargin.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this quote..."
              rows={2}
              disabled={isViewMode}
            />
          </div>

          {/* Quote Document Upload */}
          {selectedEstimate && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quote Document</Label>
              <QuoteAttachmentUpload
                projectId={selectedEstimate.project_id}
                onUploadSuccess={(url) => setAttachmentUrl(url)}
                onRemove={() => setAttachmentUrl("")}
                existingFile={attachmentUrl ? { url: attachmentUrl, name: "Quote Attachment" } : undefined}
                disabled={isViewMode}
                relatedQuoteId={initialQuote?.id}
              />
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/30">
          <div className="flex flex-col">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {!isViewMode && !initialQuote && (
              <p className="text-xs text-muted-foreground mt-2">
                To add quotes from other vendors, save this quote first
              </p>
            )}
          </div>
          {!isViewMode && (
            <Button 
              onClick={handleSave}
              disabled={(!selectedEstimate && !initialQuote) || !selectedPayee || (selectedEstimate && selectedLineItemIds.length === 0)}
            >
              {initialQuote ? 'Update Quote' : 'Create Quote'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};