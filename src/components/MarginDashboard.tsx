import { useState, useEffect } from 'react';
import { FileText, CheckCircle, DollarSign, Percent, Package, Minus, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/types/project';
import { calculateProjectMargin, type ProjectMargin, getContingencyUtilization } from '@/types/margin';
import { getMarginThresholdStatus, getThresholdStatusColor, getThresholdStatusLabel, formatContingencyRemaining } from '@/utils/thresholdUtils';
import { formatCurrency } from '@/lib/utils';

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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!project || !marginData) {
    return (
      <div className="space-y-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Project Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No project data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const thresholdStatus = getMarginThresholdStatus(
    marginData.margin_percentage,
    marginData.minimum_threshold,
    marginData.target_margin
  );
  
  const statusColor = getThresholdStatusColor(thresholdStatus);
  const statusLabel = getThresholdStatusLabel(thresholdStatus);


  const getMarginColorClass = (percentage: number): string => {
    if (percentage >= 20) return 'text-green-600';
    if (percentage >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getContingencyUsageColorClass = (usagePercent: number): string => {
    if (usagePercent >= 80) return 'hsl(var(--destructive))';
    if (usagePercent >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  const contingencyUsagePercent = getContingencyUtilization(marginData);
  const marginProgress = Math.min((marginData.margin_percentage / marginData.target_margin) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Contract Display Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contract Amount Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contract Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(marginData.contracted_amount)}
            </div>
            <p className="text-xs text-muted-foreground">Total project value</p>
          </CardContent>
        </Card>

        {/* Total Accepted Quotes Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accepted Quotes</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(marginData.total_accepted_quotes || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Approved payee costs</p>
          </CardContent>
        </Card>

        {/* Current Margin Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Margin</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div 
              className="text-2xl font-bold"
              style={{ color: statusColor }}
            >
              {formatCurrency(marginData.current_margin)}
            </div>
            <p className="text-xs text-muted-foreground">Profit after costs</p>
          </CardContent>
        </Card>

        {/* Margin Percentage Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margin Percentage</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`text-4xl font-bold ${getMarginColorClass(marginData.margin_percentage)}`}>
                {marginData.margin_percentage.toFixed(1)}%
              </div>
              <Badge 
                variant="outline" 
                style={{ borderColor: statusColor, color: statusColor }}
              >
                {statusLabel}
              </Badge>
            </div>
            
            {/* Progress bar showing margin vs target */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress to Target</span>
                <span>{marginData.margin_percentage.toFixed(1)}% / {marginData.target_margin}%</span>
              </div>
              <Progress 
                value={marginProgress}
                className="h-2"
              />
            </div>
            
            <p className="text-xs text-muted-foreground">Profit margin %</p>
          </CardContent>
        </Card>
      </div>

      {/* Contingency Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>Contingency Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Total Contingency Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contingency</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(marginData.contingency_total)}
                </div>
                <p className="text-xs text-muted-foreground">Budgeted buffer</p>
              </CardContent>
            </Card>

            {/* Contingency Used Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contingency Used</CardTitle>
                <Minus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(marginData.contingency_used)}
                </div>
                <p className="text-xs text-muted-foreground">Utilized so far</p>
              </CardContent>
            </Card>

            {/* Contingency Remaining Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contingency Remaining</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(marginData.contingency_remaining)}
                </div>
                <p className="text-xs text-muted-foreground">Available buffer</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Usage progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Contingency Usage</span>
              <span>{contingencyUsagePercent.toFixed(1)}%</span>
            </div>
            <Progress 
              value={contingencyUsagePercent} 
              className="h-3"
              style={{
                ['--progress-foreground' as any]: getContingencyUsageColorClass(contingencyUsagePercent)
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Used: {formatCurrency(marginData.contingency_used)}</span>
              <span>Remaining: {formatCurrency(marginData.contingency_remaining)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <div className="text-sm text-muted-foreground">
            {project.project_name} ({project.project_number})
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Project Status</div>
              <div className="text-lg font-semibold capitalize">
                {project.status.replace('_', ' ')}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Target Margin</div>
              <div className="text-lg font-semibold">
                {marginData.target_margin}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}