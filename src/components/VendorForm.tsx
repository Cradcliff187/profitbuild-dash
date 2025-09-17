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
import type { Vendor } from "@/types/vendor";

const vendorSchema = z.object({
  vendor_name: z.string().min(1, "Vendor name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone_numbers: z.string().optional(),
  billing_address: z.string().optional(),
  terms: z.string().optional(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  vendor?: Vendor;
  onSuccess: () => void;
  onCancel: () => void;
}

export const VendorForm = ({ vendor, onSuccess, onCancel }: VendorFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      vendor_name: vendor?.vendor_name || "",
      email: vendor?.email || "",
      phone_numbers: vendor?.phone_numbers || "",
      billing_address: vendor?.billing_address || "",
      terms: vendor?.terms || "Net 30",
    },
  });

  const onSubmit = async (data: VendorFormData) => {
    setIsSubmitting(true);
    try {
      if (vendor) {
        // Update existing vendor
        const vendorData = {
          vendor_name: data.vendor_name,
          email: data.email || null,
          phone_numbers: data.phone_numbers || null,
          billing_address: data.billing_address || null,
          terms: data.terms || "Net 30",
        };

        const { error } = await supabase
          .from("vendors")
          .update(vendorData)
          .eq("id", vendor.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vendor updated successfully",
        });
      } else {
        // Create new vendor
        const vendorData = {
          vendor_name: data.vendor_name,
          email: data.email || null,
          phone_numbers: data.phone_numbers || null,
          billing_address: data.billing_address || null,
          terms: data.terms || "Net 30",
        };

        const { error } = await supabase
          .from("vendors")
          .insert([vendorData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vendor created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast({
        title: "Error",
        description: "Failed to save vendor",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vendor ? "Edit Vendor" : "Add New Vendor"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vendor_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Name *</FormLabel>
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
                {isSubmitting ? "Saving..." : vendor ? "Update Vendor" : "Add Vendor"}
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