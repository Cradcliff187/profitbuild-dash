import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ScheduleOfValues, SOVLineItem } from "@/types/paymentApplication";

export function useScheduleOfValues(projectId: string) {
  const queryClient = useQueryClient();

  const sovQuery = useQuery({
    queryKey: ["schedule-of-values", projectId],
    queryFn: async (): Promise<ScheduleOfValues | null> => {
      const { data, error } = await supabase
        .from("schedule_of_values")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const sovLinesQuery = useQuery({
    queryKey: ["sov-line-items", sovQuery.data?.id],
    queryFn: async (): Promise<SOVLineItem[]> => {
      const { data, error } = await supabase
        .from("sov_line_items")
        .select("*")
        .eq("sov_id", sovQuery.data?.id ?? "")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!sovQuery.data?.id,
  });

  const generateSOV = useMutation({
    mutationFn: async ({
      estimateId,
      retainagePercent = 10,
    }: {
      estimateId: string;
      retainagePercent?: number;
    }) => {
      const { data, error } = await supabase.rpc("generate_sov_from_estimate", {
        p_project_id: projectId,
        p_estimate_id: estimateId,
        p_retainage_percent: retainagePercent,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-of-values", projectId] });
      toast.success("Schedule of Values generated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate SOV: ${error.message}`);
    },
  });

  const updateRetainage = useMutation({
    mutationFn: async (retainagePercent: number) => {
      const { error } = await supabase
        .from("schedule_of_values")
        .update({ retainage_percent: retainagePercent })
        .eq("project_id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-of-values", projectId] });
      toast.success("Retainage updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update retainage: ${error.message}`);
    },
  });

  return {
    sov: sovQuery.data,
    sovLines: sovLinesQuery.data || [],
    isLoading: sovQuery.isLoading,
    isLinesLoading: sovLinesQuery.isLoading,
    generateSOV,
    updateRetainage,
    refetch: () => {
      sovQuery.refetch();
      sovLinesQuery.refetch();
    },
  };
}
