import { useState, useEffect } from "react";
import { Save, Calendar as CalendarIcon, Plus, ArrowRight, TrendingUp, TrendingDown, Check } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatCurrency } from "@/lib/utils";
import { ProjectSelector } from "./ProjectSelector";
import { PayeeSelector } from "./PayeeSelector";
import { PdfUpload } from "./PdfUpload";
import { Estimate, LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { Quote, QuoteLineItem, QuoteStatus } from "@/types/quote";
import { Payee } from "@/types/payee";
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
  onSave: (quote: Quote) => void;
  onCancel: () => void;
}

export const QuoteForm = ({ estimates, initialQuote, onSave, onCancel }: QuoteFormProps) => {
  const { toast } = useToast();
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate>();
  const [selectedLineItemIds, setSelectedLineItemIds] = useState<string[]>([]);
  const [showLineItemSelection, setShowLineItemSelection] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<Payee>();
  const [dateReceived, setDateReceived] = useState<Date>(new Date());
  const [status, setStatus] = useState<QuoteStatus>(QuoteStatus.PENDING);
  const [validUntil, setValidUntil] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, QuoteValidationResult>>({});

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

  const createQuoteLineItemFromEstimate = (estimateItem: LineItem): QuoteLineItem => ({
    id: Date.now().toString() + Math.random(),
    estimateLineItemId: estimateItem.id,
    category: estimateItem.category,
    description: estimateItem.description,
    quantity: estimateItem.quantity,
    pricePerUnit: estimateItem.pricePerUnit, // Locked to estimate price
    total: estimateItem.total, // Based on estimate price
    costPerUnit: estimateItem.costPerUnit, // Start with estimate cost for vendor input
    markupPercent: null,
    markupAmount: null,
    totalCost: estimateItem.totalCost,
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

  useEffect(() => {
    if (initialQuote) {
      const estimate = estimates.find(e => e.id === initialQuote.estimate_id);
      setSelectedEstimate(estimate);
      setDateReceived(initialQuote.dateReceived);
      setStatus(initialQuote.status);
      setValidUntil(initialQuote.valid_until);
      setNotes(initialQuote.notes || "");
      setLineItems(initialQuote.lineItems);
      setAttachmentUrl(initialQuote.attachment_url || "");
    }
  }, [initialQuote, estimates]);

  useEffect(() => {
    if (selectedEstimate && !initialQuote) {
      // Show line item selection instead of auto-importing
      setShowLineItemSelection(true);
      
      // Set default valid until date
      const defaultValidUntil = new Date();
      defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
      setValidUntil(defaultValidUntil);
    }
  }, [selectedEstimate, initialQuote]);

  const handleLineItemSelection = () => {
    if (selectedLineItemIds.length === 0) {
      toast({
        title: "No Line Items Selected",
        description: "Please select at least one line item to quote.",
        variant: "destructive"
      });
      return;
    }

    const selectedEstimateItems = selectedEstimate!.lineItems.filter(item => 
      selectedLineItemIds.includes(item.id)
    );

    // Validate: prevent internal labor categories from being quoted
    const internalItems = selectedEstimateItems.filter(item => 
      item.category === LineItemCategory.LABOR || 
      item.category === LineItemCategory.MANAGEMENT
    );

    if (internalItems.length > 0) {
      const internalNames = internalItems.map(item => item.description).join(', ');
      toast({
        title: "Cannot Quote Internal Labor",
        description: `The following items are internal labor/management and cannot have external vendor quotes: ${internalNames}. Please change their category to Subcontractors first.`,
        variant: "destructive"
      });
      return;
    }

    const quoteLineItems = selectedEstimateItems.map(createQuoteLineItemFromEstimate);
    setLineItems(quoteLineItems);
    setShowLineItemSelection(false);
  };

  const toggleLineItemSelection = (lineItemId: string) => {
    setSelectedLineItemIds(prev => 
      prev.includes(lineItemId) 
        ? prev.filter(id => id !== lineItemId)
        : [...prev, lineItemId]
    );
  };

  const selectAllLineItems = () => {
    setSelectedLineItemIds(selectedEstimate?.lineItems.map(item => item.id) || []);
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
            
            // Validate quote amount when cost changes
            if (field === 'costPerUnit' || field === 'quantity') {
              const estimateLineItem = selectedEstimate?.lineItems.find(est => est.id === updated.estimateLineItemId);
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
    if (!selectedEstimate) {
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

    // Get project data for hierarchical quote number generation
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('project_number')
      .eq('id', selectedEstimate.project_id)
      .single();
    
    let quoteNumber = initialQuote?.quoteNumber;
    if (!quoteNumber) {
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
    }

    const quote: Quote = {
      id: initialQuote?.id || Date.now().toString(),
      project_id: selectedEstimate.project_id,
      estimate_id: selectedEstimate.id,
      projectName: selectedEstimate.project_name || '',
      client: selectedEstimate.client_name || '',
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
    toast({
      title: initialQuote ? "Quote Updated" : "Quote Saved",
      description: `Quote ${quote.quoteNumber} from ${quote.quotedBy} has been saved.`
    });
  };

  if (!selectedEstimate) {
    return (
      <Card className="compact-card">
        <CardHeader className="p-compact">
          <CardTitle className="text-interface">Create New Quote</CardTitle>
        </CardHeader>
        <CardContent className="p-compact">
          <div className="form-dense">
            <div className="space-y-2">
              <Label className="text-label">Select Project Estimate</Label>
              <div className="space-y-2">
                {estimates.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-label">No estimates available</p>
                    <p className="text-label">Create an estimate first to generate quotes</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {estimates
                      .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())
                      .map((estimate) => (
                        <Card 
                          key={estimate.id} 
                          className="cursor-pointer hover:bg-accent transition-colors compact-card"
                          onClick={() => setSelectedEstimate(estimate)}
                        >
                          <CardContent className="p-compact">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-interface font-medium">{estimate.project_name}</div>
                                <div className="text-label text-muted-foreground">{estimate.client_name}</div>
                                <div className="text-label text-muted-foreground">
                                  {estimate.estimate_number} • {format(new Date(estimate.date_created), "MMM d, yyyy")}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-interface font-medium font-mono">{formatCurrency(estimate.total_amount)}</div>
                                <div className="text-label text-muted-foreground">
                                  {estimate.lineItems.length} line item{estimate.lineItems.length !== 1 ? 's' : ''}
                                </div>
                                <Badge variant={estimate.lineItems.length > 0 ? "default" : "secondary"} className="compact-badge">
                                  {estimate.lineItems.length > 0 ? "Ready" : "Empty"}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" onClick={onCancel} size="sm" className="h-btn-compact text-label">Cancel</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Line Item Selection Step
  if (showLineItemSelection) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Line Items to Quote</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedEstimate.project_name} • {selectedEstimate.client_name}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedEstimate(undefined);
                setShowLineItemSelection(false);
                setSelectedLineItemIds([]);
              }}
            >
              Change Estimate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedEstimate.lineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>This estimate has no line items.</p>
              <p className="text-sm">Add line items to the estimate first.</p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => setSelectedEstimate(undefined)}>
                  Select Different Estimate
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Select the line items you want to include in this quote ({selectedLineItemIds.length} selected)
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllLineItems}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAllLineItems}>
                    Clear All
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                {selectedEstimate.lineItems.map((item) => {
                  const isInternalCategory = item.category === LineItemCategory.LABOR || 
                                            item.category === LineItemCategory.MANAGEMENT;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={cn(
                        "flex items-center space-x-3 p-3 border rounded-lg",
                        isInternalCategory && "opacity-50 bg-muted/30"
                      )}
                    >
                      <Checkbox
                        checked={selectedLineItemIds.includes(item.id)}
                        onCheckedChange={() => toggleLineItemSelection(item.id)}
                        disabled={isInternalCategory}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{item.description}</div>
                            <div className="text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    isInternalCategory && "border-amber-500 text-amber-700 bg-amber-50"
                                  )}
                                >
                                  {CATEGORY_DISPLAY_MAP[item.category]}
                                </Badge>
                                {item.quantity} {item.unit || 'units'} × {formatCurrency(item.pricePerUnit)}
                              </span>
                              {isInternalCategory && (
                                <span className="block text-xs text-amber-700 mt-1">
                                  Cannot quote internal labor - use time entries instead
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(item.total)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedEstimate(undefined);
                      setShowLineItemSelection(false);
                      setSelectedLineItemIds([]);
                    }}
                  >
                    Back
                  </Button>
                  <Button onClick={handleLineItemSelection}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Continue with Selected Items ({selectedLineItemIds.length})
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Filter estimate line items to only include those that correspond to quote line items
  const relevantEstimateLineItems = selectedEstimate.lineItems.filter(item => 
    lineItems.some(quoteItem => quoteItem.estimateLineItemId === item.id)
  );
  const estimateFinancials = calculateEstimateFinancials(relevantEstimateLineItems);
  const quoteFinancials = calculateQuoteFinancials(lineItems);
  
  // Calculate profit metrics
  const totalProfit = calculateQuoteTotalProfit(lineItems, relevantEstimateLineItems);
  const profitMargin = calculateQuoteProfitMargin(totalProfit, estimateFinancials.totalAmount);
  const profitStatus = getProfitStatus(profitMargin);

  return (
    <div className="form-dense space-y-2">
      {/* Header with Project Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{initialQuote ? 'Edit Quote' : 'Create Quote'}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedEstimate.project_name} • {selectedEstimate.client_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedEstimate(undefined)}
              >
                Change Estimate
              </Button>
              <Badge variant="outline">
                {selectedEstimate.estimate_number}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <PayeeSelector
              value={selectedPayee?.id}
              onValueChange={(payeeId, payeeName, payee) => {
                if (payee) setSelectedPayee(payee);
              }}
              placeholder="Select vendor/payee..."
              label="Vendor/Payee"
            />
            
            <div className="space-y-2">
              <Label>Date Received</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateReceived && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateReceived ? format(dateReceived, "PPP") : "Pick date"}
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
              <Label>Status</Label>
              <Select value={status} onValueChange={(value: QuoteStatus) => setStatus(value)}>
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
        </CardContent>
      </Card>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Your Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estimateFinancials.totalAmount)}</div>
            <div className="text-sm text-muted-foreground">Original estimated price</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Vendor Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(quoteFinancials.totalCost)}</div>
            <div className="text-sm text-muted-foreground">{selectedPayee?.payee_name || 'Total cost'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Profit Potential</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getProfitColor(totalProfit)}`}>
              {getProfitIcon(totalProfit)}
              {formatCurrency(totalProfit)}
            </div>
            <div className={`text-sm flex items-center gap-1 ${getProfitColor(totalProfit)}`}>
              {profitMargin.toFixed(1)}% margin • {profitStatus}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items Comparison</CardTitle>
            <Button size="sm" onClick={addLineItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <p className="text-lg font-medium">No line items available</p>
                <p className="text-sm">
                  {selectedEstimate.lineItems.length === 0 
                    ? "This estimate has no line items. Add your first item to get started."
                    : "Quote line items will appear here when you add them."
                  }
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
                {selectedEstimate.lineItems.length === 0 && (
                  <Button variant="outline" onClick={() => setSelectedEstimate(undefined)}>
                    Change Estimate
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {lineItems.map((item, index) => {
              const estimateItem = selectedEstimate.lineItems.find(e => e.id === item.estimateLineItemId);
              
              return (
                <div key={item.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{CATEGORY_DISPLAY_MAP[item.category]}</Badge>
                    {!estimateItem && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeLineItem(item.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Side-by-side table format */}
                  <div className="mobile-table-wrapper">
                    <table className="w-full border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-3 font-medium text-sm text-muted-foreground">Field</th>
                          <th className="text-left p-3 font-medium text-sm text-muted-foreground">Your Estimate</th>
                          <th className="text-left p-3 font-medium text-sm text-muted-foreground">Vendor Input</th>
                          <th className="text-left p-3 font-medium text-sm text-muted-foreground">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Description Row */}
                        <tr className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium text-sm">Description</td>
                          <td className="p-3 text-sm">{estimateItem?.description || 'N/A'}</td>
                          <td className="p-3">
                            <Input
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              placeholder="Item description"
                              className="h-8"
                            />
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">—</td>
                        </tr>

                        {/* Quantity Row */}
                        <tr className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium text-sm">Quantity</td>
                          <td className="p-3 text-sm">{estimateItem?.quantity || 'N/A'}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={item.quantity}
                              min="0"
                              step="0.01"
                              onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </td>
                          <td className="p-3 text-sm">
                            {estimateItem ? (
                              <span className={item.quantity !== estimateItem.quantity ? "text-amber-600" : "text-muted-foreground"}>
                                {(item.quantity - estimateItem.quantity) > 0 ? '+' : ''}{(item.quantity - estimateItem.quantity).toFixed(2)}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>

                        {/* Cost Per Unit Row - Now the main vendor input */}
                        <tr className="border-b hover:bg-muted/20 bg-blue-50/30">
                          <td className="p-3 font-medium text-sm">Vendor Cost per Unit</td>
                          <td className="p-3 text-sm">{formatCurrency(estimateItem?.costPerUnit || 0) || 'N/A'}</td>
                           <td className="p-3">
                             <div className="space-y-2">
                               <Input
                                 type="number"
                                 value={item.costPerUnit}
                                 min="0"
                                 step="0.01"
                                 onChange={(e) => updateLineItem(item.id, 'costPerUnit', parseFloat(e.target.value) || 0)}
                                 placeholder="0.00"
                                 className={cn(
                                   "h-8 border-blue-300 focus:border-blue-500",
                                   validationErrors[item.id] && !validationErrors[item.id].isValid && 
                                   validationErrors[item.id].severity === 'critical' && "border-destructive focus:border-destructive",
                                   validationErrors[item.id] && !validationErrors[item.id].isValid && 
                                   validationErrors[item.id].severity === 'warning' && "border-amber-500 focus:border-amber-500"
                                 )}
                               />
                               {validationErrors[item.id] && !validationErrors[item.id].isValid && (
                                 <div className={cn(
                                   "text-xs p-2 rounded-md",
                                   validationErrors[item.id].severity === 'critical' 
                                     ? "bg-destructive/10 text-destructive border border-destructive/20" 
                                     : "bg-amber-50 text-amber-700 border border-amber-200"
                                 )}>
                                   {validationErrors[item.id].error}
                                 </div>
                               )}
                             </div>
                           </td>
                          <td className="p-3 text-sm">
                            {estimateItem ? (
                              <span className={`flex items-center gap-1 font-medium ${getProfitColor(estimateItem.pricePerUnit - item.costPerUnit)}`}>
                                {getProfitIcon(estimateItem.pricePerUnit - item.costPerUnit)}
                                {formatCurrency(estimateItem.pricePerUnit - item.costPerUnit)} per unit
                              </span>
                            ) : '—'}
                          </td>
                        </tr>

                        {/* Markup Row (Estimate only) */}
                        {estimateItem && (
                          <tr className="border-b hover:bg-muted/20">
                            <td className="p-3 font-medium text-sm">Markup</td>
                            <td className="p-3 text-sm">
                              {estimateItem.markupPercent !== null ? `${estimateItem.markupPercent}%` : formatCurrency(estimateItem.markupAmount || 0)}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">Not disclosed</td>
                            <td className="p-3 text-sm text-muted-foreground">—</td>
                          </tr>
                        )}

                        {/* Price Per Unit Row - Now locked to estimate */}
                        <tr className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium text-sm">Price per Unit</td>
                          <td className="p-3 text-sm">{formatCurrency(estimateItem?.pricePerUnit || 0) || 'N/A'}</td>
                          <td className="p-3">
                            <div className="flex items-center h-8 px-3 py-2 bg-muted rounded-md text-sm font-medium border">
                              {formatCurrency(item.pricePerUnit)} (locked)
                            </div>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            Locked to estimate
                          </td>
                        </tr>

                        {/* Total Row */}
                        <tr className="border-b bg-muted/10">
                          <td className="p-3 font-medium text-sm">Revenue</td>
                          <td className="p-3 text-sm font-medium">{formatCurrency(estimateItem?.total || 0) || 'N/A'}</td>
                          <td className="p-3">
                            <div className="flex items-center h-8 px-3 py-2 bg-muted rounded-md text-sm font-medium">
                              {formatCurrency(item.total)}
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {estimateItem ? (
                              <span className={`flex items-center gap-1 font-bold ${getProfitColor((estimateItem.pricePerUnit - item.costPerUnit) * item.quantity)}`}>
                                {getProfitIcon((estimateItem.pricePerUnit - item.costPerUnit) * item.quantity)}
                                {formatProfit(estimateItem.pricePerUnit, item.costPerUnit, item.quantity)}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes and Attachments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this quote..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attachment</CardTitle>
          </CardHeader>
          <CardContent>
            <PdfUpload
              onUpload={(url, fileName) => setAttachmentUrl(url)}
              existingFile={attachmentUrl ? { url: attachmentUrl, name: "Quote Attachment" } : undefined}
              onRemove={() => setAttachmentUrl("")}
            />
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          {initialQuote ? 'Update Quote' : 'Save Quote'}
        </Button>
      </div>
    </div>
  );
};