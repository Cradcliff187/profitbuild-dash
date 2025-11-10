import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const ProjectEstimatesView = ({ 
  projectId, 
  estimates, 
  quotes, 
  onRefresh 
}: ProjectEstimatesViewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'current';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync activeTab with URL changes
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Find current/approved estimate
  const currentEstimate = estimates.find(e => e.status === 'approved') 
    || estimates.find(e => e.is_current_version) 
    || estimates.sort((a, b) => b.version_number - a.version_number)[0];

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
    navigate(`/quotes?projectId=${projectId}&estimateId=${currentEstimate?.id}`);
  };

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
          <p className="text-sm text-muted-foreground mb-4">
            This project doesn't have an estimate yet.
          </p>
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
        <div className="flex items-center justify-between mb-3">
          <TabsList className="h-8">
            <TabsTrigger value="current" className="text-xs px-3 py-1">
              Current Estimate
            </TabsTrigger>
            <TabsTrigger value="versions" className="text-xs px-3 py-1">
              Versions ({estimates.length})
            </TabsTrigger>
            <TabsTrigger value="quotes" className="text-xs px-3 py-1">
              Quotes ({quotes.length})
            </TabsTrigger>
            {hasMultipleEstimates && (
              <TabsTrigger value="compare" className="text-xs px-3 py-1">
                Compare
              </TabsTrigger>
            )}
          </TabsList>

          {activeTab === "current" && currentEstimate && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleEditEstimate}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button 
                size="sm" 
                onClick={handleCreateNewVersion}
              >
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
                    <Badge variant={
                      currentEstimate.status === 'approved' ? 'default' :
                      currentEstimate.status === 'sent' ? 'secondary' :
                      'outline'
                    }>
                      {currentEstimate.status}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                    <span>Version {currentEstimate.version_number}</span>
                    <span>•</span>
                    <span>Created {format(currentEstimate.date_created, 'MMM d, yyyy')}</span>
                    {currentEstimate.valid_until && (
                      <>
                        <span>•</span>
                        <span>Valid Until {format(currentEstimate.valid_until, 'MMM d, yyyy')}</span>
                      </>
                    )}
                  </div>
                </CardHeader>
              </Card>

              <EstimateForm
                mode="view"
                initialEstimate={currentEstimate}
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
                          <span className="text-sm font-medium">
                            {estimate.estimate_number}
                          </span>
                          {estimate.is_current_version && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              Current
                            </Badge>
                          )}
                          <Badge variant={
                            estimate.status === 'approved' ? 'default' :
                            estimate.status === 'sent' ? 'secondary' :
                            'outline'
                          } className="text-xs px-1.5 py-0">
                            {estimate.status}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>v{estimate.version_number}</span>
                          <span>•</span>
                          <span>{format(estimate.date_created, 'MMM d, yyyy')}</span>
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
            onEdit={(quote) => {
              console.log('[QuotesTab] Edit quote clicked', { quoteId: quote.id, projectId });
              navigate(`/projects/${projectId}/estimates/quotes/${quote.id}/edit`);
            }}
            onDelete={() => onRefresh()}
            onCompare={() => {}}
            onCreateNew={() => navigate(`/projects/${projectId}/estimates/quotes/new?tab=quotes`)}
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
                <EstimateVersionComparison 
                  projectId={projectId}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
