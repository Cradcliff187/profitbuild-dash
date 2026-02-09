import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { History, Plus } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { Estimate } from "@/types/estimate";

interface EstimateVersionManagerProps {
  estimate: Estimate;
  onVersionCreated?: (newVersion: Estimate) => void;
}

export const EstimateVersionManager = ({ estimate, onVersionCreated }: EstimateVersionManagerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [versions, setVersions] = useState<Estimate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadVersionHistory = async () => {
    try {
      // Find root estimate ID
      const rootEstimateId = estimate.parent_estimate_id || estimate.id;
      
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          projects(project_name, client_name)
        `)
        .or(`id.eq.${rootEstimateId},parent_estimate_id.eq.${rootEstimateId}`)
        .order('version_number', { ascending: true });

      if (error) throw error;

      const formattedVersions = data.map((est: any) => ({
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
        project_name: est.projects?.project_name,
        client_name: est.projects?.client_name,
        defaultMarkupPercent: 25,
        targetMarginPercent: 20
      }));

      setVersions(formattedVersions);
    } catch (error) {
      console.error('Error loading version history:', error);
      toast.error("Failed to load version history.");
    }
  };

  const createNewVersion = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_estimate_version', {
        source_estimate_id: estimate.id
      });

      if (error) throw error;

      toast.success("Version Created", { description: "New estimate version created successfully." });

      // Reload version history
      await loadVersionHistory();
      
      if (onVersionCreated) {
        // Fetch the new version details and line items
        const { data: newVersionData, error: fetchError } = await supabase
          .from('estimates')
          .select('*')
          .eq('id', data)
          .single();

        if (!fetchError && newVersionData) {
          // Fetch the copied line items for the new version
          const { data: lineItemsData, error: lineItemsError } = await supabase
            .from('estimate_line_items')
            .select('*')
            .eq('estimate_id', data)
            .order('sort_order');

          const lineItems = lineItemsData?.map((item: any) => ({
            id: item.id,
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            pricePerUnit: item.price_per_unit || item.rate,
            total: item.total,
            unit: item.unit,
            sort_order: item.sort_order,
            costPerUnit: item.cost_per_unit,
            markupPercent: item.markup_percent,
            markupAmount: item.markup_amount,
            totalCost: item.total_cost || (item.quantity * item.cost_per_unit),
            totalMarkup: item.total_markup || (item.quantity * (item.price_per_unit || item.rate) - item.quantity * item.cost_per_unit)
          })) || [];

          const newVersion: Estimate = {
            id: newVersionData.id,
            project_id: newVersionData.project_id,
            estimate_number: newVersionData.estimate_number,
            date_created: new Date(newVersionData.date_created),
            total_amount: newVersionData.total_amount,
            defaultMarkupPercent: newVersionData.default_markup_percent || 25,
            targetMarginPercent: newVersionData.target_margin_percent || 20,
            status: newVersionData.status,
            notes: newVersionData.notes,
            valid_until: newVersionData.valid_until ? new Date(newVersionData.valid_until) : undefined,
            revision_number: newVersionData.revision_number,
            contingency_percent: newVersionData.contingency_percent ?? 10,
            contingency_amount: newVersionData.contingency_amount,
            contingency_used: newVersionData.contingency_used || 0,
            version_number: newVersionData.version_number || 1,
            parent_estimate_id: newVersionData.parent_estimate_id,
            is_current_version: newVersionData.is_current_version ?? true,
            valid_for_days: newVersionData.valid_for_days || 30,
            lineItems: lineItems,
            created_at: new Date(newVersionData.created_at),
            updated_at: new Date(newVersionData.updated_at),
            project_name: estimate.project_name,
            client_name: estimate.client_name
          };
          onVersionCreated(newVersion);
        }
      }
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error("Failed to create new version.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (open) {
      loadVersionHistory();
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Versions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Estimate Version History</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Manage versions for estimate {estimate.estimate_number}
            </p>
            {estimate.status === 'approved' && (
              <Button 
                onClick={createNewVersion} 
                disabled={isLoading}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Version
              </Button>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {versions.map((version) => (
              <Card key={version.id} className={version.is_current_version ? 'border-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">Version {version.version_number}</h4>
                        {version.is_current_version && (
                          <Badge variant="default">Current</Badge>
                        )}
                        <Badge variant="outline">{version.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Created: {format(version.date_created, 'MMM dd, yyyy')}</p>
                        <p>Total: {formatCurrency(version.total_amount)}</p>
                        {version.valid_until && (
                          <p>Valid until: {format(version.valid_until, 'MMM dd, yyyy')}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {version.notes && (
                        <p className="text-sm text-muted-foreground italic">{version.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {estimate.status !== 'approved' && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              💡 Tip: Only approved estimates can have new versions created. This ensures proper version control workflow.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};