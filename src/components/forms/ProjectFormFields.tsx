import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { Badge } from "@/components/ui/badge";
import { ClientSelector } from "@/components/ClientSelector";
import { FormSection } from "@/components/forms/FormSection";
import { JOB_TYPES, PROJECT_STATUSES } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { ProjectFormValues } from "@/components/forms/projectFormSchema";

export interface SelectedClientSummary {
  client_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface ProjectFormFieldsProps {
  form: UseFormReturn<ProjectFormValues>;
  /** Called when the user picks a client. Owners typically set client_id +
   *  payment_terms and load the details summary. */
  onClientChange: (clientId: string) => void;
  selectedClient: SelectedClientSummary | null;
  /** Read-only project number shown at the top (edit only; create auto-generates). */
  projectNumber?: string;
}

/**
 * Shared field layout for the create + edit project/work-order forms.
 *
 * Renders every field the schema defines, grouped into the canonical sections
 * (Basics / Classification / Schedule / Financial / Ownership / Notes) so both
 * surfaces read identically on desktop and mobile.
 */
export function ProjectFormFields({
  form,
  onClientChange,
  selectedClient,
  projectNumber,
}: ProjectFormFieldsProps) {
  const [internalEmployees, setInternalEmployees] = useState<Array<{ id: string; payee_name: string }>>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from("payees")
        .select("id, payee_name")
        .eq("is_internal", true)
        .order("payee_name");
      if (error) { console.error("Failed to load employees:", error); return; }
      if (data) setInternalEmployees(data);
    };
    fetchEmployees();
  }, []);

  return (
    <>
      {projectNumber && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Project #</span>
          <Badge variant="outline" className="font-mono">{projectNumber}</Badge>
        </div>
      )}

      <FormSection title="Basics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="project_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter project name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client *</FormLabel>
                <FormControl>
                  <ClientSelector
                    value={field.value}
                    onValueChange={onClientChange}
                    placeholder="Select a client"
                    required
                    showLabel={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedClient && (
          <div className="rounded-md border bg-muted/50 p-3 text-xs space-y-1">
            <div className="font-medium">{selectedClient.client_name}</div>
            {selectedClient.company_name && (
              <div className="text-muted-foreground">{selectedClient.company_name}</div>
            )}
            {selectedClient.email && (
              <div className="text-muted-foreground">{selectedClient.email}</div>
            )}
            {selectedClient.phone && (
              <div className="text-muted-foreground">{selectedClient.phone}</div>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="customer_po_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer PO Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter PO number (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Address</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter project address"
                  className="min-h-[60px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection title="Classification" withDivider>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="project_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="construction_project">Construction Project</SelectItem>
                    <SelectItem value="work_order">Work Order</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROJECT_STATUSES.map((statusOption) => (
                      <SelectItem key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="job_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Workflow: Estimating → Quoted → Approved → In Progress → Complete
        </p>
      </FormSection>

      <FormSection title="Schedule" withDivider>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <DatePickerPopover
                    value={field.value}
                    onSelect={field.onChange}
                    placeholder="Pick a start date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <DatePickerPopover
                    value={field.value}
                    onSelect={field.onChange}
                    placeholder="Pick an end date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <FormSection title="Financial" withDivider>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Due on receipt">Due on Receipt</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minimum_margin_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Margin %</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_margin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Margin %</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="do_not_exceed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Do Not Exceed (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Budget ceiling"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Maximum budget cap. Dashboard will alert when expenses approach this limit.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection title="Ownership" withDivider>
        <FormField
          control={form.control}
          name="owner_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Owner (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {internalEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.payee_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection title="Notes" withDivider>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Project Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add project notes, requirements, or special instructions..."
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>
    </>
  );
}
