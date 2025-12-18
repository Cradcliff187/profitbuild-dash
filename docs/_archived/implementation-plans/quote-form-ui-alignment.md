# QuoteForm Professional Refactor - Cursor Instructions

## Objective
Refactor the quote creation flow from a clunky two-step wizard into a sleek, professional single-page form that matches the existing UI patterns in ProfitBuild.

## Current Problems
1. **Duplicate headers** - Page header AND card header both say "Create New Quote"
2. **Wizard pattern mismatch** - Rest of app uses dropdown selectors for entity selection
3. **Orange selection state is confusing** - Single-select should just advance, not show "selected" state
4. **Too much vertical space** - Full-page card list is not data-dense
5. **Inconsistent with app patterns** - PayeeSelector, ProjectSelector use Command/Popover pattern

## Target State
- Single-page form matching PayeeSelector/ProjectSelector patterns
- Estimate selection via searchable dropdown popover
- Line items appear inline after estimate selection
- Clean, compact, professional - QuickBooks/Procore quality

---

## PHASE 1: Create EstimateSelector Component

**Create new file**: `src/components/EstimateSelector.tsx`

This component should match the pattern used by `ProjectSelector.tsx` and `PayeeSelector.tsx`.

```tsx
/**
 * @file EstimateSelector.tsx
 * @description Dropdown selector for estimates matching app's selector patterns.
 * Used in QuoteForm for selecting which estimate to quote against.
 */

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { Estimate } from "@/types/estimate";

interface EstimateSelectorProps {
  estimates: Estimate[];
  selectedEstimate?: Estimate;
  onSelect: (estimate: Estimate) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const EstimateSelector = ({
  estimates,
  selectedEstimate,
  onSelect,
  placeholder = "Select an estimate...",
  disabled = false
}: EstimateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEstimates = useMemo(() => {
    if (!searchQuery.trim()) return estimates;
    
    const query = searchQuery.toLowerCase();
    return estimates.filter(estimate =>
      estimate.project_name?.toLowerCase().includes(query) ||
      estimate.client_name?.toLowerCase().includes(query) ||
      estimate.estimate_number?.toLowerCase().includes(query)
    );
  }, [estimates, searchQuery]);

  // Sort by estimate number descending (newest first)
  const sortedEstimates = useMemo(() => {
    return [...filteredEstimates].sort((a, b) => {
      const getNumber = (estNum: string) => {
        const match = estNum?.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return getNumber(b.estimate_number) - getNumber(a.estimate_number);
    });
  }, [filteredEstimates]);

  const handleSelect = (estimate: Estimate) => {
    onSelect(estimate);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-auto min-h-[2.5rem] py-2",
            !selectedEstimate && "text-muted-foreground"
          )}
        >
          {selectedEstimate ? (
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex items-center gap-2 text-left min-w-0">
                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{selectedEstimate.project_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedEstimate.estimate_number} • {selectedEstimate.client_name}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-sm">{formatCurrency(selectedEstimate.total_amount)}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedEstimate.lineItems?.length || 0} items
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by project, client, or estimate number..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {estimates.length === 0 
                ? "No estimates available. Create an estimate first."
                : "No estimates match your search."
              }
            </CommandEmpty>
            <CommandGroup>
              {sortedEstimates.map((estimate) => (
                <CommandItem
                  key={estimate.id}
                  value={estimate.id}
                  onSelect={() => handleSelect(estimate)}
                  className="flex items-center justify-between py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        selectedEstimate?.id === estimate.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{estimate.project_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {estimate.client_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {estimate.estimate_number}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="font-mono">{formatCurrency(estimate.total_amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {estimate.lineItems?.length || 0} line items
                    </div>
                    <Badge 
                      variant={estimate.lineItems?.length > 0 ? "default" : "secondary"} 
                      className="text-xs mt-1"
                    >
                      {estimate.lineItems?.length > 0 ? "Ready" : "Empty"}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
```

---

## PHASE 2: Refactor QuoteForm to Single-Page Layout

**File to modify**: `src/components/QuoteForm.tsx`

### Step 2.1: Remove Wizard Step Logic

**Find and remove** the separate return blocks for:
- `if (!selectedEstimate) { ... }` - the estimate selection step
- `if (showLineItemSelection) { ... }` - the line item selection step

**Replace with** a single unified form layout.

### Step 2.2: New QuoteForm Structure

Replace the entire component render with this structure:

```tsx
// Remove showLineItemSelection state - no longer needed
// const [showLineItemSelection, setShowLineItemSelection] = useState(false);

// Add import at top of file
import { EstimateSelector } from "./EstimateSelector";

// In the component, when estimate is selected, auto-populate line items:
useEffect(() => {
  if (selectedEstimate && !initialQuote) {
    // Auto-select all eligible line items when estimate changes
    const eligibleItems = selectedEstimate.lineItems.filter(item => 
      item.category !== LineItemCategory.LABOR && 
      item.category !== LineItemCategory.MANAGEMENT
    );
    setSelectedLineItemIds(eligibleItems.map(item => item.id));
    
    // Create quote line items from selected estimate items
    const quoteLineItems = eligibleItems.map(item => 
      createQuoteLineItemFromSource(item, 'estimate')
    );
    setLineItems(quoteLineItems);
  }
}, [selectedEstimate?.id]);

// New unified return - single page form
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
        {/* Row 1: Estimate Selector (if new quote) */}
        {!initialQuote && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Project Estimate <span className="text-destructive">*</span>
            </Label>
            <EstimateSelector
              estimates={estimates}
              selectedEstimate={selectedEstimate}
              onSelect={setSelectedEstimate}
              placeholder="Select an estimate to quote against..."
            />
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
              disabled={isViewMode}
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

        {/* Line Items Section - Only show when estimate is selected */}
        {selectedEstimate && (
          <>
            <Separator />
            
            {/* Line Items Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Line Items</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedLineItemIds.length} of {selectedEstimate.lineItems.length} items selected
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={selectAllLineItems}
                  disabled={isViewMode}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearAllLineItems}
                  disabled={isViewMode}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-10 p-3 text-left"></th>
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">Category</th>
                    <th className="p-3 text-right font-medium">Est. Cost</th>
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

                    return (
                      <tr 
                        key={item.id}
                        className={cn(
                          "transition-colors",
                          isInternal && "bg-muted/30 text-muted-foreground",
                          isSelected && !isInternal && "bg-primary/5"
                        )}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleLineItemSelection(item.id)}
                            disabled={isInternal || isViewMode}
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
                          {isSelected && quoteItem ? (
                            <Input
                              type="number"
                              value={quoteItem.costPerUnit}
                              onChange={(e) => updateLineItem(quoteItem.id, 'costPerUnit', e.target.value)}
                              className="w-24 h-8 text-right font-mono ml-auto"
                              disabled={isViewMode}
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
      </CardContent>

      {/* Footer Actions */}
      <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/30">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {!isViewMode && (
          <Button 
            onClick={handleSave}
            disabled={!selectedEstimate || !selectedPayee || selectedLineItemIds.length === 0}
          >
            {initialQuote ? 'Update Quote' : 'Create Quote'}
          </Button>
        )}
      </div>
    </Card>
  </div>
);
```

---

## PHASE 3: Clean Up Removed Code

**Remove from QuoteForm.tsx:**

1. `showLineItemSelection` state variable
2. `setShowLineItemSelection` calls
3. `handleLineItemSelection` function (merge into save logic)
4. `estimateSearchQuery` state (now in EstimateSelector)
5. `filteredAndSortedEstimates` memo (now in EstimateSelector)
6. The two separate return blocks for wizard steps

---

## PHASE 4: Update Quotes Page

**File to modify**: `src/pages/Quotes.tsx`

The page-level header "Create New Quote / Enter quote details below" should remain as the page context. The QuoteForm no longer duplicates this.

Verify the page structure is:
```tsx
{view === 'create' && (
  <>
    {/* Page header is handled by the page, not the form */}
    <QuoteForm
      estimates={estimates}
      preSelectedEstimateId={preSelectedEstimateId}
      onSave={handleSaveQuote}
      onCancel={() => setView('list')}
    />
  </>
)}
```

---

## Design Specifications

### Typography
- Labels: `text-sm font-medium`
- Values: `font-mono` for currency
- Muted text: `text-muted-foreground`

### Spacing
- Card padding: default CardContent padding
- Section gaps: `space-y-6`
- Grid gaps: `gap-4`
- Table cell padding: `p-3`

### Colors
- Selected row: `bg-primary/5`
- Disabled/internal: `bg-muted/30 text-muted-foreground`
- Positive variance: `text-green-600`
- Negative variance: `text-destructive`
- Footer background: `bg-muted/30`

### Interactive States
- Buttons: Use existing shadcn variants
- Hover on table rows: `transition-colors`
- Disabled inputs: `disabled` prop

---

## Verification Checklist

After refactoring, verify:

1. [ ] EstimateSelector dropdown opens with searchable list
2. [ ] Selecting estimate populates line items table
3. [ ] Line items table shows checkboxes, costs, variance
4. [ ] Internal labor items are disabled with explanation
5. [ ] Select All/Clear buttons work
6. [ ] Quote cost inputs update variance in real-time
7. [ ] Totals summary calculates correctly
8. [ ] Create Quote button disabled until estimate + vendor + items selected
9. [ ] No duplicate "Create New Quote" headers
10. [ ] Form matches visual density of rest of app
11. [ ] Edit mode pre-populates correctly
12. [ ] View mode disables all inputs

---

## Files to Create/Modify

**Create:**
- `src/components/EstimateSelector.tsx`

**Modify:**
- `src/components/QuoteForm.tsx` (major refactor)
- `src/pages/Quotes.tsx` (minor - verify no duplicate headers)

**Do Not Modify:**
- Database queries
- Quote save logic (reuse existing handleSave)
- Type definitions
