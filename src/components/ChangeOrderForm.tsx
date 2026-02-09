import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChangeOrderLineItemTable } from "@/components/ChangeOrderLineItemTable";
import { ChangeOrderLineItemInput, CHANGE_ORDER_LINE_ITEM_TEMPLATE } from "@/types/changeOrder";

import { Database } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/utils";

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

// Updated schema - removed client_amount and cost_impact (auto-calculated from line items)
const changeOrderSchema = z.object({
  description: z.string().min(1, "Description is required"),
  reason_for_change: z.string().min(1, "Reason for change is required"),
  contingency_billed_to_client: z.coerce.number().min(0, "Contingency amount must be positive").default(0),
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
  const [lineItems, setLineItems] = useState<ChangeOrderLineItemInput[]>([]);

  const form = useForm<ChangeOrderFormData>({
    resolver: zodResolver(changeOrderSchema),
    defaultValues: {
      description: changeOrder?.description || "",
      reason_for_change: changeOrder?.reason_for_change || "",
      contingency_billed_to_client: changeOrder?.contingency_billed_to_client || 0,
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
        
        // Load existing line items if editing
        const { data: existingLineItems } = await supabase
          .from('change_order_line_items')
          .select(`
            *,
            payees (
              id,
              payee_name
            )
          `)
          .eq('change_order_id', changeOrder.id)
          .order('sort_order', { ascending: true });
        
        if (existingLineItems && existingLineItems.length > 0) {
          setLineItems(existingLineItems.map(item => ({
            id: item.id,
            category: item.category,
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit || undefined,
            cost_per_unit: Number(item.cost_per_unit),
            price_per_unit: Number(item.price_per_unit),
            sort_order: item.sort_order,
            payee_id: item.payee_id,
            payee_name: item.payees?.payee_name,
          })));
        } else {
          // If editing but no line items, add one to get started
          setLineItems([{ ...CHANGE_ORDER_LINE_ITEM_TEMPLATE }]);
        }
      } else {
        const newNumber = await generateChangeOrderNumber(projectId);
        setChangeOrderNumber(newNumber);
        // Start with one line item for new change orders
        setLineItems([{ ...CHANGE_ORDER_LINE_ITEM_TEMPLATE }]);
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

  // Calculate totals from line items
  const calculateTotals = () => {
    const totalCost = lineItems.reduce((sum, item) => 
      sum + (item.quantity * item.cost_per_unit), 0);
    const totalPrice = lineItems.reduce((sum, item) => 
      sum + (item.quantity * item.price_per_unit), 0);
    const margin = totalPrice - totalCost;
    const marginPercent = totalPrice > 0 ? (margin / totalPrice) * 100 : 0;
    
    return { totalCost, totalPrice, margin, marginPercent };
  };

  const handleUpdateLineItem = (index: number, field: keyof ChangeOrderLineItemInput, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { ...CHANGE_ORDER_LINE_ITEM_TEMPLATE }]);
  };

  const validateLineItems = (): boolean => {
    if (lineItems.length === 0) {
      toast.error("Line Items Required", { description: "Add at least one line item to document the work being performed" });
      return false;
    }

    // Check for empty descriptions
    const hasEmptyDescriptions = lineItems.some(item => !item.description || item.description.trim() === '');
    if (hasEmptyDescriptions) {
      toast.error("Incomplete Line Items", { description: "All line items must have a description" });
      return false;
    }

    return true;
  };

  const onSubmit = async (data: ChangeOrderFormData) => {
    if (!validateLineItems()) return;
    
    const { totalCost, totalPrice, margin } = calculateTotals();
    
    try {
      setIsSubmitting(true);

      if (changeOrder) {
        // Update existing change order
        const { error: coError } = await supabase
          .from('change_orders')
          .update({
            description: data.description,
            reason_for_change: data.reason_for_change,
            cost_impact: totalCost,
            client_amount: totalPrice,
            margin_impact: margin,
            contingency_billed_to_client: data.contingency_billed_to_client,
          })
          .eq('id', changeOrder.id);

        if (coError) throw coError;

        // Delete old line items
        await supabase
          .from('change_order_line_items')
          .delete()
          .eq('change_order_id', changeOrder.id);

        // Insert new line items
        const lineItemsToInsert = lineItems.map((item, index) => ({
          change_order_id: changeOrder.id,
          category: item.category as Database['public']['Enums']['expense_category'],
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          cost_per_unit: item.cost_per_unit,
          price_per_unit: item.price_per_unit,
          sort_order: index,
          payee_id: item.payee_id,
        }));

        const { error: liError } = await supabase
          .from('change_order_line_items')
          .insert(lineItemsToInsert);

        if (liError) throw liError;

        toast.success("Change order updated successfully");
      } else {
        // Create new change order
        const { data: changeOrderData, error: coError } = await supabase
          .from('change_orders')
          .insert({
            project_id: projectId,
            change_order_number: changeOrderNumber,
            description: data.description,
            reason_for_change: data.reason_for_change,
            cost_impact: totalCost,
            client_amount: totalPrice,
            margin_impact: margin,
            contingency_billed_to_client: data.contingency_billed_to_client,
            status: 'pending',
            requested_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (coError) throw coError;

        // Insert line items
        const lineItemsToInsert = lineItems.map((item, index) => ({
          change_order_id: changeOrderData.id,
          category: item.category as Database['public']['Enums']['expense_category'],
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          cost_per_unit: item.cost_per_unit,
          price_per_unit: item.price_per_unit,
          sort_order: index,
          payee_id: item.payee_id,
        }));

        const { error: liError } = await supabase
          .from('change_order_line_items')
          .insert(lineItemsToInsert);

        if (liError) throw liError;

        toast.success("Change order created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving change order:', error);
      toast.error("Failed to save change order. Please try again.");
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

  const totals = calculateTotals();
  const billedAmount = form.watch("contingency_billed_to_client") || 0;
  const contingencyAfterBilling = contingencyRemaining - billedAmount;
  const showWarning = billedAmount > contingencyRemaining;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" id="change-order-form">
            <div className="flex items-center gap-2">
              <FormLabel className="text-sm">Change Order Number:</FormLabel>
              <span className="font-mono font-medium text-sm">{changeOrderNumber}</span>
              {!changeOrder && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={regenerateNumber}
                  className="h-7 text-xs"
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
                  <FormLabel className="text-xs font-medium">
                    Description <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter change order description"
                      className="h-8 text-xs"
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
                  <FormLabel className="text-xs font-medium">
                    Reason for Change <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain the reason for this change order"
                      className="min-h-[60px] text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Line Items Section */}
            <div className="space-y-2">
              <FormLabel className="text-xs font-semibold">Line Items <span className="text-destructive">*</span></FormLabel>
              <ChangeOrderLineItemTable
                lineItems={lineItems}
                onUpdateLineItem={handleUpdateLineItem}
                onRemoveLineItem={handleRemoveLineItem}
                onAddLineItem={handleAddLineItem}
                contingencyRemaining={contingencyRemaining}
                showContingencyGuidance={billedAmount > 0}
              />
            </div>

            {/* Auto-calculated Totals Display */}
            <Card className="p-2 bg-muted/30">
              <h4 className="text-xs font-medium mb-1.5">Change Order Totals</h4>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cost:</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(totals.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client Amount:</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(totals.totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margin:</span>
                  <span className={`font-mono font-semibold ${totals.margin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(totals.margin)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margin %:</span>
                  <span className="font-mono font-semibold">
                    {totals.marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Contingency Billing Section */}
            <FormField
              control={form.control}
              name="contingency_billed_to_client"
              render={({ field }) => (
                <div className="space-y-1.5 border rounded-lg p-2 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold">Bill Contingency to Client (Optional)</FormLabel>
                    <span className="text-[11px] text-muted-foreground">
                      Available: {formatCurrency(contingencyRemaining)}
                    </span>
                  </div>

                  <FormItem>
                    <FormLabel className="text-[11px]">Amount to Bill</FormLabel>
                    <div className="flex gap-1.5">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="h-8 text-xs"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      {contingencyRemaining > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange(contingencyRemaining)}
                          className="h-8 text-xs px-2"
                        >
                          Bill All
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Convert unused contingency to earned revenue
                    </p>
                    <FormMessage />
                  </FormItem>

                  {billedAmount > 0 && (
                    <div className={`text-[11px] space-y-0.5 p-1.5 rounded ${showWarning ? 'bg-destructive/10 text-destructive' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                      <p className="font-medium">💰 Billing Impact:</p>
                      <p>• Converts {formatCurrency(billedAmount)} from reserved → earned revenue</p>
                      <p>• Reduces available contingency to {formatCurrency(Math.max(contingencyAfterBilling, 0))}</p>
                      <p>• Net contract increase: {formatCurrency(totals.totalPrice)} (Change Order) + {formatCurrency(billedAmount)} (Contingency) = {formatCurrency(totals.totalPrice + billedAmount)}</p>
                      {billedAmount >= totals.totalPrice ? (
                        <p className="text-blue-700 dark:text-blue-300 font-medium">
                          ℹ️ The contingency covers the full cost of this change order.
                        </p>
                      ) : (
                        <p className="text-blue-700 dark:text-blue-300 font-medium">
                          ℹ️ The contingency covers part of this change order's cost.
                        </p>
                      )}
                      {showWarning && (
                        <p className="font-semibold">⚠️ Exceeds available contingency!</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            />

          </form>
        </Form>
      </div>
      
      {/* Sticky Footer with Action Buttons */}
      <div className="sticky bottom-0 bg-background border-t pt-2 pb-2 -mx-6 px-6 mt-2 flex-shrink-0">
        <div className="flex justify-end gap-1.5">
          <Button type="button" variant="outline" onClick={onCancel} size="sm" className="h-8 text-xs">
            Cancel
          </Button>
          <Button 
            form="change-order-form"
            type="submit" 
            disabled={isSubmitting} 
            size="sm"
            className="h-8 text-xs"
          >
            {isSubmitting
              ? "Saving..."
              : changeOrder
              ? "Update Change Order"
              : "Create Change Order"}
          </Button>
        </div>
      </div>
    </div>
  );
};
