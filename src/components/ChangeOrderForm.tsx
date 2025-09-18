import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Database } from "@/integrations/supabase/types";

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

const changeOrderSchema = z.object({
  description: z.string().min(1, "Description is required"),
  reason_for_change: z.string().min(1, "Reason for change is required"),
  amount: z.coerce.number().min(0, "Amount must be positive").default(0),
  client_amount: z.coerce.number().optional(),
  cost_impact: z.coerce.number().optional(),
  includes_contingency: z.boolean().default(false),
});

type ChangeOrderFormData = z.infer<typeof changeOrderSchema>;

interface ChangeOrderFormProps {
  projectId: string;
  changeOrder?: ChangeOrder;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ChangeOrderForm = ({ projectId, changeOrder, onSuccess, onCancel }: ChangeOrderFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changeOrderNumber, setChangeOrderNumber] = useState("");
  const [contingencyRemaining, setContingencyRemaining] = useState<number>(0);
  const [marginImpact, setMarginImpact] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<ChangeOrderFormData>({
    resolver: zodResolver(changeOrderSchema),
    defaultValues: {
      description: changeOrder?.description || "",
      reason_for_change: changeOrder?.reason_for_change || "",
      amount: changeOrder?.amount || 0,
      client_amount: changeOrder?.client_amount || undefined,
      cost_impact: changeOrder?.cost_impact || undefined,
      includes_contingency: changeOrder?.includes_contingency || false,
    },
  });

  const generateChangeOrderNumber = async (projectId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('change_orders')
        .select('change_order_number')
        .eq('project_id', projectId)
        .order('change_order_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return 'CO-001';
      }

      const lastNumber = data[0].change_order_number;
      const match = lastNumber.match(/CO-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        return `CO-${nextNum.toString().padStart(3, '0')}`;
      }

      return 'CO-001';
    } catch (error) {
      console.error('Error generating change order number:', error);
      return 'CO-001';
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      if (changeOrder) {
        setChangeOrderNumber(changeOrder.change_order_number);
      } else {
        const newNumber = await generateChangeOrderNumber(projectId);
        setChangeOrderNumber(newNumber);
      }

      // Fetch contingency remaining
      const { data } = await supabase
        .from("projects")
        .select("contingency_remaining")
        .eq("id", projectId)
        .single();
      
      if (data) {
        setContingencyRemaining(data.contingency_remaining || 0);
      }
    };

    initializeData();
  }, [projectId, changeOrder]);

  // Calculate margin impact when client_amount or cost_impact changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      const clientAmount = values.client_amount || 0;
      const costImpact = values.cost_impact || 0;
      
      if (clientAmount > 0 || costImpact > 0) {
        setMarginImpact(clientAmount - costImpact);
      } else {
        setMarginImpact(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: ChangeOrderFormData) => {
    try {
      setIsSubmitting(true);

      if (changeOrder) {
        // Update existing change order
        const { error } = await supabase
          .from('change_orders')
          .update({
            description: data.description,
            reason_for_change: data.reason_for_change,
            amount: data.amount,
            client_amount: data.client_amount || null,
            cost_impact: data.cost_impact || null,
            includes_contingency: data.includes_contingency,
          })
          .eq('id', changeOrder.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Change order updated successfully",
        });
      } else {
        // Create new change order
        const { error } = await supabase
          .from('change_orders')
          .insert({
            project_id: projectId,
            change_order_number: changeOrderNumber,
            description: data.description,
            reason_for_change: data.reason_for_change,
            amount: data.amount,
            client_amount: data.client_amount || null,
            cost_impact: data.cost_impact || null,
            includes_contingency: data.includes_contingency,
            status: 'pending',
            requested_date: new Date().toISOString().split('T')[0],
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Change order created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving change order:', error);
      toast({
        title: "Error",
        description: "Failed to save change order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const regenerateNumber = async () => {
    if (!changeOrder) {
      const newNumber = await generateChangeOrderNumber(projectId);
      setChangeOrderNumber(newNumber);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {changeOrder ? "Edit Change Order" : "Create Change Order"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-2">
              <FormLabel>Change Order Number:</FormLabel>
              <span className="font-mono font-medium">{changeOrderNumber}</span>
              {!changeOrder && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={regenerateNumber}
                >
                  Regenerate
                </Button>
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter change order description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason_for_change"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Change</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain the reason for this change order"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost_impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Impact</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {marginImpact !== null && (
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-sm font-medium">
                  Margin Impact: 
                  <span className={`ml-2 ${marginImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${marginImpact.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="includes_contingency"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Use Project Contingency</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      This change order will be funded from project contingency
                      {contingencyRemaining > 0 && (
                        <span className="block">
                          Remaining contingency: ${contingencyRemaining.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legacy Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    This field is kept for backward compatibility. Use Client Amount and Cost Impact above for better tracking.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : changeOrder
                  ? "Update Change Order"
                  : "Create Change Order"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};