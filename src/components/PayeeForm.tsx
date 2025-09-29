import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Payee } from "@/types/payee";
import { PayeeType } from "@/types/payee";

const payeeSchema = z.object({
  payee_name: z.string().min(1, "Payee name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone_numbers: z.string().optional(),
  billing_address: z.string().optional(),
  terms: z.string().optional(),
  payee_type: z.nativeEnum(PayeeType).optional(),
  provides_labor: z.boolean().optional(),
  provides_materials: z.boolean().optional(),
  requires_1099: z.boolean().optional(),
  is_internal: z.boolean().optional(),
  insurance_expires: z.date().optional(),
  license_number: z.string().optional(),
  permit_issuer: z.boolean().optional(),
  hourly_rate: z.number().positive().optional().or(z.literal("")),
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
      payee_name: payee?.payee_name || "",
      email: payee?.email || "",
      phone_numbers: payee?.phone_numbers || "",
      billing_address: payee?.billing_address || "",
      terms: payee?.terms || "Net 30",
      payee_type: payee?.payee_type || PayeeType.SUBCONTRACTOR,
      provides_labor: payee?.provides_labor || false,
      provides_materials: payee?.provides_materials || false,
      requires_1099: payee?.requires_1099 || false,
      is_internal: payee?.is_internal || false,
      insurance_expires: payee?.insurance_expires ? new Date(payee.insurance_expires) : undefined,
      license_number: payee?.license_number || "",
      permit_issuer: payee?.permit_issuer || false,
      hourly_rate: payee?.hourly_rate || "",
    },
  });

  const watchedPayeeType = form.watch('payee_type');

  // Auto-set hourly rate to 75 when payee type changes to internal_labor
  useEffect(() => {
    if (watchedPayeeType === PayeeType.INTERNAL_LABOR && !form.getValues('hourly_rate')) {
      form.setValue('hourly_rate', 75);
    }
  }, [watchedPayeeType, form]);

  const onSubmit = async (data: PayeeFormData) => {
    setIsSubmitting(true);
    try {
      if (payee) {
        // Update existing payee
        const payeeData = {
          payee_name: data.payee_name,
          email: data.email || null,
          phone_numbers: data.phone_numbers || null,
          billing_address: data.billing_address || null,
          terms: data.terms || "Net 30",
          payee_type: data.payee_type || PayeeType.SUBCONTRACTOR,
          provides_labor: data.provides_labor || false,
          provides_materials: data.provides_materials || false,
          requires_1099: data.requires_1099 || false,
          is_internal: data.is_internal || false,
          insurance_expires: data.insurance_expires ? data.insurance_expires.toISOString().split('T')[0] : null,
          license_number: data.license_number || null,
          permit_issuer: data.permit_issuer || false,
          hourly_rate: typeof data.hourly_rate === 'number' ? data.hourly_rate : null,
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
          payee_name: data.payee_name,
          email: data.email || null,
          phone_numbers: data.phone_numbers || null,
          billing_address: data.billing_address || null,
          terms: data.terms || "Net 30",
          payee_type: data.payee_type || PayeeType.SUBCONTRACTOR,
          provides_labor: data.provides_labor || false,
          provides_materials: data.provides_materials || false,
          requires_1099: data.requires_1099 || false,
          is_internal: data.is_internal || false,
          insurance_expires: data.insurance_expires ? data.insurance_expires.toISOString().split('T')[0] : null,
          license_number: data.license_number || null,
          permit_issuer: data.permit_issuer || false,
          hourly_rate: typeof data.hourly_rate === 'number' ? data.hourly_rate : null,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <FormField
              control={form.control}
              name="payee_name"
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
                      <SelectItem value={PayeeType.SUBCONTRACTOR}>Subcontractor</SelectItem>
                      <SelectItem value={PayeeType.MATERIAL_SUPPLIER}>Material Supplier</SelectItem>
                      <SelectItem value={PayeeType.EQUIPMENT_RENTAL}>Equipment Rental</SelectItem>
                      <SelectItem value={PayeeType.INTERNAL_LABOR}>Internal Labor</SelectItem>
                      <SelectItem value={PayeeType.MANAGEMENT}>Management</SelectItem>
                      <SelectItem value={PayeeType.PERMIT_AUTHORITY}>Permit Authority</SelectItem>
                      <SelectItem value={PayeeType.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
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

              {watchedPayeeType !== PayeeType.INTERNAL_LABOR && (
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
              )}

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

            <div className="grid grid-cols-2 gap-2">
              {watchedPayeeType === PayeeType.SUBCONTRACTOR && (
                <>
                  <FormField
                    control={form.control}
                    name="license_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Professional license number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insurance_expires"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Insurance Expires</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick expiration date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {watchedPayeeType === PayeeType.INTERNAL_LABOR && (
                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="75.00"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedPayeeType === PayeeType.PERMIT_AUTHORITY && (
                <FormField
                  control={form.control}
                  name="permit_issuer"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 self-end pb-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Can Issue Permits</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
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