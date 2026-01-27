import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  full_name: z.string().optional(),
  account_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone_numbers: z.string().optional(),
  billing_address: z.string().optional(),
  terms: z.string().optional(),
  payee_type: z.nativeEnum(PayeeType).optional(),
  provides_labor: z.boolean().optional(),
  provides_materials: z.boolean().optional(),
  requires_1099: z.boolean().optional(),
  is_internal: z.boolean().optional(),
  is_active: z.boolean().optional(),
  insurance_expires: z.date().optional(),
  license_number: z.string().optional(),
  permit_issuer: z.boolean().optional(),
  hourly_rate: z.number().positive().optional().or(z.literal("")),
  employee_number: z.string().optional(),
  notes: z.string().optional(),
});

type PayeeFormData = z.infer<typeof payeeSchema>;

interface PayeeFormProps {
  payee?: Payee;
  onSuccess: () => void;
  onCancel: () => void;
  defaultPayeeType?: PayeeType;
  defaultIsInternal?: boolean;
  defaultProvidesLabor?: boolean;
  isSubmittingRef?: React.MutableRefObject<boolean>;
}

export const PayeeForm = ({ payee, onSuccess, onCancel, defaultPayeeType, defaultIsInternal, defaultProvidesLabor, isSubmittingRef }: PayeeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync submitting state with ref for parent
  useEffect(() => {
    if (isSubmittingRef) {
      isSubmittingRef.current = isSubmitting;
    }
  }, [isSubmitting, isSubmittingRef]);
  const { toast } = useToast();

  const form = useForm<PayeeFormData>({
    resolver: zodResolver(payeeSchema),
    defaultValues: {
      payee_name: payee?.payee_name || "",
      full_name: payee?.full_name || "",
      account_number: payee?.account_number || "",
      email: payee?.email || "",
      phone_numbers: payee?.phone_numbers || "",
      billing_address: payee?.billing_address || "",
      terms: payee?.terms || "Net 30",
      payee_type: payee?.payee_type || defaultPayeeType || PayeeType.SUBCONTRACTOR,
      provides_labor: payee?.provides_labor || defaultProvidesLabor || false,
      provides_materials: payee?.provides_materials || false,
      requires_1099: payee?.requires_1099 || false,
      is_internal: payee?.is_internal || defaultIsInternal || false,
      is_active: payee?.is_active ?? true,
      insurance_expires: payee?.insurance_expires ? new Date(payee.insurance_expires) : undefined,
      license_number: payee?.license_number || "",
      permit_issuer: payee?.permit_issuer || false,
      hourly_rate: payee?.hourly_rate || (defaultPayeeType === PayeeType.INTERNAL_LABOR ? 75 : ""),
      employee_number: payee?.employee_number || "",
      notes: payee?.notes || "",
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
          full_name: data.full_name || null,
          account_number: data.account_number || null,
          email: data.email || null,
          phone_numbers: data.phone_numbers || null,
          billing_address: data.billing_address || null,
          terms: data.terms || "Net 30",
          payee_type: data.payee_type || PayeeType.SUBCONTRACTOR,
          provides_labor: data.provides_labor || false,
          provides_materials: data.provides_materials || false,
          requires_1099: data.requires_1099 || false,
          is_internal: data.is_internal || false,
          is_active: data.is_active ?? true,
          insurance_expires: data.insurance_expires ? data.insurance_expires.toISOString().split('T')[0] : null,
          license_number: data.license_number || null,
          permit_issuer: data.permit_issuer || false,
          hourly_rate: typeof data.hourly_rate === 'number' ? data.hourly_rate : null,
          employee_number: data.employee_number || null,
          notes: data.notes || null,
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
          full_name: data.full_name || null,
          account_number: data.account_number || null,
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
          employee_number: data.employee_number || null,
          notes: data.notes || null,
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
    <Form {...form}>
      <form id="payee-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Legal or full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <FormField
            control={form.control}
            name="billing_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Address</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              name="account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Vendor account number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
        </div>

        {/* Capabilities & Requirements */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Capabilities & Requirements</h3>

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
                    <FormLabel className="text-sm font-normal">Provides Labor</FormLabel>
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
                    <FormLabel className="text-sm font-normal">Provides Materials</FormLabel>
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
                      <FormLabel className="text-sm font-normal">Requires 1099</FormLabel>
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
                    <FormLabel className="text-sm font-normal">Internal</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permit_issuer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">Can Issue Permits</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {payee && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">Active</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Additional Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employee_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., EMP-001"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Internal notes, special instructions, payment preferences..."
                    rows={3}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

      </form>
    </Form>
  );
};