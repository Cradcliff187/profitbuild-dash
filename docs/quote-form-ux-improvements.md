# QuoteForm UX & Upload Improvements - Cursor Instructions

## Context

**Schema Reality:**
- A `quote` is ONE document from ONE vendor (`payee_id`)
- That vendor may bid on multiple `estimate_line_items`
- Multiple vendors can submit competing quotes for the same line items
- The `quotes` table has an `attachment_url` field for the quote document

**Current UI Problem:**
- Shows all line items implying user should fill in all of them
- Doesn't communicate "you're entering THIS vendor's quote"
- No way to upload the actual quote document (PDF/image)
- Doesn't show which line items already have quotes from other vendors

## Objectives

1. **Clear vendor context** - Make it obvious this form is for ONE vendor's quote
2. **Quote document upload** - Allow attaching the vendor's quote PDF/image
3. **Quote coverage visibility** - Show which line items already have quotes
4. **Professional, sleek UI** - Match existing app patterns

---

## PHASE 1: Add Quote Document Upload Component

### Step 1.1: Create QuoteAttachmentUpload Component

**Create file**: `src/components/QuoteAttachmentUpload.tsx`

```tsx
/**
 * @file QuoteAttachmentUpload.tsx
 * @description Upload component for quote documents (PDF, images)
 * Matches existing upload patterns in the app (receipts, project media)
 */

import { useState, useRef } from "react";
import { Upload, FileText, X, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QuoteAttachmentUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
  quoteId?: string; // For organizing storage path
  projectId?: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const QuoteAttachmentUpload = ({
  value,
  onChange,
  disabled = false,
  quoteId,
  projectId
}: QuoteAttachmentUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or image file (JPEG, PNG, WebP)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate storage path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = projectId 
        ? `quotes/${projectId}/${timestamp}-${sanitizedName}`
        : `quotes/${user.id}/${timestamp}-${sanitizedName}`;

      // Upload to project-documents bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(uploadData.path);

      onChange(publicUrl);

      toast({
        title: "Quote Uploaded",
        description: "Quote document attached successfully"
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = () => {
    onChange(undefined);
  };

  const getFileIcon = () => {
    if (!value) return null;
    return value.toLowerCase().includes('.pdf') ? (
      <FileText className="h-8 w-8 text-red-500" />
    ) : (
      <img src={value} alt="Quote" className="h-12 w-12 object-cover rounded" />
    );
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
        {getFileIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Quote Document</p>
          <p className="text-xs text-muted-foreground">Attached</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.open(value, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
        dragOver && "border-primary bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer hover:border-primary/50"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = '';
        }}
        disabled={disabled || isUploading}
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Upload Quote Document</p>
            <p className="text-xs text-muted-foreground">PDF or image, max 10MB</p>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## PHASE 2: Update QuoteForm with Better UX

### Step 2.1: Add Vendor Context Header

When a vendor is selected, make it prominent:

**Find the CardHeader section and update:**

```tsx
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
  
  {/* Vendor Context Banner - Show when vendor selected */}
  {selectedPayee && !isViewMode && (
    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-primary">
            Quote from {selectedPayee.payee_name}
          </p>
          <p className="text-xs text-muted-foreground">
            Select only the line items this vendor is bidding on
          </p>
        </div>
      </div>
    </div>
  )}
</CardHeader>
```

### Step 2.2: Add Quote Coverage to Line Items Table

Show which line items already have quotes from other vendors:

**First, fetch existing quote coverage when estimate is selected:**

```tsx
// Add state for quote coverage
const [quoteCovarage, setQuoteCoverage] = useState<Record<string, {
  count: number;
  vendors: string[];
  lowestCost: number | null;
  hasAccepted: boolean;
}>>({});

// Fetch quote coverage when estimate changes
useEffect(() => {
  const fetchQuoteCoverage = async () => {
    if (!selectedEstimate) return;
    
    const { data, error } = await supabase
      .from('quote_line_items')
      .select(`
        estimate_line_item_id,
        total_cost,
        quotes!inner (
          id,
          status,
          payee_id,
          payees (payee_name)
        )
      `)
      .in('estimate_line_item_id', selectedEstimate.lineItems.map(li => li.id));
    
    if (error) {
      console.error('Error fetching quote coverage:', error);
      return;
    }
    
    // Group by estimate_line_item_id
    const coverage: Record<string, any> = {};
    data?.forEach(qli => {
      const eliId = qli.estimate_line_item_id;
      if (!coverage[eliId]) {
        coverage[eliId] = {
          count: 0,
          vendors: [],
          lowestCost: null,
          hasAccepted: false
        };
      }
      coverage[eliId].count++;
      coverage[eliId].vendors.push(qli.quotes?.payees?.payee_name || 'Unknown');
      
      if (qli.quotes?.status === 'accepted') {
        coverage[eliId].hasAccepted = true;
      }
      
      const cost = qli.total_cost || 0;
      if (coverage[eliId].lowestCost === null || cost < coverage[eliId].lowestCost) {
        coverage[eliId].lowestCost = cost;
      }
    });
    
    setQuoteCoverage(coverage);
  };
  
  fetchQuoteCoverage();
}, [selectedEstimate?.id]);
```

**Update the line items table to show coverage:**

```tsx
<table className="w-full text-sm">
  <thead className="bg-muted/50">
    <tr>
      <th className="w-10 p-3 text-left"></th>
      <th className="p-3 text-left font-medium">Description</th>
      <th className="p-3 text-left font-medium">Category</th>
      <th className="p-3 text-right font-medium">Est. Cost</th>
      <th className="p-3 text-center font-medium">Existing Quotes</th>
      <th className="p-3 text-right font-medium">This Quote</th>
    </tr>
  </thead>
  <tbody className="divide-y">
    {selectedEstimate.lineItems.map((item) => {
      const isInternal = item.category === LineItemCategory.LABOR || 
                        item.category === LineItemCategory.MANAGEMENT;
      const isSelected = selectedLineItemIds.includes(item.id);
      const quoteItem = lineItems.find(li => li.estimateLineItemId === item.id);
      const coverage = quoteCoverage[item.id];

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
          
          {/* Existing Quotes Column */}
          <td className="p-3 text-center">
            {coverage ? (
              <div className="flex flex-col items-center gap-1">
                {coverage.hasAccepted ? (
                  <Badge variant="default" className="text-xs bg-green-600">
                    Accepted
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {coverage.count} quote{coverage.count !== 1 ? 's' : ''}
                  </Badge>
                )}
                {coverage.lowestCost !== null && !coverage.hasAccepted && (
                  <span className="text-xs text-muted-foreground">
                    Low: {formatCurrency(coverage.lowestCost)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </td>
          
          {/* This Quote Column */}
          <td className="p-3 text-right">
            {isSelected && quoteItem ? (
              <Input
                type="number"
                value={quoteItem.totalCost || ''}
                onChange={(e) => updateLineItem(quoteItem.id, 'totalCost', parseFloat(e.target.value) || 0)}
                className="w-28 h-8 text-right font-mono ml-auto"
                placeholder="0.00"
                disabled={isViewMode}
              />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
```

### Step 2.3: Add Quote Document Upload Field

**Add to the form, after the Vendor/Date/Status row:**

```tsx
{/* Row 3: Quote Document Upload */}
<div className="space-y-2">
  <Label className="text-sm font-medium">Quote Document</Label>
  <QuoteAttachmentUpload
    value={attachmentUrl}
    onChange={setAttachmentUrl}
    disabled={isViewMode}
    projectId={selectedEstimate?.project_id}
  />
</div>
```

**Make sure to import the component at the top:**

```tsx
import { QuoteAttachmentUpload } from "./QuoteAttachmentUpload";
```

---

## PHASE 3: Add Helper Text and Empty States

### Step 3.1: Line Items Section Header

Update the line items header with contextual help:

```tsx
{/* Line Items Section - Only show when estimate is selected */}
{selectedEstimate && (
  <>
    <Separator />
    
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium">Line Items</h3>
        <p className="text-sm text-muted-foreground">
          {selectedPayee 
            ? `Select items ${selectedPayee.payee_name} is quoting on`
            : 'Select a vendor first, then choose their line items'
          }
        </p>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={selectAllEligible}
          disabled={isViewMode || !selectedPayee}
        >
          Select Eligible
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
    
    {/* Info box when no vendor selected */}
    {!selectedPayee && (
      <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-center">
        <p className="text-sm text-muted-foreground">
          Select a vendor above to enter their quoted costs
        </p>
      </div>
    )}
  </>
)}
```

### Step 3.2: Update selectAllEligible Function

Only select non-internal items:

```tsx
const selectAllEligible = () => {
  if (!selectedEstimate) return;
  
  const eligibleIds = selectedEstimate.lineItems
    .filter(item => 
      item.category !== LineItemCategory.LABOR && 
      item.category !== LineItemCategory.MANAGEMENT
    )
    .map(item => item.id);
  
  setSelectedLineItemIds(eligibleIds);
  
  // Create quote line items for selected
  const quoteLineItems = eligibleIds.map(id => {
    const item = selectedEstimate.lineItems.find(li => li.id === id)!;
    return createQuoteLineItemFromSource(item, 'estimate');
  });
  
  setLineItems(quoteLineItems);
};
```

---

## PHASE 4: Footer with Next Steps Guidance

### Step 4.1: Update Footer

```tsx
{/* Footer Actions */}
<div className="flex flex-col gap-3 px-6 py-4 border-t bg-muted/30">
  <div className="flex justify-between items-center">
    <Button variant="outline" onClick={onCancel}>
      Cancel
    </Button>
    {!isViewMode && (
      <Button 
        onClick={handleSave}
        disabled={!selectedEstimate || !selectedPayee || selectedLineItemIds.length === 0}
      >
        {initialQuote ? 'Update Quote' : 'Save Quote'}
      </Button>
    )}
  </div>
  
  {/* Helpful tip for new quotes */}
  {!initialQuote && selectedPayee && selectedLineItemIds.length > 0 && (
    <p className="text-xs text-muted-foreground text-center">
      💡 To add quotes from other vendors, save this quote first, then create another.
    </p>
  )}
</div>
```

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| **QuoteAttachmentUpload.tsx** | New component for quote PDF/image upload |
| **QuoteForm.tsx** | Vendor context banner when vendor selected |
| **QuoteForm.tsx** | Quote coverage column showing existing quotes |
| **QuoteForm.tsx** | Quote document upload field |
| **QuoteForm.tsx** | Better helper text and empty states |
| **QuoteForm.tsx** | Footer guidance for adding more quotes |

## Design Specifications

### Colors
- Vendor context banner: `bg-primary/5 border-primary/20`
- Selected row: `bg-primary/5`
- Internal/disabled: `bg-muted/30 text-muted-foreground`
- Accepted quote badge: `bg-green-600`
- Warning text: `text-orange-600`

### Typography
- Labels: `text-sm font-medium`
- Helper text: `text-sm text-muted-foreground`
- Tiny text: `text-xs text-muted-foreground`
- Currency: `font-mono`

### Spacing
- Section gaps: `space-y-6`
- Card padding: default
- Table cells: `p-3`

---

## Verification Checklist

1. [ ] QuoteAttachmentUpload component created and working
2. [ ] Vendor context banner appears when vendor selected
3. [ ] "Existing Quotes" column shows quote count and lowest cost
4. [ ] Accepted quotes show green badge
5. [ ] Quote document upload works (PDF and images)
6. [ ] Line items disabled until vendor selected
7. [ ] Internal labor items remain disabled with explanation
8. [ ] Footer shows helpful tip about adding more vendor quotes
9. [ ] Form saves correctly with attachment URL
10. [ ] Edit mode pre-populates attachment correctly

---

## Files to Create/Modify

**Create:**
- `src/components/QuoteAttachmentUpload.tsx`

**Modify:**
- `src/components/QuoteForm.tsx`

**Do Not Modify:**
- Database schema (already correct)
- Storage buckets (project-documents already exists)
- Quote save logic (just pass attachment_url)
