import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { EstimateAccuracyChart } from "./EstimateAccuracyChart";
import { VersionEvolutionChart } from "./VersionEvolutionChart";
import { TrendingUp, TrendingDown, Target, Clock, Users, DollarSign } from "lucide-react";
import type { Estimate } from "@/types/estimate";

interface AnalyticsData {
  totalFamilies: number;
  avgVersionsPerFamily: number;
  avgTimeToApproval: number;
  estimateAccuracy: number;
  topPerformingProjects: Array<{
    projectName: string;
    accuracy: number;
    versions: number;
  }>;
  versionTrends: Array<{
    month: string;
    versionsCreated: number;
    approvalRate: number;
  }>;
}

export const EstimateFamilyAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | '1y'>('90d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeframe]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      switch (selectedTimeframe) {
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Fetch estimates with project data
      const { data: estimates, error: estimatesError } = await supabase
        .from('estimates')
        .select(`
          *,
          projects (
            id,
            project_name,
            client_name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (estimatesError) throw estimatesError;

      // Calculate analytics
      const analyticsData = calculateAnalytics(estimates || []);
      setAnalytics(analyticsData);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (estimates: any[]): AnalyticsData => {
    // Group estimates by family (parent_estimate_id or id for root estimates)
    const familyGroups = new Map<string, any[]>();
    
    estimates.forEach(estimate => {
      const familyId = estimate.parent_estimate_id || estimate.id;
      if (!familyGroups.has(familyId)) {
        familyGroups.set(familyId, []);
      }
      familyGroups.get(familyId)!.push(estimate);
    });

    const totalFamilies = familyGroups.size;
    
    // Calculate average versions per family
    const avgVersionsPerFamily = totalFamilies > 0 
      ? Array.from(familyGroups.values()).reduce((sum, family) => sum + family.length, 0) / totalFamilies
      : 0;

    // Calculate approval metrics
    let totalApprovalTime = 0;
    let approvedCount = 0;
    let accuracySum = 0;
    let accuracyCount = 0;

    const projectPerformance = new Map<string, { 
      projectName: string; 
      totalAccuracy: number; 
      versions: number; 
      accuracyCount: number 
    }>();

    familyGroups.forEach(family => {
      const sortedVersions = family.sort((a, b) => a.version_number - b.version_number);
      const firstVersion = sortedVersions[0];
      const finalVersion = sortedVersions[sortedVersions.length - 1];

      // Calculate accuracy (how close initial estimate was to final)
      if (firstVersion && finalVersion && firstVersion.total_amount > 0) {
        const accuracy = 100 - (Math.abs(finalVersion.total_amount - firstVersion.total_amount) / firstVersion.total_amount * 100);
        accuracySum += accuracy;
        accuracyCount++;

        // Track project performance
        const projectName = firstVersion.projects?.project_name || 'Unknown Project';
        if (!projectPerformance.has(projectName)) {
          projectPerformance.set(projectName, {
            projectName,
            totalAccuracy: 0,
            versions: 0,
            accuracyCount: 0
          });
        }
        const projectData = projectPerformance.get(projectName)!;
        projectData.totalAccuracy += accuracy;
        projectData.versions += family.length;
        projectData.accuracyCount++;
      }

      // Calculate approval time for approved estimates
      const approvedEstimate = family.find(e => e.status === 'approved');
      if (approvedEstimate && firstVersion) {
        const approvalTime = new Date(approvedEstimate.created_at).getTime() - new Date(firstVersion.created_at).getTime();
        totalApprovalTime += approvalTime;
        approvedCount++;
      }
    });

    const avgTimeToApproval = approvedCount > 0 ? totalApprovalTime / approvedCount / (1000 * 60 * 60 * 24) : 0; // in days
    const estimateAccuracy = accuracyCount > 0 ? accuracySum / accuracyCount : 0;

    // Top performing projects
    const topPerformingProjects = Array.from(projectPerformance.values())
      .map(project => ({
        projectName: project.projectName,
        accuracy: project.accuracyCount > 0 ? project.totalAccuracy / project.accuracyCount : 0,
        versions: project.versions
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    // Version trends by month
    const monthlyData = new Map<string, { versionsCreated: number; approved: number; total: number }>();
    
    estimates.forEach(estimate => {
      const month = new Date(estimate.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { versionsCreated: 0, approved: 0, total: 0 });
      }
      const data = monthlyData.get(month)!;
      data.versionsCreated++;
      data.total++;
      if (estimate.status === 'approved') {
        data.approved++;
      }
    });

    const versionTrends = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      versionsCreated: data.versionsCreated,
      approvalRate: data.total > 0 ? (data.approved / data.total) * 100 : 0
    }));

    return {
      totalFamilies,
      avgVersionsPerFamily,
      avgTimeToApproval,
      estimateAccuracy,
      topPerformingProjects,
      versionTrends
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Estimate Family Analytics</h2>
          <p className="text-muted-foreground">Performance insights and trends</p>
        </div>
        <Tabs value={selectedTimeframe} onValueChange={(value) => setSelectedTimeframe(value as any)}>
          <TabsList>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Estimate Families</p>
                <p className="text-2xl font-bold">{analytics.totalFamilies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Versions/Family</p>
                <p className="text-2xl font-bold">{analytics.avgVersionsPerFamily.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Approval Time</p>
                <p className="text-2xl font-bold">{analytics.avgTimeToApproval.toFixed(0)}d</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Estimate Accuracy</p>
                <p className="text-2xl font-bold">{analytics.estimateAccuracy.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EstimateAccuracyChart data={analytics.topPerformingProjects} />
        <VersionEvolutionChart data={analytics.versionTrends} />
      </div>

      {/* Top Performing Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Top Performing Projects</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topPerformingProjects.map((project, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{project.projectName}</p>
                  <p className="text-sm text-muted-foreground">
                    {project.versions} version{project.versions !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{project.accuracy.toFixed(1)}% accuracy</p>
                    <Progress value={project.accuracy} className="w-20 h-2" />
                  </div>
                  <Badge variant={project.accuracy >= 90 ? "default" : project.accuracy >= 75 ? "secondary" : "outline"}>
                    {project.accuracy >= 90 ? "Excellent" : project.accuracy >= 75 ? "Good" : "Needs Improvement"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};