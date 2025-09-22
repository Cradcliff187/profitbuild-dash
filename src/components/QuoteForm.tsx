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
import { cn } from "@/lib/utils";
import { ProjectSelector } from "./ProjectSelector";
import { PayeeSelector } from "./PayeeSelector";
import { PdfUpload } from "./PdfUpload";
import { Estimate, LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { Quote, QuoteLineItem, QuoteStatus } from "@/types/quote";
import { Payee } from "@/types/payee";
import { useToast } from "@/hooks/use-toast";
import { calculateQuoteFinancials } from "@/utils/quoteFinancials";
import { calculateEstimateFinancials } from "@/utils/estimateFinancials";

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

  const generateQuoteNumber = () => {
    return `QTE-${Date.now().toString().slice(-6)}`;
  };

  const createQuoteLineItemFromEstimate = (estimateItem: LineItem): QuoteLineItem => ({
    id: Date.now().toString() + Math.random(),
    estimateLineItemId: estimateItem.id,
    category: estimateItem.category,
    description: estimateItem.description,
    quantity: estimateItem.quantity,
    pricePerUnit: estimateItem.pricePerUnit, // Start with estimate price
    total: estimateItem.total,
    costPerUnit: estimateItem.costPerUnit,
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
          
          if (field === 'quantity' || field === 'pricePerUnit') {
            updated.total = updated.quantity * updated.pricePerUnit;
          }
          
          if (field === 'quantity' || field === 'costPerUnit') {
            updated.totalCost = updated.quantity * updated.costPerUnit;
          }
          
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

  const getVarianceColor = (estimated: number, quoted: number) => {
    if (quoted === estimated) return "text-muted-foreground";
    return quoted > estimated ? "text-destructive" : "text-green-600";
  };

  const getVarianceIcon = (estimated: number, quoted: number) => {
    if (quoted === estimated) return null;
    return quoted > estimated ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  const formatVariance = (estimated: number, quoted: number) => {
    const difference = quoted - estimated;
    const percentage = estimated > 0 ? (difference / estimated) * 100 : 0;
    const sign = difference >= 0 ? "+" : "";
    return `${sign}$${difference.toFixed(2)} (${sign}${percentage.toFixed(1)}%)`;
  };

  const handleSave = () => {
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

    const financials = calculateQuoteFinancials(lineItems);

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
      quoteNumber: initialQuote?.quoteNumber || generateQuoteNumber(),
      includes_materials: true,
      includes_labor: true,
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
      <Card>
        <CardHeader>
          <CardTitle>Create New Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Project Estimate</Label>
              <div className="space-y-3">
                {estimates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No estimates available</p>
                    <p className="text-sm">Create an estimate first to generate quotes</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {estimates
                      .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())
                      .map((estimate) => (
                        <Card 
                          key={estimate.id} 
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setSelectedEstimate(estimate)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{estimate.project_name}</div>
                                <div className="text-sm text-muted-foreground">{estimate.client_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {estimate.estimate_number} • {format(new Date(estimate.date_created), "MMM d, yyyy")}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">${estimate.total_amount.toFixed(2)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {estimate.lineItems.length} line item{estimate.lineItems.length !== 1 ? 's' : ''}
                                </div>
                                <Badge variant={estimate.lineItems.length > 0 ? "default" : "secondary"}>
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
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
            <div className="space-y-4">
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
                {selectedEstimate.lineItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedLineItemIds.includes(item.id)}
                      onCheckedChange={() => toggleLineItemSelection(item.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.description}</div>
                          <div className="text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {CATEGORY_DISPLAY_MAP[item.category]}
                              </Badge>
                              {item.quantity} {item.unit || 'units'} × ${item.pricePerUnit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${item.total.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

  const estimateFinancials = calculateEstimateFinancials(selectedEstimate.lineItems);
  const quoteFinancials = calculateQuoteFinancials(lineItems);

  return (
    <div className="space-y-6">
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Your Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${estimateFinancials.totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Original estimated price</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Vendor Quote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${quoteFinancials.totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">{selectedPayee?.payee_name || 'Quoted price'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getVarianceColor(estimateFinancials.totalAmount, quoteFinancials.totalAmount)}`}>
              {getVarianceIcon(estimateFinancials.totalAmount, quoteFinancials.totalAmount)}
              {formatVariance(estimateFinancials.totalAmount, quoteFinancials.totalAmount)}
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
            <div className="space-y-4">
              {lineItems.map((item, index) => {
              const estimateItem = selectedEstimate.lineItems.find(e => e.id === item.estimateLineItemId);
              
              return (
                <div key={item.id} className="border rounded-lg p-4 space-y-4">
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

                  {estimateItem && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Original Estimate</h4>
                        <div className="text-sm space-y-1">
                          <div><strong>Description:</strong> {estimateItem.description}</div>
                          <div><strong>Quantity:</strong> {estimateItem.quantity}</div>
                          <div><strong>Cost:</strong> ${estimateItem.costPerUnit.toFixed(2)} per unit</div>
                          <div><strong>Markup:</strong> {estimateItem.markupPercent !== null ? `${estimateItem.markupPercent}%` : `$${(estimateItem.markupAmount || 0).toFixed(2)}`}</div>
                          <div><strong>Price:</strong> ${estimateItem.pricePerUnit.toFixed(2)} per unit</div>
                          <div><strong>Total:</strong> ${estimateItem.total.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        min="0"
                        step="0.01"
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quote Price</Label>
                      <Input
                        type="number"
                        value={item.pricePerUnit}
                        min="0"
                        step="0.01"
                        onChange={(e) => updateLineItem(item.id, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total</Label>
                      <div className="flex items-center h-10 px-3 py-2 bg-muted rounded-md">
                        <span className="font-medium">${item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {estimateItem && (
                    <div className={`text-sm flex items-center gap-2 ${getVarianceColor(estimateItem.total, item.total)}`}>
                      {getVarianceIcon(estimateItem.total, item.total)}
                      <span>Variance: {formatVariance(estimateItem.total, item.total)}</span>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes and Attachments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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