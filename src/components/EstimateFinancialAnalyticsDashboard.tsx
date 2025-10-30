import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Target, AlertTriangle, DollarSign } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function EstimateFinancialAnalyticsDashboard() {
  const [estimates, setEstimates] = useState<EstimateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'30' | '90' | '365' | 'all'>('all');

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

    // Calculate mid-range (average of all estimates)
    const totalRevenue = estimates.reduce((sum, est) => sum + (est.total_amount || 0), 0);
    const totalCost = estimates.reduce((sum, est) => sum + (est.total_cost || 0), 0);
    const midRevenue = totalRevenue / estimates.length;
    const midCost = totalCost / estimates.length;

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
        totalRevenue: midRevenue,
        totalCost: midCost,
        totalProfit: midRevenue - midCost,
        marginPercent: midRevenue > 0 ? ((midRevenue - midCost) / midRevenue) * 100 : 0,
        projectCount: estimates.length,
      } as ScenarioMetrics,
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
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No outstanding estimates found for the selected timeframe.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Estimate Financial Overview</h2>
          <p className="text-xs text-muted-foreground">Outstanding estimate pricing analysis and profitability metrics</p>
        </div>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
          <TabsList>
            <TabsTrigger value="30" className="text-xs">30 Days</TabsTrigger>
            <TabsTrigger value="90" className="text-xs">90 Days</TabsTrigger>
            <TabsTrigger value="365" className="text-xs">1 Year</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Primary Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* High-Side Card */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                High-Side Analysis
              </CardTitle>
              <Badge variant="outline" className="text-xs">Optimistic</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              <div className="text-2xl font-bold font-mono">{formatCurrency(analytics.highSide.totalRevenue)}</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
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
            </div>
          </CardContent>
        </Card>

        {/* Mid-Range Card */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Mid-Range Analysis
              </CardTitle>
              <Badge variant="outline" className="text-xs">Average</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              <div className="text-2xl font-bold font-mono">{formatCurrency(analytics.midRange.totalRevenue)}</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Cost</div>
                  <div className="font-mono">{formatCurrency(analytics.midRange.totalCost)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Profit</div>
                  <div className={`font-mono ${analytics.midRange.totalProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatCurrency(analytics.midRange.totalProfit)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Margin</div>
                  <Badge variant={getMarginVariant(analytics.midRange.marginPercent)} className="text-xs">
                    {analytics.midRange.marginPercent.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Avg of {analytics.midRange.projectCount} estimates</div>
            </div>
          </CardContent>
        </Card>

        {/* Low-Side Card */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-green-600" />
                Low-Side Analysis
              </CardTitle>
              <Badge variant="outline" className="text-xs">Conservative</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              <div className="text-2xl font-bold font-mono">{formatCurrency(analytics.lowSide.totalRevenue)}</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm font-medium">Estimate Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-2">
            {[
              { status: 'Draft', count: analytics.statusCounts.draft, color: 'bg-gray-500' },
              { status: 'Sent', count: analytics.statusCounts.sent, color: 'bg-blue-500' },
              { status: 'Approved', count: analytics.statusCounts.approved, color: 'bg-green-500' },
            ].map(({ status, count, color }) => (
              <div key={status} className="flex items-center gap-3">
                <div className="w-20 text-xs text-muted-foreground">{status}</div>
                <div className="w-12 text-xs font-mono">{count}</div>
                <div className="flex-1">
                  <Progress 
                    value={(count / analytics.statusCounts.total) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="w-12 text-xs text-muted-foreground text-right">
                  {((count / analytics.statusCounts.total) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Breakdown */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm font-medium">Project-Level Estimate Ranges</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="rounded-md border">
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
          {analytics.projectBreakdown.length > 10 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Showing 10 of {analytics.projectBreakdown.length} projects
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
