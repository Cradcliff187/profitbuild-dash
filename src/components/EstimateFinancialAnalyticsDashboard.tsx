import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Target, AlertTriangle, DollarSign } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface EstimateData {
  id: string;
  project_id: string;
  estimate_number: string;
  version_number: number;
  parent_estimate_id: string | null;
  total_amount: number;
  total_cost: number;
  contingency_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  date_created: string;
  projects: {
    id: string;
    project_name: string;
    project_number: string;
    client_name: string;
  };
}

interface ScenarioMetrics {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPercent: number;
  projectCount: number;
}

interface MidRangeMetrics extends ScenarioMetrics {
  meanRevenue: number;
  meanCost: number;
  meanProfit: number;
  meanMargin: number;
  medianRevenue: number;
  medianCost: number;
  medianProfit: number;
  medianMargin: number;
}

interface StatusCounts {
  draft: number;
  sent: number;
  approved: number;
  rejected: number;
  expired: number;
  total: number;
}

interface ProjectRange {
  projectId: string;
  projectName: string;
  projectNumber: string;
  clientName: string;
  lowEstimate: number;
  highEstimate: number;
  lowCost: number;
  highCost: number;
  spread: number;
  spreadPercent: number;
  estimateCount: number;
}

interface EstimateFinancialAnalyticsDashboardProps {
  timeframe?: '30' | '90' | '365' | 'all';
}

export default function EstimateFinancialAnalyticsDashboard({ timeframe = 'all' }: EstimateFinancialAnalyticsDashboardProps) {
  const isMobile = useIsMobile();
  const [estimates, setEstimates] = useState<EstimateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstimates();
  }, [timeframe]);

  const fetchEstimates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('estimates')
        .select(`
          id,
          project_id,
          estimate_number,
          version_number,
          parent_estimate_id,
          total_amount,
          total_cost,
          contingency_amount,
          status,
          date_created,
          projects (
            id,
            project_name,
            project_number,
            client_name
          )
        `)
        .in('status', ['draft', 'sent', 'approved'])
        .eq('projects.category', 'construction')
        .order('date_created', { ascending: false });

      if (timeframe !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(timeframe));
        query = query.gte('date_created', daysAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setEstimates((data as EstimateData[]) || []);
    } catch (error) {
      console.error('Error fetching estimates:', error);
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    if (!estimates.length) return null;

    // Group estimates by project
    const projectMap = new Map<string, EstimateData[]>();
    estimates.forEach(est => {
      const existing = projectMap.get(est.project_id) || [];
      projectMap.set(est.project_id, [...existing, est]);
    });

    // Calculate high-side (highest estimate per project)
    let highRevenue = 0;
    let highCost = 0;
    projectMap.forEach(projectEstimates => {
      const highest = projectEstimates.reduce((max, est) => {
        const revenue = est.total_amount || 0;
        const maxRevenue = max.total_amount || 0;
        return revenue > maxRevenue ? est : max;
      });
      highRevenue += highest.total_amount || 0;
      highCost += highest.total_cost || 0;
    });

    // Calculate low-side (lowest estimate per project)
    let lowRevenue = 0;
    let lowCost = 0;
    projectMap.forEach(projectEstimates => {
      const lowest = projectEstimates.reduce((min, est) => {
        const revenue = est.total_amount || 0;
        const minRevenue = min.total_amount || 0;
        return revenue < minRevenue ? est : min;
      });
      lowRevenue += lowest.total_amount || 0;
      lowCost += lowest.total_cost || 0;
    });

    // Calculate mid-range (mean)
    const totalRevenue = estimates.reduce((sum, est) => sum + (est.total_amount || 0), 0);
    const totalCost = estimates.reduce((sum, est) => sum + (est.total_cost || 0), 0);
    const meanRevenue = totalRevenue / estimates.length;
    const meanCost = totalCost / estimates.length;

    // Calculate median
    const sortedRevenues = [...estimates]
      .map(e => e.total_amount || 0)
      .sort((a, b) => a - b);
    const sortedCosts = [...estimates]
      .map(e => e.total_cost || 0)
      .sort((a, b) => a - b);

    const medianRevenue = sortedRevenues.length % 2 === 0
      ? (sortedRevenues[sortedRevenues.length / 2 - 1] + sortedRevenues[sortedRevenues.length / 2]) / 2
      : sortedRevenues[Math.floor(sortedRevenues.length / 2)];

    const medianCost = sortedCosts.length % 2 === 0
      ? (sortedCosts[sortedCosts.length / 2 - 1] + sortedCosts[sortedCosts.length / 2]) / 2
      : sortedCosts[Math.floor(sortedCosts.length / 2)];

    const medianProfit = medianRevenue - medianCost;
    const medianMargin = medianRevenue > 0 ? ((medianRevenue - medianCost) / medianRevenue) * 100 : 0;

    // Status distribution
    const statusCounts: StatusCounts = {
      draft: estimates.filter(e => e.status === 'draft').length,
      sent: estimates.filter(e => e.status === 'sent').length,
      approved: estimates.filter(e => e.status === 'approved').length,
      rejected: estimates.filter(e => e.status === 'rejected').length,
      expired: estimates.filter(e => e.status === 'expired').length,
      total: estimates.length,
    };

    // Project breakdown
    const projectBreakdown: ProjectRange[] = [];
    projectMap.forEach((projectEstimates, projectId) => {
      const revenues = projectEstimates.map(e => e.total_amount || 0);
      const costs = projectEstimates.map(e => e.total_cost || 0);
      
      const low = Math.min(...revenues);
      const high = Math.max(...revenues);
      const lowIdx = revenues.indexOf(low);
      const highIdx = revenues.indexOf(high);
      
      projectBreakdown.push({
        projectId,
        projectName: projectEstimates[0].projects?.project_name || 'Unknown',
        projectNumber: projectEstimates[0].projects?.project_number || '',
        clientName: projectEstimates[0].projects?.client_name || 'Unknown',
        lowEstimate: low,
        highEstimate: high,
        lowCost: costs[lowIdx] || 0,
        highCost: costs[highIdx] || 0,
        spread: high - low,
        spreadPercent: low > 0 ? ((high - low) / low) * 100 : 0,
        estimateCount: projectEstimates.length,
      });
    });

    return {
      highSide: {
        totalRevenue: highRevenue,
        totalCost: highCost,
        totalProfit: highRevenue - highCost,
        marginPercent: highRevenue > 0 ? ((highRevenue - highCost) / highRevenue) * 100 : 0,
        projectCount: projectMap.size,
      } as ScenarioMetrics,
      midRange: {
        totalRevenue: meanRevenue,
        totalCost: meanCost,
        totalProfit: meanRevenue - meanCost,
        marginPercent: meanRevenue > 0 ? ((meanRevenue - meanCost) / meanRevenue) * 100 : 0,
        projectCount: estimates.length,
        meanRevenue,
        meanCost,
        meanProfit: meanRevenue - meanCost,
        meanMargin: meanRevenue > 0 ? ((meanRevenue - meanCost) / meanRevenue) * 100 : 0,
        medianRevenue,
        medianCost,
        medianProfit,
        medianMargin,
      } as MidRangeMetrics,
      lowSide: {
        totalRevenue: lowRevenue,
        totalCost: lowCost,
        totalProfit: lowRevenue - lowCost,
        marginPercent: lowRevenue > 0 ? ((lowRevenue - lowCost) / lowRevenue) * 100 : 0,
        projectCount: projectMap.size,
      } as ScenarioMetrics,
      statusCounts,
      projectBreakdown: projectBreakdown.sort((a, b) => b.spread - a.spread),
    };
  }, [estimates]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getMarginColor = (margin: number) => {
    if (margin < 10) return 'text-destructive';
    if (margin < 20) return 'text-orange-600';
    if (margin < 30) return 'text-green-600';
    return 'text-blue-600';
  };

  const getMarginVariant = (margin: number): "default" | "secondary" | "destructive" | "outline" => {
    if (margin < 10) return 'destructive';
    if (margin < 20) return 'outline';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="dense-spacing">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-muted-foreground">No outstanding estimates found for the selected timeframe.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="dense-spacing w-full min-w-0 max-w-full">
      <div className="space-y-3 w-full">
        {/* Primary Financial Metrics */}
        <div className="space-y-3">
        {/* High-Side Card */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
                <TrendingUp className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
                <span className="truncate">High-Side Analysis</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs flex-shrink-0 hidden sm:inline-flex">Optimistic</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg sm:text-xl font-bold font-mono mb-2">{formatCurrency(analytics.highSide.totalRevenue)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
                <div>
                  <div className="text-muted-foreground">Cost</div>
                  <div className="font-mono">{formatCurrency(analytics.highSide.totalCost)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Profit</div>
                  <div className={`font-mono ${analytics.highSide.totalProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatCurrency(analytics.highSide.totalProfit)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Margin</div>
                  <Badge variant={getMarginVariant(analytics.highSide.marginPercent)} className="text-xs">
                    {analytics.highSide.marginPercent.toFixed(1)}%
                  </Badge>
                </div>
            </div>
            <div className="text-xs text-muted-foreground">{analytics.highSide.projectCount} projects</div>
          </CardContent>
        </Card>

        {/* Mid-Range Card */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
                <Target className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="truncate">Mid-Range Analysis</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs flex-shrink-0 hidden sm:inline-flex">Central Tendency</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {/* Two-column metric display: Mean vs Median */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b mb-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Mean (Average)</div>
                  <div className="text-base sm:text-lg font-bold font-mono">{formatCurrency(analytics.midRange.meanRevenue)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Median (Typical)</div>
                  <div className="text-base sm:text-lg font-bold font-mono">{formatCurrency(analytics.midRange.medianRevenue)}</div>
                </div>
            </div>
            
            {/* Skew indicator */}
            {Math.abs(analytics.midRange.meanRevenue - analytics.midRange.medianRevenue) > (analytics.midRange.medianRevenue * 0.15) && (
              <div className="text-xs text-orange-600 flex items-center gap-1 py-1">
                <AlertTriangle className="h-3 w-3" />
                <span>
                  {analytics.midRange.meanRevenue > analytics.midRange.medianRevenue 
                    ? 'Distribution skewed by high-value estimates' 
                    : 'Distribution skewed by low-value estimates'}
                </span>
              </div>
            )}
            
            {/* Compact profit and margin (based on mean) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <div className="text-muted-foreground">Avg Profit</div>
                  <div className={`font-mono font-medium ${analytics.midRange.meanProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatCurrency(analytics.midRange.meanProfit)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg Margin</div>
                  <Badge variant={getMarginVariant(analytics.midRange.meanMargin)} className="text-xs">
                    {analytics.midRange.meanMargin.toFixed(1)}%
                  </Badge>
                </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {analytics.midRange.projectCount} estimates
            </div>
          </CardContent>
        </Card>

        {/* Low-Side Card */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
                <TrendingDown className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                <span className="truncate">Low-Side Analysis</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs flex-shrink-0 hidden sm:inline-flex">Conservative</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg sm:text-xl font-bold font-mono mb-2">{formatCurrency(analytics.lowSide.totalRevenue)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
                <div>
                  <div className="text-muted-foreground">Cost</div>
                  <div className="font-mono">{formatCurrency(analytics.lowSide.totalCost)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Profit</div>
                  <div className={`font-mono ${analytics.lowSide.totalProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatCurrency(analytics.lowSide.totalProfit)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Margin</div>
                  <Badge variant={getMarginVariant(analytics.lowSide.marginPercent)} className="text-xs">
                    {analytics.lowSide.marginPercent.toFixed(1)}%
                  </Badge>
                </div>
            </div>
            <div className="text-xs text-muted-foreground">{analytics.lowSide.projectCount} projects</div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-semibold">Estimate Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
            {[
              { status: 'Draft', count: analytics.statusCounts.draft, color: 'bg-gray-500' },
              { status: 'Sent', count: analytics.statusCounts.sent, color: 'bg-blue-500' },
              { status: 'Approved', count: analytics.statusCounts.approved, color: 'bg-green-500' },
            ].map(({ status, count, color }, index) => (
              <div key={status} className={`flex items-center gap-2 ${index > 0 ? 'mt-2' : ''}`}>
                <div className="w-16 sm:w-20 text-xs text-muted-foreground">{status}</div>
                <div className="w-10 sm:w-12 text-xs font-mono">{count}</div>
                <div className="flex-1">
                  <Progress 
                    value={(count / analytics.statusCounts.total) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="w-10 sm:w-12 text-xs text-muted-foreground text-right">
                  {((count / analytics.statusCounts.total) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Project Breakdown - Hidden on mobile */}
      {!isMobile && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">Project-Level Estimate Ranges</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div className="border rounded-md overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <div className="min-w-[640px]">
                <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="text-xs p-2">Project</TableHead>
                    <TableHead className="text-xs p-2">Client</TableHead>
                    <TableHead className="text-xs p-2 text-center">Count</TableHead>
                    <TableHead className="text-xs p-2 text-right">Low</TableHead>
                    <TableHead className="text-xs p-2 text-right">High</TableHead>
                    <TableHead className="text-xs p-2 text-right">Spread</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.projectBreakdown.slice(0, 10).map((project) => (
                    <TableRow key={project.projectId} className="h-9">
                      <TableCell className="text-xs p-2">
                        <div className="font-medium">{project.projectNumber}</div>
                        <div className="text-muted-foreground truncate max-w-[150px]">{project.projectName}</div>
                      </TableCell>
                      <TableCell className="text-xs p-2 truncate max-w-[120px]">{project.clientName}</TableCell>
                      <TableCell className="text-xs p-2 text-center">{project.estimateCount}</TableCell>
                      <TableCell className="text-xs p-2 text-right font-mono">{formatCurrency(project.lowEstimate)}</TableCell>
                      <TableCell className="text-xs p-2 text-right font-mono">{formatCurrency(project.highEstimate)}</TableCell>
                      <TableCell className="text-xs p-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono">{formatCurrency(project.spread)}</span>
                          <span className={`text-xs ${project.spreadPercent > 25 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {project.spreadPercent > 0 ? `+${project.spreadPercent.toFixed(0)}%` : '—'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
            {analytics.projectBreakdown.length > 10 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Showing 10 of {analytics.projectBreakdown.length} projects
              </p>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
