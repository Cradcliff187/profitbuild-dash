import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { ProjectWithFinancials } from "@/types/projectFinancials";
import type { Database } from "@/integrations/supabase/types";
import { parseDateOnly } from "@/utils/dateUtils";

type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];

export interface UseProjectDataReturn {
  project: ProjectWithFinancials | null;
  estimates: Estimate[];
  quotes: Quote[];
  expenses: Expense[];
  changeOrders: ChangeOrder[];
  pendingTimeEntries: number;
  pendingReceipts: number;
  mediaCounts: { photos: number; videos: number };
  documentCount: number;
  isLoading: boolean;
  loadProjectData: () => Promise<void>;
  handleSaveQuote: (quote: Quote) => Promise<void>;
}

interface ProjectDataPayload {
  project: ProjectWithFinancials;
  estimates: Estimate[];
  quotes: Quote[];
  expenses: Expense[];
  changeOrders: ChangeOrder[];
  pendingTimeEntries: number;
  pendingReceipts: number;
  mediaCounts: { photos: number; videos: number };
  documentCount: number;
}

const projectDataQueryKey = (projectId: string) => ["project-data", projectId] as const;

export function useProjectData(projectId: string | undefined): UseProjectDataReturn {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery<ProjectDataPayload>({
    queryKey: projectId ? projectDataQueryKey(projectId) : ["project-data", "none"],
    enabled: !!projectId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      // Don't retry on "not found" — it's terminal; handled by queryFn.
      if (error?.code === "PGRST116") return false;
      return failureCount < 2;
    },
    queryFn: async () => {
      // Safe cast: enabled guard above ensures projectId is defined when queryFn runs.
      const id = projectId as string;

      // Load project data
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (projectError) {
        if (projectError.code === "PGRST116") {
          toast.error("Project Not Found", { description: "The requested project could not be found." });
          navigate("/projects");
        }
        throw projectError;
      }

      // Load related data
      const [
        { data: estimatesData },
        { data: quotesData },
        { data: expensesData },
        { data: changeOrdersData },
        pendingTimeEntriesData,
        pendingReceiptsData,
        { data: mediaData },
        documentsData,
      ] = await Promise.all([
        supabase
          .from("estimates")
          .select(`
            *,
            projects(project_name, client_name, project_number),
            estimate_line_items(*)
          `)
          .eq("project_id", id)
          .order("date_created", { ascending: false }),
        supabase
          .from("quotes")
          .select(`
            *,
            payees(payee_name),
            quote_line_items(*)
          `)
          .eq("project_id", id)
          .order("date_received", { ascending: false }),
        // Fetch expenses with proper split handling
        (async () => {
          // Fetch direct expenses (not split)
          const { data: directExpenses } = await supabase
            .from("expenses")
            .select("*, payees(payee_name), projects(project_name, project_number)")
            .eq("project_id", id)
            .eq("is_split", false);

          // Fetch split records for this project
          const { data: splitRecords } = await supabase
            .from("expense_splits")
            .select(`
              split_amount,
              expense_id,
              expenses(*, payees(payee_name), projects(project_name, project_number))
            `)
            .eq("project_id", id);

          // Format direct expenses (use actual amount)
          const formattedDirectExpenses = (directExpenses || []).map((expense) => ({
            ...expense,
            display_amount: expense.amount,
          }));

          // Format split expenses (use split_amount instead of parent amount)
          const formattedSplitExpenses = (splitRecords || []).map((split: any) => ({
            ...split.expenses,
            display_amount: split.split_amount,
          }));

          // Combine and sort
          const allExpenses = [...formattedDirectExpenses, ...formattedSplitExpenses].sort(
            (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
          );

          return { data: allExpenses };
        })(),
        supabase
          .from("change_orders")
          .select("*")
          .eq("project_id", id)
          .order("requested_date", { ascending: false }),
        supabase
          .from("expenses")
          .select("id", { count: "exact", head: true })
          .eq("project_id", id)
          .eq("category", "labor_internal")
          .eq("approval_status", "pending"),
        supabase
          .from("expenses")
          .select("id", { count: "exact", head: true })
          .eq("project_id", id)
          .not("receipt_id", "is", null)
          .eq("approval_status", "pending"),
        supabase.from("project_media").select("file_type").eq("project_id", id),
        supabase.from("project_documents").select("id", { count: "exact", head: true }).eq("project_id", id),
      ]);

      // Fetch reporting financials for this project (total_invoiced, total_expenses)
      const { data: financials } = await supabase.rpc("get_profit_analysis_data", {
        status_filter: [projectData.status],
      });

      const projectFinancials = (financials || []).find((f: any) => f.id === id);

      // Format the project data
      const formattedProject: Project = {
        ...projectData,
        created_at: new Date(projectData.created_at),
        updated_at: new Date(projectData.updated_at),
        start_date: projectData.start_date ? new Date(projectData.start_date) : undefined,
        end_date: projectData.end_date ? new Date(projectData.end_date) : undefined,
      };

      // Format estimates with line items
      const formattedEstimates = (estimatesData || []).map((estimate: any) => {
        const safeNumber = (value: any, defaultValue: number = 0): number => {
          const parsed = typeof value === "string" ? parseFloat(value) : Number(value);
          return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
        };

        const projectDataNested = Array.isArray(estimate.projects) ? estimate.projects[0] : estimate.projects;

        return {
          ...estimate,
          date_created: new Date(estimate.date_created),
          valid_until: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
          created_at: new Date(estimate.created_at),
          updated_at: new Date(estimate.updated_at),
          project_name: projectDataNested?.project_name || formattedProject.project_name,
          client_name: projectDataNested?.client_name || formattedProject.client_name,
          project_number: projectDataNested?.project_number || formattedProject.project_number,
          defaultMarkupPercent: estimate.default_markup_percent || 25,
          targetMarginPercent: estimate.target_margin_percent || 20,
          lineItems: (estimate.estimate_line_items || []).map((item: any) => ({
            id: item.id,
            category: item.category,
            description: item.description || "",
            quantity: safeNumber(item.quantity, 1),
            pricePerUnit: safeNumber(item.price_per_unit, 0),
            total: safeNumber(item.total, 0),
            unit: item.unit || "",
            sort_order: item.sort_order || 0,
            costPerUnit: safeNumber(item.cost_per_unit, 0),
            markupPercent: item.markup_percent ? safeNumber(item.markup_percent) : null,
            markupAmount: item.markup_amount ? safeNumber(item.markup_amount) : null,
            totalCost: safeNumber(item.total_cost, 0),
            totalMarkup: safeNumber(item.total_markup, 0),
          })),
        };
      });

      // Format quotes with proper typing
      const formattedQuotes = (quotesData || []).map((quote) => {
        const safeNumber = (value: any, defaultValue: number = 0): number => {
          const parsed = typeof value === "string" ? parseFloat(value) : Number(value);
          return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
        };

        const payeeData = Array.isArray(quote.payees) ? quote.payees[0] : quote.payees;

        return {
          ...quote,
          dateReceived: new Date(quote.date_received),
          createdAt: new Date(quote.created_at),
          updatedAt: new Date(quote.updated_at),
          validUntil: quote.valid_until ? new Date(quote.valid_until) : undefined,
          accepted_date: quote.accepted_date ? new Date(quote.accepted_date) : undefined,
          status: quote.status as string,
          projectName: formattedProject.project_name,
          client: formattedProject.client_name,
          project_number: formattedProject.project_number,
          quotedBy: payeeData?.payee_name || "",
          quoteNumber: quote.quote_number || "",
          lineItems: (quote.quote_line_items || []).map((item: any) => ({
            id: item.id || "",
            estimateLineItemId: item.estimate_line_item_id || undefined,
            changeOrderLineItemId: item.change_order_line_item_id || undefined,
            category: item.category,
            description: item.description || "",
            quantity: safeNumber(item.quantity, 1),
            pricePerUnit: safeNumber(item.rate, 0),
            total: safeNumber(item.total, 0),
            costPerUnit: safeNumber(item.cost_per_unit, 0),
            markupPercent: item.markup_percent ? safeNumber(item.markup_percent) : null,
            markupAmount: item.markup_amount ? safeNumber(item.markup_amount) : null,
            totalCost: safeNumber(item.total_cost, 0),
            totalMarkup: safeNumber(item.total_markup, 0),
          })),
          subtotals: {
            labor: 0,
            subcontractors: 0,
            materials: 0,
            equipment: 0,
            other: 0,
          },
          total: quote.total_amount || 0,
          isOverdue: false,
          daysUntilExpiry: 0,
        };
      }) as unknown as Quote[];

      // Format expenses with proper typing
      const formattedExpenses: Expense[] = (expensesData || []).map((expense: any) => ({
        ...expense,
        expense_date: parseDateOnly(expense.expense_date),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
        category: expense.category as string,
        payee_name: expense.payees?.payee_name,
        project_name: expense.projects?.project_name,
        project_number: expense.projects?.project_number,
      }));

      // Calculate change order totals from approved change orders
      const approvedChangeOrders = (changeOrdersData || []).filter((co) => co.status === "approved");
      const changeOrderRevenue = approvedChangeOrders.reduce((sum, co) => sum + (co.client_amount || 0), 0);
      const changeOrderCosts = approvedChangeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);

      // Merge reporting view financials for status-aware display
      const projectWithFinancials = {
        ...formattedProject,
        changeOrderRevenue,
        changeOrderCosts,
        total_invoiced: projectFinancials?.total_invoiced ?? 0,
        total_expenses: projectFinancials?.total_expenses ?? 0,
      } as unknown as ProjectWithFinancials;

      // Count media by type
      const photos = (mediaData || []).filter((m) => m.file_type === "image").length;
      const videos = (mediaData || []).filter((m) => m.file_type === "video").length;

      return {
        project: projectWithFinancials,
        estimates: formattedEstimates,
        quotes: formattedQuotes,
        expenses: formattedExpenses,
        changeOrders: changeOrdersData || [],
        pendingTimeEntries: pendingTimeEntriesData.count || 0,
        pendingReceipts: pendingReceiptsData.count || 0,
        mediaCounts: { photos, videos },
        documentCount: documentsData.count || 0,
      };
    },
  });

  // Error toast + retry UX — preserved from the pre-TanStack version.
  // Fire once per error transition (guard against re-render spam); suppress
  // for PGRST116 since the queryFn already redirected the user to /projects.
  const lastErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (!query.error) {
      lastErrorRef.current = null;
      return;
    }
    if (query.error === lastErrorRef.current) return;
    lastErrorRef.current = query.error;

    const err = query.error as any;
    if (err?.code === "PGRST116") return;

    const isNetworkError = err instanceof TypeError && err.message?.includes("fetch");
    toast.error(isNetworkError ? "Connection Error" : "Error Loading Data", {
      description: isNetworkError
        ? "Please check your internet connection and try again."
        : "Failed to load project data. If this persists, contact support.",
      action: {
        label: "Retry",
        onClick: () => {
          if (projectId) queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
        },
      },
    });
  }, [query.error, projectId, queryClient]);

  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    await queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
  }, [projectId, queryClient]);

  const handleSaveQuote = useCallback(
    async (quote: Quote) => {
      try {
        // Extract sequence number from quote_number (e.g., "225-012-QTE-01-02" → 2)
        const sequenceNumber = parseInt(quote.quoteNumber.split("-").pop() || "1", 10);

        // Insert quote into database
        const { data: quoteData, error } = await supabase
          .from("quotes")
          .insert({
            project_id: quote.project_id,
            estimate_id: quote.estimate_id,
            payee_id: quote.payee_id,
            quote_number: quote.quoteNumber,
            sequence_number: sequenceNumber,
            date_received: quote.dateReceived.toISOString().split("T")[0],
            status: quote.status,
            accepted_date: quote.accepted_date ? quote.accepted_date.toISOString().split("T")[0] : null,
            valid_until: quote.valid_until ? quote.valid_until.toISOString().split("T")[0] : null,
            includes_materials: quote.includes_materials,
            includes_labor: quote.includes_labor,
            total_amount: quote.total,
            notes: quote.notes,
            attachment_url: quote.attachment_url,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert line items
        if (quote.lineItems.length > 0) {
          const { error: lineItemsError } = await supabase.from("quote_line_items").insert(
            quote.lineItems.map((item) => ({
              quote_id: quoteData.id,
              estimate_line_item_id: item.estimateLineItemId,
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              rate: item.pricePerUnit,
              cost_per_unit: item.costPerUnit || 0,
              markup_percent: item.markupPercent,
              markup_amount: item.markupAmount,
              sort_order: 0,
            }))
          );

          if (lineItemsError) throw lineItemsError;
        }

        toast.success("Quote saved", { description: `Quote ${quote.quoteNumber} has been created successfully.` });

        // Await invalidate so the destination route sees fresh data.
        await loadProjectData();
        navigate(`/projects/${projectId}/estimates?tab=quotes`);
      } catch (error) {
        console.error("Error saving quote:", error);
        toast.error("Failed to save quote. Please try again.");
      }
    },
    [projectId, loadProjectData, navigate]
  );

  return {
    project: query.data?.project ?? null,
    estimates: query.data?.estimates ?? [],
    quotes: query.data?.quotes ?? [],
    expenses: query.data?.expenses ?? [],
    changeOrders: query.data?.changeOrders ?? [],
    pendingTimeEntries: query.data?.pendingTimeEntries ?? 0,
    pendingReceipts: query.data?.pendingReceipts ?? 0,
    mediaCounts: query.data?.mediaCounts ?? { photos: 0, videos: 0 },
    documentCount: query.data?.documentCount ?? 0,
    isLoading: query.isPending && !!projectId,
    loadProjectData,
    handleSaveQuote,
  };
}
