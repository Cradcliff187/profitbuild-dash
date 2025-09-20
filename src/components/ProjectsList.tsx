import { useState, useEffect } from "react";
import { Building2, Edit, Trash2, Plus, Filter, DollarSign, TrendingUp, TrendingDown, Target, ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle, Calculator } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VarianceBadge } from "@/components/ui/variance-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Project, ProjectStatus, ProjectType } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getMarginThresholdStatus, getThresholdStatusColor, getThresholdStatusLabel, formatContingencyRemaining } from "@/utils/thresholdUtils";

interface ProjectWithVariance extends Project {
  estimateTotal?: number;
  quoteTotal?: number;
  actualExpenses?: number;
  variance?: number;
  variancePercentage?: number;
  varianceType?: 'estimate' | 'quote';
}

interface ProjectsListProps {
  projects: ProjectWithVariance[];
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export const ProjectsList = ({ projects, onEdit, onDelete, onCreateNew, onRefresh }: ProjectsListProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ProjectType | "all">("all");
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status' | 'margin'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'estimating':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'quoted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'complete':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMarginColor = (marginPercentage: number | null | undefined) => {
    if (marginPercentage === null || marginPercentage === undefined) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (marginPercentage >= 20) return 'bg-green-100 text-green-800 border-green-200';
    if (marginPercentage >= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (marginPercentage >= 0) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isProjectAtRisk = (marginPercentage: number | null | undefined): boolean => {
    if (marginPercentage === null || marginPercentage === undefined) return false;
    return marginPercentage < 10;
  };

  const getCardBorderClass = (marginPercentage: number | null | undefined): string => {
    return isProjectAtRisk(marginPercentage) ? 'border-red-500 border-2' : '';
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete project",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      onDelete(projectId);
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesType = typeFilter === "all" || project.project_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    // First priority: at-risk projects go to top
    const aIsAtRisk = isProjectAtRisk(a.margin_percentage);
    const bIsAtRisk = isProjectAtRisk(b.margin_percentage);
    
    if (aIsAtRisk && !bIsAtRisk) return -1;
    if (!aIsAtRisk && bIsAtRisk) return 1;
    
    // Secondary sorting by selected criteria
    const modifier = sortOrder === 'asc' ? 1 : -1;
    
    switch (sortBy) {
      case 'name':
        return a.project_name.localeCompare(b.project_name) * modifier;
      case 'date':
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * modifier;
      case 'status':
        return a.status.localeCompare(b.status) * modifier;
      case 'margin':
        const aMargin = a.margin_percentage ?? -999;
        const bMargin = b.margin_percentage ?? -999;
        return (aMargin - bMargin) * modifier;
      default:
        return 0;
    }
  });

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
            <p className="mb-4">Create your first project to get started.</p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Projects ({filteredProjects.length})
            </CardTitle>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Projects</Label>
              <Input
                id="search"
                placeholder="Search by name, client, or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={(value: ProjectStatus | "all") => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="estimating">Estimating</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type Filter</Label>
              <Select value={typeFilter} onValueChange={(value: ProjectType | "all") => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="construction_project">Construction Project</SelectItem>
                  <SelectItem value="work_order">Work Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort By</Label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: 'name' | 'date' | 'status' | 'margin') => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="date">Date Created</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="margin">Margin %</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setTypeFilter("all");
                setSortBy("date");
                setSortOrder("desc");
              }}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedProjects.map((project) => (
          <Card key={project.id} className={`hover:shadow-md transition-shadow ${getCardBorderClass(project.margin_percentage)}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{project.project_name}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {project.project_number} • {project.client_name}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(project)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{project.project_name}"? 
                          This will also delete all associated estimates, expenses, and quotes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteProject(project.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Status-Based Action Buttons */}
              {project.status === 'estimating' && (
                <div className="mb-4">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => window.location.href = `/estimates?project=${project.id}`}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Create First Estimate
                  </Button>
                </div>
              )}
              {['quoted', 'approved', 'in_progress'].includes(project.status) && (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.location.href = `/estimates?project=${project.id}`}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      View Estimates
                    </Button>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => window.location.href = `/estimates?project=${project.id}&action=new-version`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Version
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {isProjectAtRisk(project.margin_percentage) && (
                    <Badge className="bg-red-600 text-white border-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      AT RISK
                    </Badge>
                  )}
                  <Badge className={getStatusColor(project.status)}>
                    {project.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {project.project_type.replace('_', ' ')}
                  </Badge>
                  {project.margin_percentage !== null && project.margin_percentage !== undefined && (
                    <Badge className={getMarginColor(project.margin_percentage)}>
                      {project.margin_percentage.toFixed(1)}% margin
                    </Badge>
                  )}
                </div>
                {project.variance && project.variancePercentage && (
                  <VarianceBadge 
                    variance={project.variance}
                    percentage={project.variancePercentage}
                    type={project.varianceType}
                  />
                )}
              </div>

              {/* Margin Information */}
              {(project.contracted_amount || project.current_margin !== null || project.margin_percentage !== null) && (
                <div className="border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Financial Summary</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {project.margin_percentage !== null && project.margin_percentage !== undefined && (
                        <div className="flex items-center space-x-1">
                          {project.margin_percentage >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <Badge className={getMarginColor(project.margin_percentage)}>
                            {project.margin_percentage.toFixed(1)}% margin
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <Badge 
                          style={{ 
                            backgroundColor: getThresholdStatusColor(
                              getMarginThresholdStatus(
                                project.margin_percentage,
                                project.minimum_margin_threshold || 10.0,
                                project.target_margin || 20.0
                              )
                            ),
                            color: 'white'
                          }}
                        >
                          {getThresholdStatusLabel(
                            getMarginThresholdStatus(
                              project.margin_percentage,
                              project.minimum_margin_threshold || 10.0,
                              project.target_margin || 20.0
                            )
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Contract Amount</p>
                      <p className="font-medium">{formatCurrency(project.contracted_amount)}</p>
                    </div>
                    {project.current_margin !== null && project.current_margin !== undefined && (
                      <div>
                        <p className="text-muted-foreground">Current Profit</p>
                        <p className={`font-medium ${project.current_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {project.current_margin >= 0 ? '+' : ''}{formatCurrency(project.current_margin)}
                        </p>
                      </div>
                    )}
                  </div>
                  {project.contingency_remaining !== null && project.contingency_remaining !== undefined && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Contingency Remaining</span>
                        <span className="font-medium">{formatContingencyRemaining(project.contingency_remaining)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {project.project_type === 'construction_project' ? 'Construction' : 'Work Order'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Job Type</p>
                  <p className="font-medium">{project.job_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {project.start_date ? format(project.start_date, "MMM dd, yyyy") : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(project.created_at, "MMM dd, yyyy")}
                  </p>
                </div>
              </div>

              {project.address && (
                <div>
                  <p className="text-muted-foreground text-sm">Address</p>
                  <p className="text-sm">{project.address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedProjects.length === 0 && projects.length > 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Filter className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Projects Match Your Filters</h3>
              <p>Try adjusting your search criteria or clear the filters.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};