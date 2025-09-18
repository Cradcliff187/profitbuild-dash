import { useState, useEffect } from "react";
import { Save, Calendar as CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ProjectSelector } from "./ProjectSelector";
import { PayeeSelector } from "./PayeeSelector";
import { LineItemRow } from "./LineItemRow";
import { PdfUpload } from "./PdfUpload";
import { Estimate, LineItem, LineItemCategory } from "@/types/estimate";
import { Quote, QuoteLineItem, QuoteStatus } from "@/types/quote";
import { Payee } from "@/types/payee";
import { useToast } from "@/hooks/use-toast";

interface QuoteFormProps {
  estimates: Estimate[];
  initialQuote?: Quote; // For editing mode
  onSave: (quote: Quote) => void;
  onCancel: () => void;
}

export const QuoteForm = ({ estimates, initialQuote, onSave, onCancel }: QuoteFormProps) => {
  const { toast } = useToast();
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate>();
  const [selectedPayee, setSelectedPayee] = useState<Payee>();
  const [quotedBy, setQuotedBy] = useState("");
  const [dateReceived, setDateReceived] = useState<Date>(new Date());
  const [status, setStatus] = useState<QuoteStatus>(QuoteStatus.PENDING);
  const [validUntil, setValidUntil] = useState<Date>();
  const [acceptedDate, setAcceptedDate] = useState<Date>();
  const [rejectionReason, setRejectionReason] = useState("");
  const [notes, setNotes] = useState("")
  const [attachmentUrl, setAttachmentUrl] = useState<string>("")
  const [attachmentFileName, setAttachmentFileName] = useState<string>("")
  const [includesMaterials, setIncludesMaterials] = useState(true)
  const [includesLabor, setIncludesLabor] = useState(true)
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [subtotals, setSubtotals] = useState({
    labor: 0,
    subcontractors: 0,
    materials: 0,
    equipment: 0,
    other: 0
  });
  const [total, setTotal] = useState(0);

  const generateQuoteNumber = () => {
    return `QTE-${Date.now().toString().slice(-6)}`;
  };

  const createQuoteLineItemFromEstimate = (estimateItem: LineItem): QuoteLineItem => ({
    id: Date.now().toString() + Math.random(),
    estimateLineItemId: estimateItem.id,
    category: estimateItem.category,
    description: estimateItem.description,
    quantity: estimateItem.quantity,
    rate: 0, // Reset rate for quote entry
    total: 0
  });

  const createNewQuoteLineItem = (): QuoteLineItem => ({
    id: Date.now().toString() + Math.random(),
    category: LineItemCategory.LABOR,
    description: '',
    quantity: 0,
    rate: 0,
    total: 0
  });

  useEffect(() => {
    if (initialQuote) {
      // Load existing quote for editing
      const estimate = estimates.find(e => e.id === initialQuote.estimate_id);
      setSelectedEstimate(estimate);
      setQuotedBy(initialQuote.quotedBy);
      setDateReceived(initialQuote.dateReceived);
      setStatus(initialQuote.status);
      setValidUntil(initialQuote.valid_until);
      setAcceptedDate(initialQuote.accepted_date);
      setRejectionReason(initialQuote.rejection_reason || "");
      setNotes(initialQuote.notes || "");
      setLineItems(initialQuote.lineItems);
      setAttachmentUrl(initialQuote.attachment_url || "");
      setAttachmentFileName(initialQuote.attachment_url ? "Attached PDF" : "");
      setIncludesMaterials(initialQuote.includes_materials);
      setIncludesLabor(initialQuote.includes_labor);
      // Note: selectedPayee will be set when PayeeSelector loads payees
    }
  }, [initialQuote, estimates]);

  useEffect(() => {
    if (selectedEstimate && !initialQuote) {
      // Pre-populate line items from selected estimate only for new quotes
      const quoteLineItems = selectedEstimate.lineItems.map(createQuoteLineItemFromEstimate);
      setLineItems(quoteLineItems);
    }
  }, [selectedEstimate, initialQuote]);

  useEffect(() => {
    // Calculate totals whenever line items change
    const newSubtotals = {
      labor: 0,
      subcontractors: 0,
      materials: 0,
      equipment: 0,
      other: 0
    };

    lineItems.forEach(item => {
      const itemTotal = item.quantity * item.rate;
      switch (item.category) {
        case 'labor_internal':
          newSubtotals.labor += itemTotal;
          break;
        case 'subcontractors':
          newSubtotals.subcontractors += itemTotal;
          break;
        case 'materials':
          newSubtotals.materials += itemTotal;
          break;
        case 'equipment':
          newSubtotals.equipment += itemTotal;
          break;
        case 'other':
          newSubtotals.other += itemTotal;
          break;
      }
    });

    setSubtotals(newSubtotals);
    setTotal(Object.values(newSubtotals).reduce((sum, val) => sum + val, 0));
  }, [lineItems]);

  const updateLineItem = (id: string, field: keyof QuoteLineItem, value: any) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updated.total = updated.quantity * updated.rate;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, createNewQuoteLineItem()]);
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
        title: "Missing Information",
        description: "Please select a payee.",
        variant: "destructive"
      });
      return;
    }

    if (lineItems.every(item => !item.description.trim())) {
      toast({
        title: "Missing Line Items",
        description: "Please add at least one line item with a description.",
        variant: "destructive"
      });
      return;
    }

    // Validation for status-specific fields
    if (status === QuoteStatus.REJECTED && !rejectionReason.trim()) {
      toast({
        title: "Missing Rejection Reason",
        description: "Please provide a reason when rejecting a quote.",
        variant: "destructive"
      });
      return;
    }

    const quote: Quote = {
      id: initialQuote?.id || Date.now().toString(),
      project_id: selectedEstimate.project_id,
      estimate_id: selectedEstimate.id,
      projectName: selectedEstimate.project_name || '',
      client: selectedEstimate.client_name || '',
      payee_id: selectedPayee.id,
      quotedBy: selectedPayee.vendor_name,
      dateReceived,
      status,
      valid_until: validUntil,
       accepted_date: status === QuoteStatus.ACCEPTED ? (acceptedDate || new Date()) : undefined,
       rejection_reason: status === QuoteStatus.REJECTED ? rejectionReason.trim() : undefined,
      quoteNumber: initialQuote?.quoteNumber || generateQuoteNumber(),
      includes_materials: includesMaterials,
      includes_labor: includesLabor,
      lineItems: lineItems.filter(item => item.description.trim()),
      subtotals,
      total,
      notes: notes.trim() || undefined,
      attachment_url: attachmentUrl || undefined,
      createdAt: initialQuote?.createdAt || new Date()
    };

    onSave(quote);
    toast({
      title: initialQuote ? "Quote Updated" : "Quote Saved",
      description: `Quote ${quote.quoteNumber} from ${quote.quotedBy} has been ${initialQuote ? 'updated' : 'created'} successfully.`
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{initialQuote ? 'Edit Quote' : 'Create New Quote'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Select Project Estimate</Label>
            <ProjectSelector
              estimates={estimates}
              selectedEstimate={selectedEstimate}
              onSelect={setSelectedEstimate}
              placeholder="Choose a project to quote..."
            />
            {selectedEstimate && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="font-medium">{selectedEstimate.project_name}</div>
                <div className="text-muted-foreground">
                  Client: {selectedEstimate.client_name} • 
                  Estimate Total: ${selectedEstimate.total_amount.toFixed(2)} • 
                  {selectedEstimate.estimate_number}
                </div>
              </div>
            )}
          </div>

          {/* Quote Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PayeeSelector
              selectedPayeeId={selectedPayee?.id}
              onSelect={(payee) => {
                setSelectedPayee(payee);
                setQuotedBy(payee.vendor_name);
              }}
              placeholder="Select payee for this quote..."
              label="Subcontractor/Payee"
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
                    {dateReceived ? format(dateReceived, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateReceived}
                    onSelect={(date) => date && setDateReceived(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Quote Status and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quote Status</Label>
              <Select value={status} onValueChange={(value: QuoteStatus) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value={QuoteStatus.PENDING}>Pending</SelectItem>
                   <SelectItem value={QuoteStatus.ACCEPTED}>Accepted</SelectItem>
                   <SelectItem value={QuoteStatus.REJECTED}>Rejected</SelectItem>
                   <SelectItem value={QuoteStatus.EXPIRED}>Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valid Until (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !validUntil && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validUntil ? format(validUntil, "PPP") : <span>No expiration</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validUntil}
                    onSelect={setValidUntil}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Quote Includes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quote Includes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includesMaterials"
                  checked={includesMaterials}
                  onChange={(e) => setIncludesMaterials(e.target.checked)}
                  className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                />
                <Label htmlFor="includesMaterials">Includes Materials</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includesLabor"
                  checked={includesLabor}
                  onChange={(e) => setIncludesLabor(e.target.checked)}
                  className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                />
                <Label htmlFor="includesLabor">Includes Labor</Label>
              </div>
            </div>
          </div>

          {/* Conditional Status Fields */}
          {status === QuoteStatus.ACCEPTED && (
            <div className="space-y-2">
              <Label>Accepted Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !acceptedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {acceptedDate ? format(acceptedDate, "PPP") : <span>Select acceptance date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={acceptedDate}
                    onSelect={setAcceptedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {status === QuoteStatus.REJECTED && (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this quote..."
                rows={3}
                required
              />
            </div>
          )}

          {selectedEstimate && (
            <>
              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Quote Line Items</h3>
                  <Button onClick={addLineItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line Item
                  </Button>
                </div>

                {/* Line Items Header */}
                <div className="grid grid-cols-12 gap-4 p-2 text-sm font-medium text-muted-foreground border-b">
                  <div className="col-span-2">Category</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Rate</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  {lineItems.map(lineItem => (
                    <LineItemRow
                      key={lineItem.id}
                      lineItem={lineItem as any}
                      onUpdate={updateLineItem as any}
                      onRemove={removeLineItem}
                    />
                  ))}
                </div>
              </div>

              {/* Totals */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Labor:</span>
                        <span className="font-medium">${subtotals.labor.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subcontractors:</span>
                        <span className="font-medium">${subtotals.subcontractors.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Materials:</span>
                        <span className="font-medium">${subtotals.materials.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Equipment:</span>
                        <span className="font-medium">${subtotals.equipment.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Other:</span>
                        <span className="font-medium">${subtotals.other.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Quote Total:</span>
                        <span className="text-primary">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this quote..."
                  rows={3}
                />
              </div>

              {/* PDF Upload */}
              <div className="space-y-2">
                <Label>Quote Attachment</Label>
                <PdfUpload
                  onUpload={(url, fileName) => {
                    setAttachmentUrl(url);
                    setAttachmentFileName(fileName);
                  }}
                  existingFile={attachmentUrl ? { url: attachmentUrl, name: attachmentFileName } : undefined}
                  onRemove={() => {
                    setAttachmentUrl("");
                    setAttachmentFileName("");
                  }}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={!selectedEstimate || !selectedPayee}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Quote
            </Button>
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};