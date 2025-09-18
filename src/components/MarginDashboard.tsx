import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/types/project';
import { calculateProjectMargin, type ProjectMargin } from '@/types/margin';
import { getMarginThresholdStatus, getThresholdStatusColor, getThresholdStatusLabel, formatContingencyRemaining } from '@/utils/thresholdUtils';

interface MarginDashboardProps {
  projectId: string;
}

export function MarginDashboard({ projectId }: MarginDashboardProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [marginData, setMarginData] = useState<ProjectMargin | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          // Transform database data to Project type
          const projectData: Project = {
            id: data.id,
            project_name: data.project_name,
            project_number: data.project_number,
            qb_formatted_number: data.qb_formatted_number,
            client_name: data.client_name,
            address: data.address,
            project_type: data.project_type,
            job_type: data.job_type,
            status: data.status,
            start_date: data.start_date ? new Date(data.start_date) : undefined,
            end_date: data.end_date ? new Date(data.end_date) : undefined,
            quickbooks_job_id: data.quickbooks_job_id,
            sync_status: data.sync_status,
            last_synced_at: data.last_synced_at,
            contracted_amount: data.contracted_amount,
            total_accepted_quotes: data.total_accepted_quotes,
            current_margin: data.current_margin,
            margin_percentage: data.margin_percentage,
            contingency_remaining: data.contingency_remaining,
            minimum_margin_threshold: data.minimum_margin_threshold,
            target_margin: data.target_margin,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at)
          };

          setProject(projectData);
          
          // Calculate margin data using existing utilities
          const margin = calculateProjectMargin(projectData);
          setMarginData(margin);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        toast({
          title: "Error",
          description: "Failed to load project margin data.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, toast]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Project Margin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!project || !marginData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Project Margin</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No project data available.</p>
        </CardContent>
      </Card>
    );
  }

  const thresholdStatus = getMarginThresholdStatus(
    marginData.margin_percentage,
    marginData.minimum_threshold,
    marginData.target_margin
  );
  
  const statusColor = getThresholdStatusColor(thresholdStatus);
  const statusLabel = getThresholdStatusLabel(thresholdStatus);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Project Margin</CardTitle>
        <div className="text-sm text-muted-foreground">
          {project.project_name} ({project.project_number})
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Current Margin</div>
            <div className="text-2xl font-bold">
              {formatCurrency(marginData.current_margin)}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Margin %</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {marginData.margin_percentage.toFixed(1)}%
              </div>
              <Badge 
                variant="outline" 
                style={{ borderColor: statusColor, color: statusColor }}
              >
                {statusLabel}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Contract Amount</div>
            <div className="text-lg font-semibold">
              {formatCurrency(marginData.contracted_amount)}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Contingency Remaining</div>
            <div className="text-lg font-semibold">
              {formatContingencyRemaining(marginData.contingency_remaining)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}