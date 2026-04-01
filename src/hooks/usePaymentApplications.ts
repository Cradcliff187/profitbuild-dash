import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  PaymentApplication,
  PaymentApplicationLineWithSOV,
  PaymentApplicationStatus,
} from "@/types/paymentApplication";

export function usePaymentApplications(projectId: string) {
  const queryClient = useQueryClient();

  const applicationsQuery = useQuery({
    queryKey: ["payment-applications", projectId],
    queryFn: async (): Promise<PaymentApplication[]> => {
      const { data, error } = await supabase
        .from("payment_applications")
        .select("*")
        .eq("project_id", projectId)
        .order("application_number", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const createApplication = useMutation({
    mutationFn: async ({
      periodFrom,
      periodTo,
    }: {
      periodFrom: string;
      periodTo: string;
    }) => {
      const { data, error } = await supabase.rpc("create_payment_application", {
        p_project_id: projectId,
        p_period_from: periodFrom,
        p_period_to: periodTo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-applications", projectId] });
      toast.success("Payment application created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create application: ${error.message}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      applicationId,
      status,
      certifiedAmount,
      certifiedBy,
    }: {
      applicationId: string;
      status: PaymentApplicationStatus;
      certifiedAmount?: number;
      certifiedBy?: string;
    }) => {
      const updates: Record<string, string | number | null> = { status };
      if (status === "certified") {
        updates.certified_amount = certifiedAmount;
        updates.certified_by = certifiedBy;
        updates.certified_date = new Date().toISOString().split("T")[0];
      }
      const { error } = await supabase
        .from("payment_applications")
        .update(updates)
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-applications", projectId] });
      toast.success("Status updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const deleteApplication = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from("payment_applications")
        .delete()
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-applications", projectId] });
      toast.success("Payment application deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  return {
    applications: applicationsQuery.data || [],
    isLoading: applicationsQuery.isLoading,
    createApplication,
    updateStatus,
    deleteApplication,
    refetch: applicationsQuery.refetch,
  };
}

export function usePaymentApplicationLines(applicationId: string | null) {
  const queryClient = useQueryClient();

  const linesQuery = useQuery({
    queryKey: ["payment-application-lines", applicationId],
    queryFn: async (): Promise<PaymentApplicationLineWithSOV[]> => {
      const { data, error } = await supabase
        .from("payment_application_lines")
        .select("*, sov_line_item:sov_line_items(*)")
        .eq("payment_application_id", applicationId!)
        .order("created_at");
      if (error) throw error;
      return (data || []) as unknown as PaymentApplicationLineWithSOV[];
    },
    enabled: !!applicationId,
  });

  const updateLine = useMutation({
    mutationFn: async ({
      lineId,
      currentWork,
      storedMaterials,
    }: {
      lineId: string;
      currentWork: number;
      storedMaterials: number;
    }) => {
      const { error } = await supabase
        .from("payment_application_lines")
        .update({
          current_work: currentWork,
          stored_materials: storedMaterials,
        })
        .eq("id", lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-application-lines", applicationId] });
      // Also refresh the parent application to get updated G702 totals
      queryClient.invalidateQueries({ queryKey: ["payment-applications"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update line: ${error.message}`);
    },
  });

  return {
    lines: linesQuery.data || [],
    isLoading: linesQuery.isLoading,
    updateLine,
    refetch: linesQuery.refetch,
  };
}
