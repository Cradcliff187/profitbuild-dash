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
import { useToast } from "@/hooks/use-toast";
import type { Payee } from "@/types/payee";

const payeeSchema = z.object({
  vendor_name: z.string().min(1, "Payee name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone_numbers: z.string().optional(),
  billing_address: z.string().optional(),
  terms: z.string().optional(),
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