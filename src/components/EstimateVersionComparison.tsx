import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Estimate } from "@/types/estimate";
import { formatCurrency } from "@/lib/utils";

interface EstimateVersionComparisonProps {
  projectId: string;
  onClose?: () => void;
}

export const EstimateVersionComparison = ({ projectId, onClose }: EstimateVersionComparisonProps) => {
  const { toast } = useToast();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedVersion1, setSelectedVersion1] = useState<string>("");
  const [selectedVersion2, setSelectedVersion2] = useState<string>("");
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
        .order('version_number', { ascending: true });

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
        contingency_percent: est.contingency_percent || 10,
        contingency_amount: est.contingency_amount,
        contingency_used: est.contingency_used || 0,
        version_number: est.version_number || 1,
        parent_estimate_id: est.parent_estimate_id,
        is_current_version: est.is_current_version ?? true,
        valid_for_days: est.valid_for_days || 30,
        lineItems: [],
        created_at: new Date(est.created_at),
        updated_at: new Date(est.updated_at),
        project_name: '',
        client_name: '',
        defaultMarkupPercent: 25,
        targetMarginPercent: 20
      }));

      setEstimates(formattedEstimates);

      // Auto-select current and previous version if available
      if (formattedEstimates.length >= 2) {
        const current = formattedEstimates.find(e => e.is_current_version);
        const previous = formattedEstimates.filter(e => !e.is_current_version).pop();
        
        if (current) setSelectedVersion2(current.id);
        if (previous) setSelectedVersion1(previous.id);
      }
    } catch (error) {
      console.error('Error loading estimates:', error);
      toast({
        title: "Error",
        description: "Failed to load estimates for comparison.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getVersionById = (id: string) => estimates.find(e => e.id === id);
  const version1 = getVersionById(selectedVersion1);
  const version2 = getVersionById(selectedVersion2);

  const calculateDifference = (val1: number, val2: number) => {
    const diff = val2 - val1;
    const percentage = val1 !== 0 ? ((diff / val1) * 100) : 0;
    return { amount: diff, percentage };
  };

  const renderDifferenceIcon = (amount: number) => {
    if (amount > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (amount < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const renderDifferenceText = (amount: number, percentage: number) => {
    if (amount === 0) return <span className="text-gray-600">No change</span>;
    
    const color = amount > 0 ? 'text-green-600' : 'text-red-600';
    const sign = amount > 0 ? '+' : '';
    
     return (
       <span className={color}>
         {formatCurrency(amount, { showCents: false })} ({sign}{percentage.toFixed(1)}%)
       </span>
     );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (estimates.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              At least 2 estimate versions are needed for comparison.
            </p>
            {onClose && (
              <Button variant="outline" onClick={onClose} className="mt-4">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Version Comparison</CardTitle>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Version Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="space-y-2">
            <label className="text-sm font-medium">Compare Version</label>
            <Select value={selectedVersion1} onValueChange={setSelectedVersion1}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                 {estimates.map((estimate) => (
                   <SelectItem key={estimate.id} value={estimate.id}>
                     Version {estimate.version_number} - {formatCurrency(estimate.total_amount, { showCents: false })}
                   </SelectItem>
                 ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">With Version</label>
            <Select value={selectedVersion2} onValueChange={setSelectedVersion2}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                 {estimates.map((estimate) => (
                   <SelectItem key={estimate.id} value={estimate.id}>
                     Version {estimate.version_number} - {formatCurrency(estimate.total_amount, { showCents: false })}
                     {estimate.is_current_version && " (Current)"}
                   </SelectItem>
                 ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Results */}
        {version1 && version2 && version1.id !== version2.id && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Version 1 Details */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Version {version1.version_number}
                    </CardTitle>
                    <Badge variant="outline">{version1.status}</Badge>
                  </div>
                </CardHeader>
                 <CardContent className="space-y-3">
                   <div>
                     <div className="text-2xl font-bold">
                       {formatCurrency(version1.total_amount, { showCents: false })}
                     </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {format(version1.date_created, 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Contingency:</span>
                      <span>{version1.contingency_percent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valid Until:</span>
                      <span>
                        {version1.valid_until 
                          ? format(version1.valid_until, 'MMM dd, yyyy')
                          : 'No expiry'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Version 2 Details */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Version {version2.version_number}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">{version2.status}</Badge>
                      {version2.is_current_version && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                 <CardContent className="space-y-3">
                   <div>
                     <div className="text-2xl font-bold">
                       {formatCurrency(version2.total_amount, { showCents: false })}
                     </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {format(version2.date_created, 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Contingency:</span>
                      <span>{version2.contingency_percent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valid Until:</span>
                      <span>
                        {version2.valid_until 
                          ? format(version2.valid_until, 'MMM dd, yyyy')
                          : 'No expiry'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Differences */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Key Changes
                  {renderDifferenceIcon(version2.total_amount - version1.total_amount)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Amount:</span>
                      <div className="text-right">
                        {(() => {
                          const diff = calculateDifference(version1.total_amount, version2.total_amount);
                          return renderDifferenceText(diff.amount, diff.percentage);
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Contingency Rate:</span>
                      <div className="text-right">
                        {version1.contingency_percent !== version2.contingency_percent ? (
                          <span className="text-blue-600">
                            {version1.contingency_percent}% → {version2.contingency_percent}%
                          </span>
                        ) : (
                          <span className="text-gray-600">No change</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Status Change:</span>
                      <div className="text-right">
                        {version1.status !== version2.status ? (
                          <span className="text-blue-600">
                            {version1.status} → {version2.status}
                          </span>
                        ) : (
                          <span className="text-gray-600">No change</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-medium">Time Between:</span>
                      <div className="text-right text-muted-foreground">
                        {Math.abs(
                          Math.ceil(
                            (version2.date_created.getTime() - version1.date_created.getTime()) / 
                            (1000 * 60 * 60 * 24)
                          )
                        )} days
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    <strong>Summary:</strong> {
                      version2.total_amount > version1.total_amount 
                        ? `The estimate increased by ${((version2.total_amount - version1.total_amount) / version1.total_amount * 100).toFixed(1)}%, indicating scope expansion or price adjustments.`
                        : version2.total_amount < version1.total_amount 
                        ? `The estimate decreased by ${((version1.total_amount - version2.total_amount) / version1.total_amount * 100).toFixed(1)}%, suggesting cost optimizations or scope reduction.`
                        : "The estimate total remained unchanged between versions."
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {version1 && version2 && version1.id === version2.id && (
          <div className="text-center py-8 text-muted-foreground">
            Please select different versions to compare.
          </div>
        )}
      </CardContent>
    </Card>
  );
};