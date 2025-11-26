import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Plus, FileText, GitCompare, FileStack } from "lucide-react";
import { EstimateForm } from "@/components/EstimateForm";
import { QuotesList } from "@/components/QuotesList";
import { EstimateVersionComparison } from "@/components/EstimateVersionComparison";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { Estimate } from "@/types/estimate";
import type { Quote } from "@/types/quote";

interface ProjectEstimatesViewProps {
  projectId: string;
  estimates: Estimate[];
  quotes: Quote[];
  onRefresh: () => void;
}

export const ProjectEstimatesView = ({ projectId, estimates, quotes, onRefresh }: ProjectEstimatesViewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "current";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync activeTab with URL changes
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Find current/approved estimate
  const currentEstimate =
    estimates.find((e) => e.status === "approved") ||
    estimates.find((e) => e.is_current_version) ||
    estimates.sort((a, b) => b.version_number - a.version_number)[0];

  const hasMultipleEstimates = estimates.length > 1;

  const handleCreateNewVersion = () => {
    if (!currentEstimate) return;
    // Navigate to creation form with source estimate ID
    navigate(`/projects/${projectId}/estimates/new?sourceEstimateId=${currentEstimate.id}`);
  };

  const handleEditEstimate = () => {
    if (!currentEstimate) return;
    navigate(`/projects/${projectId}/estimates/${currentEstimate.id}/edit`);
  };

  const handleCreateQuote = () => {
    // Navigate within project context to keep breadcrumb navigation
    navigate(`/projects/${projectId}/estimates/quotes/new`);
  };

  const tabOptions = [
    { value: "current", label: "Current Estimate" },
    { value: "versions", label: `Versions (${estimates.length})` },
    { value: "quotes", label: `Quotes (${quotes.length})` },
    ...(hasMultipleEstimates ? [{ value: "compare", label: "Compare" }] : []),
  ];

  if (estimates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            No Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">This project doesn't have an estimate yet.</p>
          <Button onClick={() => navigate(`/projects/${projectId}/estimates/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Estimate
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL with tab param
    navigate(`/projects/${projectId}/estimates?tab=${value}`, { replace: true });
  };

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-auto">
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabOptions.map((tab) => (
                    <SelectItem key={tab.value} value={tab.value}>
                      {tab.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsList className="hidden w-full flex-wrap justify-start gap-2 rounded-full bg-muted/40 p-1 sm:flex">
              {tabOptions.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-9 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {activeTab === "current" && currentEstimate && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleEditEstimate}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button size="sm" onClick={handleCreateNewVersion}>
                <Plus className="h-3 w-3 mr-1" />
                New Version
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="current" className="mt-0">
          {currentEstimate ? (
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      Estimate {currentEstimate.estimate_number}
                    </CardTitle>
                    <Badge
                      variant={
                        currentEstimate.status === "approved"
                          ? "default"
                          : currentEstimate.status === "sent"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {currentEstimate.status}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                    <span>Version {currentEstimate.version_number}</span>
                    <span>•</span>
                    <span>Created {format(currentEstimate.date_created, "MMM d, yyyy")}</span>
                    {currentEstimate.valid_until && (
                      <>
                        <span>•</span>
                        <span>Valid Until {format(currentEstimate.valid_until, "MMM d, yyyy")}</span>
                      </>
                    )}
                  </div>
                </CardHeader>
              </Card>

              <EstimateForm
                mode="view"
                initialEstimate={currentEstimate}
                hideNavigationButtons={true}
                onSave={() => {}}
                onCancel={() => {}}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No current estimate available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="versions" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileStack className="h-4 w-4" />
                All Estimate Versions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {estimates
                  .sort((a, b) => b.version_number - a.version_number)
                  .map((estimate) => (
                    <div
                      key={estimate.id}
                      className="p-3 hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                      onClick={() => navigate(`/projects/${projectId}/estimates/${estimate.id}/edit`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{estimate.estimate_number}</span>
                          {estimate.is_current_version && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              Current
                            </Badge>
                          )}
                          <Badge
                            variant={
                              estimate.status === "approved"
                                ? "default"
                                : estimate.status === "sent"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-xs px-1.5 py-0"
                          >
                            {estimate.status}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>v{estimate.version_number}</span>
                          <span>•</span>
                          <span>{format(estimate.date_created, "MMM d, yyyy")}</span>
                          <span>•</span>
                          <span className="font-medium">{formatCurrency(estimate.total_amount)}</span>
                        </div>
                      </div>
                      <Button size="xs" variant="ghost">
                        View
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-0">
          <QuotesList
            quotes={quotes}
            estimates={estimates}
            onView={(quote) => {
              console.log("[QuotesTab] View quote clicked", { quoteId: quote.id, projectId });
              navigate(`/projects/${projectId}/estimates/quotes/${quote.id}`);
            }}
            onEdit={(quote) => {
              console.log("[QuotesTab] Edit quote clicked", { quoteId: quote.id, projectId });
              navigate(`/projects/${projectId}/estimates/quotes/${quote.id}/edit`);
            }}
            onDelete={() => onRefresh()}
            onCompare={() => {}}
            onCreateNew={handleCreateQuote}
            onRefresh={onRefresh}
          />
        </TabsContent>

        {hasMultipleEstimates && (
          <TabsContent value="compare" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitCompare className="h-4 w-4" />
                  Compare Versions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EstimateVersionComparison projectId={projectId} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
