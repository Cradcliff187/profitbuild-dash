import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useInternalLaborRates, useUpdateInternalLaborRates } from '@/hooks/useCompanySettings';
import { toast } from 'sonner';

export function LaborRateSettings() {
  const { data: laborRates, isLoading } = useInternalLaborRates();
  const updateRates = useUpdateInternalLaborRates();
  
  const [billingRate, setBillingRate] = useState<number>(75);
  const [actualCostRate, setActualCostRate] = useState<number>(35);
  
  // Update local state when data loads
  useEffect(() => {
    if (laborRates) {
      setBillingRate(laborRates.billing_rate_per_hour);
      setActualCostRate(laborRates.actual_cost_per_hour);
    }
  }, [laborRates]);
  
  const cushionPerHour = billingRate - actualCostRate;
  
  const handleSave = async () => {
    try {
      await updateRates.mutateAsync({
        billing_rate_per_hour: billingRate,
        actual_cost_per_hour: actualCostRate,
        effective_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Labor rates updated successfully');
    } catch (error: any) {
      console.error('Failed to update labor rates:', error);
      toast.error('Failed to update labor rates', {
        description: error?.message || 'An error occurred'
      });
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Internal Labor Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }
  
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
              <span className="font-mono ml-2">${(100 * billingRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Actual Cost:</span>
              <span className="font-mono ml-2">${(100 * actualCostRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Labor Cushion:</span>
              <span className="font-mono ml-2 text-green-600">${(100 * cushionPerHour).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Client Price (with 25% markup):</span>
              <span className="font-mono ml-2 font-semibold">${(100 * billingRate * 1.25).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={updateRates.isPending}
          className="w-full sm:w-auto"
        >
          {updateRates.isPending ? 'Saving...' : 'Save Labor Rates'}
        </Button>
      </CardContent>
    </Card>
  );
}
