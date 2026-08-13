import * as z from "zod";

/**
 * Single source of truth for the project / work-order form field set.
 *
 * Shared by the create form (ProjectFormSimple) and the edit form
 * (ProjectEditForm) so the two can never drift on fields or validation again.
 * `do_not_exceed` is kept as a string in the form and parsed to a number (or
 * null) at submit time so an empty input is valid.
 */
export const projectFormSchema = z
  .object({
    project_name: z.string().min(1, "Project name is required").max(200),
    client_id: z.string().uuid("Please select a client"),
    address: z.string().optional(),
    customer_po_number: z.string().optional(),
    project_type: z.enum(["construction_project", "work_order"]),
    status: z.enum([
      "estimating",
      "approved",
      "in_progress",
      "complete",
      "on_hold",
      "cancelled",
    ]),
    job_type: z.string().optional(),
    notes: z.string().optional(),
    payment_terms: z.string(),
    minimum_margin_threshold: z.number().min(0).max(100),
    target_margin: z.number().min(0).max(100),
    do_not_exceed: z.string().optional(),
    owner_id: z.string().optional(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
  })
  .refine(
    (data) => !data.start_date || !data.end_date || data.end_date >= data.start_date,
    { message: "End date must be on or after the start date", path: ["end_date"] }
  );

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
