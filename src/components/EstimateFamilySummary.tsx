import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Eye, Plus, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Estimate } from "@/types/estimate";
import { formatCurrency } from "@/lib/utils";
import { BrandedLoader } from "@/components/ui/branded-loader";

interface EstimateFamilySummaryProps {
  projectId: string;
  projectName: string;
  onCreateEstimate?: () => void;
  onViewEstimate?: (estimateId: string) => void;
}

export const EstimateFamilySummary = ({ 
  projectId, 
  projectName, 
  onCreateEstimate,
  onViewEstimate 
}: EstimateFamilySummaryProps) => {
  const { toast } = useToast();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEstimates();
  }, [projectId]);

  const loadEstimates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      const formattedEstimates = data.map((est: any) => ({
        id: est.id,
        project_id: est.project_id,
        estimate_number: est.estimate_number,
        date_created: new Date(est.date_created),
        total_amount: est.total_amount,
        status: est.status,
        notes: est.notes,
        valid_until: est.valid_until ? new Date(est.valid_until) : undefined,
        revision_number: est.revision_number,
        contingency_percent: est.contingency_percent ?? 10,
        contingency_amount: est.contingency_amount,
        contingency_used: est.contingency_used || 0,
        version_number: est.version_number || 1,
        parent_estimate_id: est.parent_estimate_id,
        is_current_version: est.is_current_version ?? true,
        valid_for_days: est.valid_for_days || 30,
        lineItems: [],
        created_at: new Date(est.created_at),
        updated_at: new Date(est.updated_at),
        project_name: projectName,
        client_name: '',
        defaultMarkupPercent: 25,
        targetMarginPercent: 20
      }));

      setEstimates(formattedEstimates);
    } catch (error) {
      console.error('Error loading estimates:', error);
      toast({
        title: "Error",
        description: "Failed to load estimates.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewVersion = async () => {
    if (estimates.length === 0) {
      onCreateEstimate?.();
      return;
    }

    const currentVersion = estimates.find(e => e.is_current_version);
    if (!currentVersion) return;

    try {
      const { data, error } = await supabase.rpc('create_estimate_version', {
        source_estimate_id: currentVersion.id
      });

      if (error) throw error;

      toast({
        title: "New Version Created",
        description: "A new estimate version has been created."
      });

      // Navigate to edit the new version
      if (onViewEstimate) {
        onViewEstimate(data);
      }
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: "Error",
        description: "Failed to create new version.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <BrandedLoader message="Loading estimate summary..." />;
  }

  if (estimates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Estimates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No Estimates Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first estimate for this project.
            </p>
            <Button onClick={onCreateEstimate}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Estimate
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentVersion = estimates.find(e => e.is_current_version) || estimates[0];
  const totalVersions = estimates.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Estimate Family
          </CardTitle>
          <Badge variant="outline">
            {totalVersions} version{totalVersions !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Version Summary */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">Current Version {currentVersion.version_number}</h4>
              <Badge className={getStatusColor(currentVersion.status)}>
                {currentVersion.status}
              </Badge>
            </div>
             <div className="text-right">
               <div className="font-bold text-lg">
                 {formatCurrency(currentVersion.total_amount, { showCents: false })}
               </div>
               <div className="text-xs text-muted-foreground">
                 {format(currentVersion.date_created, 'MMM dd, yyyy')}
               </div>
             </div>
          </div>

          {currentVersion.valid_until && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Clock className="h-4 w-4" />
              Valid until {format(currentVersion.valid_until, 'MMM dd, yyyy')}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
             <div>
               <span className="text-muted-foreground">Contingency:</span>
               <div className="font-medium">
                 {currentVersion.contingency_percent}% ({formatCurrency(currentVersion.contingency_amount || 0, { showCents: false })})
               </div>
             </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <div className="font-medium capitalize">{currentVersion.status.replace('_', ' ')}</div>
            </div>
          </div>
        </div>

        {/* Margin Breakdown - Only show if estimate is approved */}
        {currentVersion.status === 'approved' && (
          <div className="border rounded-lg p-3 bg-muted/10">
            <h5 className="font-medium text-sm mb-2">Estimated Margin</h5>
            <div className="space-y-1 text-xs font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span>{formatCurrency(currentVersion.total_amount, { showCents: false })}</span>
              </div>
              <div className="flex justify-between text-orange-600 dark:text-orange-400">
                <span>− Est. Costs:</span>
                <span>{formatCurrency((currentVersion.total_amount || 0) * 0.7, { showCents: false })}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>= Est. Margin:</span>
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency((currentVersion.total_amount || 0) * 0.3, { showCents: false })}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Actual margin will be calculated after quotes are received and change orders processed.
            </p>
          </div>
        )}

        {/* Version Evolution */}
        {totalVersions > 1 && (
          <div className="space-y-2">
            <h5 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Version Evolution
            </h5>
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
              {estimates.slice(0, 3).map((estimate, index) => (
                <div key={estimate.id} className="flex items-center justify-between p-2 bg-muted/10 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">v{estimate.version_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {estimate.status}
                    </Badge>
                  </div>
                   <div className="text-right">
                     <div className="font-medium">{formatCurrency(estimate.total_amount, { showCents: false })}</div>
                     <div className="text-xs text-muted-foreground">
                       {format(estimate.date_created, 'MMM dd')}
                     </div>
                   </div>
                </div>
              ))}
              {totalVersions > 3 && (
                <div className="text-center text-xs text-muted-foreground py-1">
                  +{totalVersions - 3} more versions
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onViewEstimate?.(currentVersion.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Current
          </Button>
          <Button 
            onClick={handleCreateNewVersion}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Version
          </Button>
        </div>

        <Button 
          variant="ghost" 
          onClick={() => window.location.href = `/estimates?project=${projectId}`}
          className="w-full text-sm"
        >
          View All Estimates & Versions
        </Button>
      </CardContent>
    </Card>
  );
};