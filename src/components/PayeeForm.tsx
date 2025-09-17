import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { Payee } from "@/types/payee";

const payeeSchema = z.object({
  vendor_name: z.string().min(1, "Payee name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone_numbers: z.string().optional(),
  billing_address: z.string().optional(),
  terms: z.string().optional(),
  payee_type: z.string().optional(),
  provides_labor: z.boolean().optional(),
  provides_materials: z.boolean().optional(),
  requires_1099: z.boolean().optional(),
  is_internal: z.boolean().optional(),
});

type PayeeFormData = z.infer<typeof payeeSchema>;

interface PayeeFormProps {
  payee?: Payee;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PayeeForm = ({ payee, onSuccess, onCancel }: PayeeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<PayeeFormData>({
    resolver: zodResolver(payeeSchema),
    defaultValues: {
      vendor_name: payee?.vendor_name || "",
      email: payee?.email || "",
      phone_numbers: payee?.phone_numbers || "",
      billing_address: payee?.billing_address || "",
      terms: payee?.terms || "Net 30",
      payee_type: payee?.payee_type || "subcontractor",
      provides_labor: payee?.provides_labor || false,
      provides_materials: payee?.provides_materials || false,
      requires_1099: payee?.requires_1099 || false,
      is_internal: payee?.is_internal || false,
    },
  });

  const onSubmit = async (data: PayeeFormData) => {
    setIsSubmitting(true);
    try {
      if (payee) {
        // Update existing payee
        const payeeData = {
          vendor_name: data.vendor_name,
          email: data.email || null,
          phone_numbers: data.phone_numbers || null,
          billing_address: data.billing_address || null,
          terms: data.terms || "Net 30",
          payee_type: data.payee_type || "subcontractor",
          provides_labor: data.provides_labor || false,
          provides_materials: data.provides_materials || false,
          requires_1099: data.requires_1099 || false,
          is_internal: data.is_internal || false,
        };

        const { error } = await supabase
          .from("payees")
          .update(payeeData)
          .eq("id", payee.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payee updated successfully",
        });
      } else {
        // Create new payee
        const payeeData = {
          vendor_name: data.vendor_name,
          email: data.email || null,
          phone_numbers: data.phone_numbers || null,
          billing_address: data.billing_address || null,
          terms: data.terms || "Net 30",
          payee_type: data.payee_type || "subcontractor",
          provides_labor: data.provides_labor || false,
          provides_materials: data.provides_materials || false,
          requires_1099: data.requires_1099 || false,
          is_internal: data.is_internal || false,
        };

        const { error } = await supabase
          .from("payees")
          .insert([payeeData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payee created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving payee:", error);
      toast({
        title: "Error",
        description: "Failed to save payee",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{payee ? "Edit Payee" : "Add New Payee"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vendor_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payee Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_numbers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="billing_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Address</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Net 30, Net 15, COD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payee_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payee Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payee type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="provides_labor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Provides Labor</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provides_materials"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Provides Materials</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requires_1099"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Requires 1099</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_internal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Internal</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : payee ? "Update Payee" : "Add Payee"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};