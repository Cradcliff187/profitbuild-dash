import type { Database } from "@/integrations/supabase/types";

export type PaymentApplicationStatus = Database["public"]["Enums"]["payment_application_status"];

export type ScheduleOfValues = Database["public"]["Tables"]["schedule_of_values"]["Row"];
export type SOVLineItem = Database["public"]["Tables"]["sov_line_items"]["Row"];
export type PaymentApplication = Database["public"]["Tables"]["payment_applications"]["Row"];
export type PaymentApplicationLine = Database["public"]["Tables"]["payment_application_lines"]["Row"];

export type SOVLineItemInsert = Database["public"]["Tables"]["sov_line_items"]["Insert"];
export type PaymentApplicationInsert = Database["public"]["Tables"]["payment_applications"]["Insert"];
export type PaymentApplicationLineUpdate = Database["public"]["Tables"]["payment_application_lines"]["Update"];

export interface PaymentApplicationLineWithSOV extends PaymentApplicationLine {
  sov_line_item: SOVLineItem;
}

export interface PaymentApplicationWithLines extends PaymentApplication {
  lines: PaymentApplicationLineWithSOV[];
}

export const PAYMENT_APP_STATUS_LABELS: Record<PaymentApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  certified: "Certified",
  paid: "Paid",
  rejected: "Rejected",
};

export const PAYMENT_APP_STATUS_COLORS: Record<PaymentApplicationStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  certified: "bg-green-100 text-green-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};
