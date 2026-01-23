# Internal Labor Cushion Feature Implementation

**Feature:** Internal Labor Two-Tier Pricing with Dynamic Cushion Calculation
**Priority:** High - Core Financial Accuracy
**Created:** January 2025

---

## Executive Summary

RCG uses a two-tier pricing model for internal labor:
- **Billing Rate:** $75/hr (what appears in estimates/client pricing)
- **Actual Cost Rate:** $35/hr (real internal labor cost)
- **Labor Cushion:** The difference ($40/hr) represents hidden profit margin

The cushion varies based on markup percentage applied. This feature adds proper tracking and calculation of labor cushion across the estimate system.

---

## Business Rules

### Core Calculation Logic

```
For labor_internal line items:

1. User enters hours and billing rate (or total at billing rate)
2. System calculates actual cost using company setting
3. Cushion = (Billing Rate - Actual Cost Rate) × Hours
4. Client Price = Billing Rate × Hours × (1 + Markup%)
5. True Profit = Cushion + Standard Markup Amount

Example:
  Hours: 200
  Billing Rate: $75/hr → $15,000
  Actual Cost Rate: $35/hr → $7,000
  Markup: 25%
  
  Cushion: ($75 - $35) × 200 = $8,000
  Client Price: $15,000 × 1.25 = $18,750
  Standard Markup: $15,000 × 0.25 = $3,750
  True Profit: $8,000 + $3,750 = $11,750
```

### Variable Markup Consideration

The markup percentage can vary per line item, affecting the final cushion benefit:

| Markup % | Hours | Billing Total | Cushion | Markup Amount | True Profit |
|----------|-------|---------------|---------|---------------|-------------|
| 0% | 200 | $15,000 | $8,000 | $0 | $8,000 |
| 25% | 200 | $15,000 | $8,000 | $3,750 | $11,750 |
| 50% | 200 | $15,000 | $8,000 | $7,500 | $15,500 |

The cushion amount is constant (based on hours), but total profit varies with markup.

---

## Phase 1: Database Schema Changes

### 1.1 Create Company Settings Table (if not exists)

**File:** `supabase/migrations/[timestamp]_add_company_labor_settings.sql`

```sql
-- Check if company_settings table exists, if not create it
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to company_settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin write access to company_settings"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Insert default labor rate settings
INSERT INTO public.company_settings (setting_key, setting_value, description)
VALUES (
  'internal_labor_rates',
  '{
    "billing_rate_per_hour": 75.00,
    "actual_cost_per_hour": 35.00,
    "effective_date": "2025-01-01"
  }'::jsonb,
  'Internal labor billing rate vs actual cost rate for cushion calculations'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_settings_timestamp
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();
```

### 1.2 Add Labor-Specific Fields to estimate_line_items

**File:** `supabase/migrations/[timestamp]_add_labor_cushion_fields.sql`

```sql
-- Add labor-specific tracking fields to estimate_line_items
ALTER TABLE public.estimate_line_items
ADD COLUMN IF NOT EXISTS labor_hours NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_rate_per_hour NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_cost_rate_per_hour NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS labor_cushion_amount NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN category = 'labor_internal' AND labor_hours IS NOT NULL 
    THEN labor_hours * COALESCE(billing_rate_per_hour, 0) - labor_hours * COALESCE(actual_cost_rate_per_hour, 0)
    ELSE 0
  END
) STORED;

-- Add same fields to change_order_line_items for consistency
ALTER TABLE public.change_order_line_items
ADD COLUMN IF NOT EXISTS labor_hours NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_rate_per_hour NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_cost_rate_per_hour NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS labor_cushion_amount NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN category = 'labor_internal' AND labor_hours IS NOT NULL 
    THEN labor_hours * COALESCE(billing_rate_per_hour, 0) - labor_hours * COALESCE(actual_cost_rate_per_hour, 0)
    ELSE 0
  END
) STORED;

-- Add comments for documentation
COMMENT ON COLUMN public.estimate_line_items.labor_hours IS 'Number of labor hours for internal labor items';
COMMENT ON COLUMN public.estimate_line_items.billing_rate_per_hour IS 'Hourly rate shown to client (e.g., $75/hr)';
COMMENT ON COLUMN public.estimate_line_items.actual_cost_rate_per_hour IS 'Actual internal labor cost rate (e.g., $35/hr)';
COMMENT ON COLUMN public.estimate_line_items.labor_cushion_amount IS 'Generated: Hidden profit from labor rate differential';
```

### 1.3 Add Labor Cushion Summary to Estimates Table

**File:** `supabase/migrations/[timestamp]_add_estimate_labor_summary.sql`

```sql
-- Add labor cushion summary field to estimates
ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS total_labor_cushion NUMERIC DEFAULT 0;

-- Create function to calculate total labor cushion for an estimate
CREATE OR REPLACE FUNCTION calculate_estimate_labor_cushion(p_estimate_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_cushion NUMERIC;
BEGIN
  SELECT COALESCE(SUM(labor_cushion_amount), 0)
  INTO v_cushion
  FROM estimate_line_items
  WHERE estimate_id = p_estimate_id
    AND category = 'labor_internal';
  
  RETURN v_cushion;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update estimate labor cushion when line items change
CREATE OR REPLACE FUNCTION update_estimate_labor_cushion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent estimate's total labor cushion
  IF TG_OP = 'DELETE' THEN
    UPDATE estimates
    SET total_labor_cushion = calculate_estimate_labor_cushion(OLD.estimate_id),
        updated_at = now()
    WHERE id = OLD.estimate_id;
    RETURN OLD;
  ELSE
    UPDATE estimates
    SET total_labor_cushion = calculate_estimate_labor_cushion(NEW.estimate_id),
        updated_at = now()
    WHERE id = NEW.estimate_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_estimate_labor_cushion
  AFTER INSERT OR UPDATE OR DELETE ON public.estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_estimate_labor_cushion();

-- Backfill existing estimates (run once after migration)
-- This will be 0 for existing items until they're updated with labor_hours
UPDATE estimates e
SET total_labor_cushion = (
  SELECT COALESCE(SUM(labor_cushion_amount), 0)
  FROM estimate_line_items eli
  WHERE eli.estimate_id = e.id
    AND eli.category = 'labor_internal'
);
```

---

## Phase 2: TypeScript Type Updates

### 2.1 Update Estimate Types

**File:** `src/types/estimate.ts`

Add to the `LineItem` interface:

```typescript
export interface LineItem {
  id: string;
  category: LineItemCategory;
  description: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  unit?: string;
  sort_order?: number;
  
  // Cost & Pricing fields
  costPerUnit: number;
  markupPercent?: number | null;
  markupAmount?: number | null;
  
  // Calculated totals (generated columns)
  totalCost: number;
  totalMarkup: number;
  
  // NEW: Labor-specific fields (only populated for labor_internal category)
  laborHours?: number | null;
  billingRatePerHour?: number | null;
  actualCostRatePerHour?: number | null;
  laborCushionAmount?: number | null; // Generated column - read only
}

export interface Estimate {
  // ... existing fields ...
  
  // NEW: Labor cushion summary
  totalLaborCushion?: number;
}
```

### 2.2 Create Company Settings Types

**File:** `src/types/companySettings.ts` (create new file)

```typescript
export interface InternalLaborRates {
  billing_rate_per_hour: number;
  actual_cost_per_hour: number;
  effective_date: string;
}

export interface CompanySetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface LaborRateSettings extends CompanySetting {
  setting_key: 'internal_labor_rates';
  setting_value: InternalLaborRates;
}
```

---

## Phase 3: Hooks and Services

### 3.1 Create Company Settings Hook

**File:** `src/hooks/useCompanySettings.ts` (create new file)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InternalLaborRates } from '@/types/companySettings';

export function useInternalLaborRates() {
  return useQuery({
    queryKey: ['company-settings', 'internal_labor_rates'],
    queryFn: async (): Promise<InternalLaborRates> => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'internal_labor_rates')
        .single();
      
      if (error) throw error;
      
      return data.setting_value as InternalLaborRates;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes - rarely changes
  });
}

export function useUpdateInternalLaborRates() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rates: InternalLaborRates) => {
      const { data, error } = await supabase
        .from('company_settings')
        .update({ 
          setting_value: rates,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'internal_labor_rates')
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings', 'internal_labor_rates'] });
    },
  });
}
```

### 3.2 Create Labor Calculation Utilities

**File:** `src/utils/laborCalculations.ts` (create new file)

```typescript
import { InternalLaborRates } from '@/types/companySettings';

export interface LaborCalculationInput {
  laborHours: number;
  billingRatePerHour: number;
  actualCostRatePerHour: number;
  markupPercent: number;
}

export interface LaborCalculationResult {
  // What client sees
  billingTotal: number;           // hours × billing rate
  clientPrice: number;            // billingTotal × (1 + markup%)
  
  // Internal reality
  actualCost: number;             // hours × actual cost rate
  laborCushion: number;           // billingTotal - actualCost
  standardMarkupAmount: number;   // billingTotal × markup%
  
  // True profit
  trueProfit: number;             // laborCushion + standardMarkupAmount
  trueProfitPercent: number;      // trueProfit / actualCost × 100
}

/**
 * Calculate all labor-related financial metrics
 */
export function calculateLaborMetrics(input: LaborCalculationInput): LaborCalculationResult {
  const { laborHours, billingRatePerHour, actualCostRatePerHour, markupPercent } = input;
  
  const billingTotal = laborHours * billingRatePerHour;
  const actualCost = laborHours * actualCostRatePerHour;
  const laborCushion = billingTotal - actualCost;
  const standardMarkupAmount = billingTotal * (markupPercent / 100);
  const clientPrice = billingTotal + standardMarkupAmount;
  const trueProfit = laborCushion + standardMarkupAmount;
  const trueProfitPercent = actualCost > 0 ? (trueProfit / actualCost) * 100 : 0;
  
  return {
    billingTotal,
    clientPrice,
    actualCost,
    laborCushion,
    standardMarkupAmount,
    trueProfit,
    trueProfitPercent,
  };
}

/**
 * Convert a dollar amount at billing rate to labor hours
 */
export function dollarAmountToLaborHours(
  dollarAmount: number, 
  billingRatePerHour: number
): number {
  if (billingRatePerHour <= 0) return 0;
  return dollarAmount / billingRatePerHour;
}

/**
 * Calculate labor cushion for a set of line items
 */
export function calculateTotalLaborCushion(
  lineItems: Array<{
    category: string;
    laborHours?: number | null;
    billingRatePerHour?: number | null;
    actualCostRatePerHour?: number | null;
  }>
): number {
  return lineItems
    .filter(item => item.category === 'labor_internal')
    .reduce((sum, item) => {
      if (!item.laborHours || !item.billingRatePerHour || !item.actualCostRatePerHour) {
        return sum;
      }
      const cushion = item.laborHours * (item.billingRatePerHour - item.actualCostRatePerHour);
      return sum + cushion;
    }, 0);
}

/**
 * Auto-populate labor fields from company settings
 */
export function createLaborLineItemDefaults(
  laborRates: InternalLaborRates,
  laborHours: number,
  markupPercent: number = 25
): {
  laborHours: number;
  billingRatePerHour: number;
  actualCostRatePerHour: number;
  costPerUnit: number;
  pricePerUnit: number;
  quantity: number;
  unit: string;
} {
  return {
    laborHours,
    billingRatePerHour: laborRates.billing_rate_per_hour,
    actualCostRatePerHour: laborRates.actual_cost_per_hour,
    costPerUnit: laborRates.actual_cost_per_hour, // Actual cost
    pricePerUnit: laborRates.billing_rate_per_hour * (1 + markupPercent / 100), // Billing + markup
    quantity: laborHours,
    unit: 'hr',
  };
}
```

---

## Phase 4: UI Components

### 4.1 Update Line Item Form/Modal for Labor Category

**File:** Modify existing line item edit component (likely `src/components/estimates/LineItemDetailModal.tsx` or similar)

When `category === 'labor_internal'`, show additional fields:

```tsx
// Add these fields when category is labor_internal
{category === LineItemCategory.LABOR && (
  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <h4 className="text-sm font-semibold text-blue-900">Internal Labor Details</h4>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="laborHours">Labor Hours</Label>
        <Input
          id="laborHours"
          type="number"
          step="0.5"
          value={laborHours}
          onChange={(e) => handleLaborHoursChange(parseFloat(e.target.value))}
          placeholder="e.g., 200"
        />
      </div>
      
      <div>
        <Label htmlFor="billingRate">Billing Rate ($/hr)</Label>
        <Input
          id="billingRate"
          type="number"
          step="0.01"
          value={billingRatePerHour}
          onChange={(e) => setBillingRatePerHour(parseFloat(e.target.value))}
          placeholder="75.00"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Rate shown to client
        </p>
      </div>
      
      <div>
        <Label htmlFor="actualCostRate">Actual Cost Rate ($/hr)</Label>
        <Input
          id="actualCostRate"
          type="number"
          step="0.01"
          value={actualCostRatePerHour}
          onChange={(e) => setActualCostRatePerHour(parseFloat(e.target.value))}
          placeholder="35.00"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Real internal cost
        </p>
      </div>
      
      <div>
        <Label>Labor Cushion</Label>
        <div className="h-10 px-3 py-2 bg-green-100 border border-green-300 rounded-md flex items-center">
          <span className="font-mono font-semibold text-green-700">
            ${laborCushion.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          Hidden profit from rate differential
        </p>
      </div>
    </div>
    
    {/* Summary Box */}
    <div className="bg-white p-3 rounded border">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Billing Total:</span>
          <span className="font-mono ml-2">${(laborHours * billingRatePerHour).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Actual Cost:</span>
          <span className="font-mono ml-2">${(laborHours * actualCostRatePerHour).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Client Price:</span>
          <span className="font-mono ml-2 font-semibold">
            ${((laborHours * billingRatePerHour) * (1 + markupPercent / 100)).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  </div>
)}
```

### 4.2 Update Estimate Summary Component

**File:** Modify `src/components/EstimateForm.tsx` or the estimate summary section

Add labor cushion display to the summary:

```tsx
{/* After the regular totals, add Labor Cushion section */}
{totalLaborCushion > 0 && (
  <div className="mt-4 pt-4 border-t border-dashed">
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground flex items-center gap-2">
        <Info className="h-4 w-4" />
        Labor Cushion (internal)
      </span>
      <span className="font-mono text-green-600 font-semibold">
        +${totalLaborCushion.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    </div>
    
    <div className="flex justify-between items-center mt-2 pt-2 border-t">
      <span className="font-semibold">True Profit Margin</span>
      <div className="text-right">
        <span className="font-mono font-bold text-green-700">
          ${(standardMargin + totalLaborCushion).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-sm text-muted-foreground ml-2">
          ({trueProfitPercent.toFixed(1)}%)
        </span>
      </div>
    </div>
  </div>
)}
```

### 4.3 Create Admin Settings Component

**File:** `src/components/admin/LaborRateSettings.tsx` (create new file)

```tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useInternalLaborRates, useUpdateInternalLaborRates } from '@/hooks/useCompanySettings';
import { toast } from 'sonner';

export function LaborRateSettings() {
  const { data: laborRates, isLoading } = useInternalLaborRates();
  const updateRates = useUpdateInternalLaborRates();
  
  const [billingRate, setBillingRate] = useState<number>(laborRates?.billing_rate_per_hour ?? 75);
  const [actualCostRate, setActualCostRate] = useState<number>(laborRates?.actual_cost_per_hour ?? 35);
  
  const cushionPerHour = billingRate - actualCostRate;
  
  const handleSave = async () => {
    try {
      await updateRates.mutateAsync({
        billing_rate_per_hour: billingRate,
        actual_cost_per_hour: actualCostRate,
        effective_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Labor rates updated successfully');
    } catch (error) {
      toast.error('Failed to update labor rates');
    }
  };
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal Labor Rates</CardTitle>
        <CardDescription>
          Configure the billing rate vs actual cost rate for internal labor.
          The difference creates a "cushion" of hidden profit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="billingRate">Billing Rate ($/hr)</Label>
            <Input
              id="billingRate"
              type="number"
              step="0.01"
              value={billingRate}
              onChange={(e) => setBillingRate(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Shown on estimates to clients
            </p>
          </div>
          
          <div>
            <Label htmlFor="actualCostRate">Actual Cost Rate ($/hr)</Label>
            <Input
              id="actualCostRate"
              type="number"
              step="0.01"
              value={actualCostRate}
              onChange={(e) => setActualCostRate(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Real internal labor cost
            </p>
          </div>
          
          <div>
            <Label>Cushion Per Hour</Label>
            <div className="h-10 px-3 py-2 bg-green-100 border border-green-300 rounded-md flex items-center">
              <span className="font-mono font-bold text-green-700">
                ${cushionPerHour.toFixed(2)}/hr
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Hidden profit per labor hour
            </p>
          </div>
        </div>
        
        {/* Example calculation */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Example: 100 hours with 25% markup</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Billing Total:</span>
              <span className="font-mono ml-2">${(100 * billingRate).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Actual Cost:</span>
              <span className="font-mono ml-2">${(100 * actualCostRate).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Labor Cushion:</span>
              <span className="font-mono ml-2 text-green-600">${(100 * cushionPerHour).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Client Price (with 25% markup):</span>
              <span className="font-mono ml-2 font-semibold">${(100 * billingRate * 1.25).toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={updateRates.isPending}>
          {updateRates.isPending ? 'Saving...' : 'Save Labor Rates'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 5: Update Supabase Types

After running migrations, regenerate Supabase types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

Or manually add to the types file:

```typescript
// In Database['public']['Tables']

company_settings: {
  Row: {
    id: string
    setting_key: string
    setting_value: Json
    description: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    setting_key: string
    setting_value: Json
    description?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    setting_key?: string
    setting_value?: Json
    description?: string | null
    created_at?: string
    updated_at?: string
  }
}

// Update estimate_line_items Row type to include new fields
estimate_line_items: {
  Row: {
    // ... existing fields ...
    labor_hours: number | null
    billing_rate_per_hour: number | null
    actual_cost_rate_per_hour: number | null
    labor_cushion_amount: number | null // Generated, read-only
  }
  // ... Insert and Update similarly
}
```

---

## Phase 6: Integration Points

### 6.1 EstimateForm.tsx Updates

1. Fetch labor rates on mount using `useInternalLaborRates()`
2. Pass rates to line item creation/editing
3. Auto-populate rates when category changes to `labor_internal`
4. Calculate and display total labor cushion in summary

### 6.2 Database Save Logic

When saving a `labor_internal` line item:

```typescript
const lineItemData = {
  // ... standard fields ...
  category: 'labor_internal',
  quantity: laborHours,
  unit: 'hr',
  cost_per_unit: actualCostRatePerHour,
  price_per_unit: billingRatePerHour * (1 + markupPercent / 100),
  labor_hours: laborHours,
  billing_rate_per_hour: billingRatePerHour,
  actual_cost_rate_per_hour: actualCostRatePerHour,
  // labor_cushion_amount is auto-calculated by database
};
```

### 6.3 Reporting View Update

Update `reporting.project_financials` view to include labor cushion:

```sql
-- Add to the view definition
SELECT
  -- ... existing fields ...
  COALESCE(e.total_labor_cushion, 0) as labor_cushion,
  COALESCE(p.current_margin, 0) + COALESCE(e.total_labor_cushion, 0) as true_margin
FROM projects p
LEFT JOIN estimates e ON e.project_id = p.id AND e.is_current_version = true
-- ... rest of view ...
```

---

## Testing Checklist

### Database Tests
- [ ] Migration runs without errors
- [ ] company_settings table created with default values
- [ ] estimate_line_items has new columns
- [ ] Generated column `labor_cushion_amount` calculates correctly
- [ ] Trigger updates `estimates.total_labor_cushion` on line item changes

### UI Tests
- [ ] Admin can update labor rates in settings
- [ ] Labor fields appear only for `labor_internal` category
- [ ] Cushion calculates in real-time as hours/rates change
- [ ] Estimate summary shows total labor cushion
- [ ] "True Profit Margin" displays correctly

### Calculation Tests
- [ ] 200 hours @ $75 billing / $35 actual = $8,000 cushion
- [ ] 0% markup: cushion = total hidden profit
- [ ] 25% markup: cushion + markup = true profit
- [ ] Variable markup correctly affects client price

### Edge Cases
- [ ] Labor hours = 0 → cushion = 0
- [ ] Missing rates → graceful fallback
- [ ] Non-labor categories → no cushion fields/calculations
- [ ] Existing estimates (no labor_hours) → display normally

---

## Files to Create/Modify Summary

### New Files
1. `supabase/migrations/[timestamp]_add_company_labor_settings.sql`
2. `supabase/migrations/[timestamp]_add_labor_cushion_fields.sql`
3. `supabase/migrations/[timestamp]_add_estimate_labor_summary.sql`
4. `src/types/companySettings.ts`
5. `src/hooks/useCompanySettings.ts`
6. `src/utils/laborCalculations.ts`
7. `src/components/admin/LaborRateSettings.tsx`

### Files to Modify
1. `src/types/estimate.ts` - Add labor fields to LineItem interface
2. `src/components/EstimateForm.tsx` - Integrate labor cushion display
3. `src/components/estimates/LineItemDetailModal.tsx` (or equivalent) - Add labor input fields
4. `src/integrations/supabase/types.ts` - Update generated types
5. Admin settings page - Add labor rate configuration section

---

## Notes for AI Agent

1. **Preserve existing functionality** - All current estimate features must continue working
2. **Database-first approach** - Calculations done in PostgreSQL where possible
3. **Labor cushion is internal only** - Never show actual cost rate to clients
4. **Variable markup** - The markup % can differ per line item, cushion stays constant
5. **Generated columns** - `labor_cushion_amount` is computed by database, read-only in app
6. **Backwards compatible** - Existing estimates without labor_hours should display normally
