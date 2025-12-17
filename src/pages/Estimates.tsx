import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { EstimatesCardView } from "@/components/EstimatesCardView";
import { EstimatesTableView } from "@/components/EstimatesTableView";
import { EstimateForm } from "@/components/EstimateForm";
import { EstimateSearchFilters, type SearchFilters } from "@/components/EstimateSearchFilters";
import { EstimateExportModal } from "@/components/EstimateExportModal";
import EstimateFinancialAnalyticsDashboard from "@/components/EstimateFinancialAnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Estimate } from "@/types/estimate";
import { Plus, BarChart3, Download, Calculator } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = "list" | "create" | "edit" | "view";

const EstimatesPage = () => {
  const isMobile = useIsMobile();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<Estimate[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<Array<{ id: string; client_name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; project_name: string; project_number: string }>>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchText: "",
    status: [],
    projectType: "",
    clientName: [],
    projectName: [],
    categories: [],
    dateRange: { start: null, end: null },
    amountRange: { min: null, max: null },
    hasVersions: null,
  });
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"estimates" | "analytics">(
    tabParam === "analytics" ? "analytics" : "estimates",
  );
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'30' | '90' | '365' | 'all'>('all');

  // Get preselected project ID from URL params
  const preselectedProjectId = searchParams.get("projectId");
  const createParam = searchParams.get("create");
  const preselectedProjectType = createParam === "work_order" ? "work_order" : undefined;

  useEffect(() => {
    loadEstimates();
    loadClients();
    loadProjects();

    if ((preselectedProjectId || createParam === "work_order") && viewMode === "list") {
      setViewMode("create");
    }
  }, [preselectedProjectId, createParam]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "analytics" || tabParam === "estimates") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (
      statusParam &&
      (statusParam === "draft" || statusParam === "pending" || statusParam === "approved" || statusParam === "rejected")
    ) {
      setSearchFilters((prev) => ({
        ...prev,
        status: [statusParam],
      }));
    }
  }, [searchParams]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, client_name")
      .eq("is_active", true)
      .order("client_name", { ascending: true });

    if (error) {
      console.error("Error loading clients:", error);
      return;
    }

    setClients(data || []);
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, project_name, project_number")
      .eq("category", "construction")
      .order("project_number", { ascending: true });

    if (error) {
      console.error("Error loading projects:", error);
      return;
    }

    setProjects(data || []);
  };

  useEffect(() => {
    applyFilters();
  }, [estimates, searchFilters]);

  const tabOptions = [
    { value: "estimates", label: "Estimates", icon: Calculator },
    { value: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  const handleTabChange = (value: string) => {
    if (value === "estimates" || value === "analytics") {
      setActiveTab(value);
      const newParams = new URLSearchParams(searchParams);
      if (value === "estimates") {
        newParams.delete("tab");
      } else {
        newParams.set("tab", value);
      }
      setSearchParams(newParams);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("estimates-realtime-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "estimates",
        },
        (payload) => {
          console.log("Estimate changed:", payload);
          loadEstimates();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const applyFilters = () => {
    let filtered = [...estimates];

    if (searchFilters.searchText) {
      const searchText = searchFilters.searchText.toLowerCase();
      filtered = filtered.filter(
        (estimate) =>
          estimate.estimate_number.toLowerCase().includes(searchText) ||
          estimate.project_name?.toLowerCase().includes(searchText) ||
          estimate.client_name?.toLowerCase().includes(searchText) ||
          estimate.notes?.toLowerCase().includes(searchText),
      );
    }

    if (searchFilters.status.length > 0) {
      filtered = filtered.filter((estimate) => searchFilters.status.includes(estimate.status));
    }

    if (searchFilters.clientName.length > 0) {
      filtered = filtered.filter((estimate) => {
        if (!estimate.client_name) return false;
        return searchFilters.clientName.some((client) =>
          estimate.client_name!.toLowerCase().includes(client.toLowerCase()),
        );
      });
    }

    if (searchFilters.projectName.length > 0) {
      filtered = filtered.filter((estimate) => {
        if (!estimate.project_name) return false;
        return searchFilters.projectName.some((project) =>
          estimate.project_name!.toLowerCase().includes(project.toLowerCase()),
        );
      });
    }

    if (searchFilters.dateRange.start) {
      filtered = filtered.filter((estimate) => new Date(estimate.date_created) >= searchFilters.dateRange.start!);
    }
    if (searchFilters.dateRange.end) {
      filtered = filtered.filter((estimate) => new Date(estimate.date_created) <= searchFilters.dateRange.end!);
    }

    if (searchFilters.amountRange.min !== null) {
      filtered = filtered.filter((estimate) => estimate.total_amount >= searchFilters.amountRange.min!);
    }
    if (searchFilters.amountRange.max !== null) {
      filtered = filtered.filter((estimate) => estimate.total_amount <= searchFilters.amountRange.max!);
    }

    if (searchFilters.categories.length > 0) {
      filtered = filtered.filter((estimate) => {
        return estimate.lineItems.some((lineItem) => searchFilters.categories.includes(lineItem.category));
      });
    }

    if (searchFilters.hasVersions !== null) {
      const estimatesByFamily = new Map<string, number>();
      estimates.forEach((estimate) => {
        const familyId = estimate.parent_estimate_id || estimate.id;
        estimatesByFamily.set(familyId, (estimatesByFamily.get(familyId) || 0) + 1);
      });

      filtered = filtered.filter((estimate) => {
        const familyId = estimate.parent_estimate_id || estimate.id;
        const versionCount = estimatesByFamily.get(familyId) || 1;
        return searchFilters.hasVersions ? versionCount > 1 : versionCount === 1;
      });
    }

    setFilteredEstimates(filtered);
  };

  const handleSearch = () => {
    applyFilters();
  };

  const resetFilters = () => {
    setSearchFilters({
      searchText: "",
      status: [],
      projectType: "",
      clientName: [],
      projectName: [],
      categories: [],
      dateRange: { start: null, end: null },
      amountRange: { min: null, max: null },
      hasVersions: null,
    });
  };

  const loadEstimates = async () => {
    try {
      setLoading(true);

      const { data: estimatesData, error: estimatesError } = await supabase
        .from("estimates")
        .select(
          `
          *,
          projects (
            project_number,
            project_name,
            client_name
          )
        `,
        )
        .eq("projects.category", "construction")
        .order("created_at", { ascending: false });

      if (estimatesError) throw estimatesError;

      const estimateIds = estimatesData?.map((est) => est.id) || [];
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from("estimate_line_items")
        .select("*")
        .in("estimate_id", estimateIds)
        .order("sort_order");

      if (lineItemsError) throw lineItemsError;

      const { data: quotesData, error: quotesError } = await supabase
        .from("quotes")
        .select("id, estimate_id, total_amount, status");

      if (quotesError) throw quotesError;

      const lineItemsByEstimate = (lineItemsData || []).reduce((acc: any, item: any) => {
        if (!acc[item.estimate_id]) {
          acc[item.estimate_id] = [];
        }
        acc[item.estimate_id].push({
          id: item.id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          pricePerUnit: item.price_per_unit || item.rate,
          total: item.total,
          unit: item.unit,
          sort_order: item.sort_order,
          costPerUnit: item.cost_per_unit || 0,
          markupPercent: item.markup_percent,
          markupAmount: item.markup_amount,
          totalCost: item.total_cost || item.quantity * (item.cost_per_unit || 0),
          totalMarkup: item.total_markup || 0,
        });
        return acc;
      }, {});

      const quotesByEstimate = (quotesData || []).reduce((acc: any, quote: any) => {
        if (!acc[quote.estimate_id]) {
          acc[quote.estimate_id] = [];
        }
        acc[quote.estimate_id].push(quote);
        return acc;
      }, {});

      const formattedEstimates =
        estimatesData?.map((est: any) => ({
          id: est.id,
          project_id: est.project_id,
          estimate_number: est.estimate_number,
          date_created: new Date(est.date_created),
          total_amount: est.total_amount,
          total_cost: est.total_cost || 0,
          status: est.status,
          notes: est.notes,
          valid_until: est.valid_until ? new Date(est.valid_until) : undefined,
          revision_number: est.revision_number,
          contingency_percent: est.contingency_percent ?? 10.0,
          contingency_amount: est.contingency_amount,
          contingency_used: est.contingency_used || 0,
          version_number: est.version_number || 1,
          parent_estimate_id: est.parent_estimate_id || undefined,
          is_current_version: est.is_current_version ?? true,
          valid_for_days: est.valid_for_days || 30,
          lineItems: lineItemsByEstimate[est.id] || [],
          created_at: new Date(est.created_at),
          updated_at: new Date(est.updated_at),
          project_number: est.projects?.project_number,
          project_name: est.projects?.project_name,
          client_name: est.projects?.client_name,
          quotes: quotesByEstimate[est.id] || [],
          defaultMarkupPercent: 25,
          targetMarginPercent: 20,
          is_draft: false,
        })) || [];

      setEstimates(formattedEstimates);
    } catch (error) {
      console.error("Error loading estimates:", error);
      toast({
        title: "Error",
        description: "Failed to load estimates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEstimate = (estimate: Estimate) => {
    if (selectedEstimate) {
      setEstimates((prev) => prev.map((e) => (e.id === estimate.id ? estimate : e)));
    } else {
      setEstimates((prev) => [...prev, estimate]);
    }
    setViewMode("list");
    setSelectedEstimate(undefined);
    setSearchParams({});
    loadEstimates();
  };

  const handleCreateNew = () => {
    setSelectedEstimate(undefined);
    setViewMode("create");
  };

  const getCreateButtonText = () => {
    if (estimates.length === 0) return "Create First Estimate";
    if (preselectedProjectId) return "Create New Version";
    return "Create New Estimate";
  };

  const handleEdit = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setViewMode("edit");
  };

  const handleView = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setViewMode("view");
  };

  const handleDelete = async (id: string) => {
    try {
      const estimate = estimates.find((e) => e.id === id);
      if (!estimate) {
        toast({
          title: "Error",
          description: "Estimate not found.",
          variant: "destructive",
        });
        return;
      }

      const { data: acceptedQuotes } = await supabase
        .from("quotes")
        .select("id, quote_number")
        .eq("estimate_id", id)
        .eq("status", "accepted");

      if (acceptedQuotes && acceptedQuotes.length > 0) {
        toast({
          title: "Cannot Delete Estimate",
          description: `This estimate has ${acceptedQuotes.length} accepted quote(s): ${acceptedQuotes.map((q) => q.quote_number).join(", ")}. You must reject or delete these quotes first.`,
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      const { data: childVersions } = await supabase
        .from("estimates")
        .select("id, estimate_number")
        .eq("parent_estimate_id", id);

      if (childVersions && childVersions.length > 0) {
        toast({
          title: "Cannot Delete Estimate",
          description: `This estimate has ${childVersions.length} child version(s). Delete the child versions first: ${childVersions.map((v) => v.estimate_number).join(", ")}`,
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      const { error: lineItemsError } = await supabase.from("estimate_line_items").delete().eq("estimate_id", id);
      if (lineItemsError) throw lineItemsError;

      const { error: quotesError } = await supabase.from("quotes").delete().eq("estimate_id", id);
      if (quotesError) throw quotesError;

      const { error: estimateError } = await supabase.from("estimates").delete().eq("id", id);

      if (estimateError) {
        if (estimateError.message.includes("foreign key") || estimateError.code === "23503") {
          toast({
            title: "Cannot Delete Estimate",
            description:
              "This estimate is referenced by other records in the database. Please contact support for assistance.",
            variant: "destructive",
            duration: 8000,
          });
        } else {
          throw estimateError;
        }
        return;
      }

      setEstimates((prev) => prev.filter((e) => e.id !== id));

      toast({
        title: "Estimate Deleted",
        description: "The estimate and all related data have been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting estimate:", error);
      toast({
        title: "Error",
        description: `Failed to delete estimate: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setViewMode("list");
    setSelectedEstimate(undefined);
    setSearchParams({});
  };

  if (loading) {
    return (
      <MobilePageWrapper onRefresh={loadEstimates} enablePullToRefresh>
        <BrandedLoader message="Loading estimates..." />
      </MobilePageWrapper>
    );
  }

  if (viewMode !== "list") {
    return (
      <EstimateForm
        mode={viewMode as "create" | "edit" | "view"}
        initialEstimate={selectedEstimate}
        preselectedProjectId={preselectedProjectId}
        preselectedProjectType={preselectedProjectType}
        onSave={handleSaveEstimate}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <MobilePageWrapper onRefresh={loadEstimates} enablePullToRefresh>
      <PageHeader
        icon={Calculator}
        title="Estimates"
        description="Create and manage project estimates"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowExportModal(true)} className="hidden sm:flex">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleCreateNew} size="sm" className="hidden sm:flex">
              <Plus className="h-4 w-4 mr-2" />
              {getCreateButtonText()}
            </Button>
          </>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="mt-4 w-full max-w-full overflow-hidden"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full max-w-full min-w-0">
          <div className="w-full sm:w-auto">
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabOptions.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <SelectItem key={tab.value} value={tab.value}>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{tab.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {!isMobile && (
              <TabsList className="w-full flex-wrap justify-start gap-2 rounded-full bg-muted/40 p-1 flex">
                {tabOptions.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            )}
          </div>
        </div>

        <TabsContent value="estimates" className="space-y-4 w-full max-w-full overflow-hidden">
          <EstimateSearchFilters
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            onSearch={handleSearch}
            onReset={resetFilters}
            resultCount={filteredEstimates.length}
            clients={clients}
            projects={projects}
          />
          {isMobile ? (
            <EstimatesCardView
              estimates={filteredEstimates}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onCreateNew={handleCreateNew}
            />
          ) : (
            <EstimatesTableView
              estimates={filteredEstimates}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onCreateNew={handleCreateNew}
            />
          )}
          
          {isMobile && (
            <Button
              variant="default"
              onClick={handleCreateNew}
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            >
              <Plus className="h-6 w-6 !text-white" />
            </Button>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-semibold">Time Period</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={analyticsTimeframe === "30" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsTimeframe("30")}
                  className="text-xs"
                >
                  30 Days
                </Button>
                <Button
                  variant={analyticsTimeframe === "90" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsTimeframe("90")}
                  className="text-xs"
                >
                  90 Days
                </Button>
                <Button
                  variant={analyticsTimeframe === "365" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsTimeframe("365")}
                  className="text-xs"
                >
                  1 Year
                </Button>
                <Button
                  variant={analyticsTimeframe === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsTimeframe("all")}
                  className="text-xs"
                >
                  All Time
                </Button>
              </div>
            </CardContent>
          </Card>

          <EstimateFinancialAnalyticsDashboard timeframe={analyticsTimeframe} />
        </TabsContent>
      </Tabs>

      <EstimateExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} filters={searchFilters} />
    </MobilePageWrapper>
  );
};

export default EstimatesPage;
