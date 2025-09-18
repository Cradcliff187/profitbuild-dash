import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContingencyAllocationProps {
  projectId: string;
  contingencyRemaining: number;
  onAllocationComplete?: () => void;
  onCancel?: () => void;
}

const contingencyAllocationSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  description: z.string().min(1, 'Description is required'),
});

type ContingencyAllocationForm = z.infer<typeof contingencyAllocationSchema>;

export const ContingencyAllocation = ({ 
  projectId, 
  contingencyRemaining, 
  onAllocationComplete,
  onCancel 
}: ContingencyAllocationProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<ContingencyAllocationForm>({
    resolver: zodResolver(contingencyAllocationSchema),
    defaultValues: {
      amount: '',
      description: ''
    }
  });

  const watchedAmount = watch('amount');
  const numericAmount = parseFloat(watchedAmount) || 0;
  const remainingAfterAllocation = contingencyRemaining - numericAmount;

  const handleAmountChange = (value: string) => {
    const numericValue = parseFloat(value) || 0;
    if (numericValue > contingencyRemaining) {
      setValue('amount', contingencyRemaining.toString());
    } else {
      setValue('amount', value);
    }
  };

  const onSubmit = async (data: ContingencyAllocationForm) => {
    const amount = parseFloat(data.amount);
    
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive"
      });
      return;
    }

    if (amount > contingencyRemaining) {
      toast({
        title: "Insufficient Contingency",
        description: `Amount cannot exceed remaining contingency of $${contingencyRemaining.toFixed(2)}.`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create expense for contingency allocation
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          project_id: projectId,
          category: 'other',
          amount: amount,
          description: `Contingency Allocation: ${data.description}`,
          expense_date: new Date().toISOString().split('T')[0],
          transaction_type: 'expense',
          is_planned: true
        });

      if (expenseError) throw expenseError;

      // Get current estimate to update contingency_used
      const { data: currentEstimate, error: fetchError } = await supabase
        .from('estimates')
        .select('contingency_used')
        .eq('project_id', projectId)
        .eq('is_current_version', true)
        .single();

      if (fetchError) {
        console.warn('Warning: Could not fetch current estimate:', fetchError);
      }

      // Update contingency_used in the current estimate
      const currentUsed = currentEstimate?.contingency_used || 0;
      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          contingency_used: currentUsed + amount
        })
        .eq('project_id', projectId)
        .eq('is_current_version', true);

      if (updateError) {
        console.warn('Warning: Could not update contingency_used:', updateError);
        // Don't throw error as the expense was created successfully
      }

      toast({
        title: "Contingency Allocated",
        description: `$${amount.toFixed(2)} has been allocated from contingency.`
      });

      onAllocationComplete?.();

    } catch (error) {
      console.error('Error allocating contingency:', error);
      toast({
        title: "Allocation Failed",
        description: "There was an error allocating the contingency. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Allocate Contingency</CardTitle>
        <div className="text-sm text-muted-foreground">
          Available Contingency: <span className="font-semibold">${contingencyRemaining.toFixed(2)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Allocate</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              max={contingencyRemaining}
              step="0.01"
              placeholder="0.00"
              {...register('amount')}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
            {numericAmount > 0 && (
              <div className="text-sm">
                <span className={`font-medium ${remainingAfterAllocation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Remaining after allocation: ${remainingAfterAllocation.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this contingency allocation is for..."
              {...register('description')}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting || numericAmount <= 0 || numericAmount > contingencyRemaining}
              className="flex-1"
            >
              {isSubmitting ? "Allocating..." : "Allocate Contingency"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};