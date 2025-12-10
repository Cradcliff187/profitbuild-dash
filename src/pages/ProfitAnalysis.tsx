import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useProfitAnalysisData } from '@/components/profit-analysis/hooks/useProfitAnalysisData';
import { ProfitSummaryCards } from '@/components/profit-analysis/ProfitSummaryCards';
import { BillingProgressTable } from '@/components/profit-analysis/BillingProgressTable';
import { MarginAnalysisTable } from '@/components/profit-analysis/MarginAnalysisTable';
import { CostAnalysisTable } from '@/components/profit-analysis/CostAnalysisTable';
import { ProjectCostBreakdown } from '@/components/profit-analysis/ProjectCostBreakdown';

export default function ProfitAnalysis() {
  const [statusFilter, setStatusFilter] = useState<string[]>(['approved', 'in_progress', 'complete']);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('billing');

  const { data, isLoading, error } = useProfitAnalysisData(statusFilter);

  const selectedProject = data?.find(p => p.id === selectedProjectId) || null;

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-destructive">Error loading profit analysis data: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Profit Analysis"
        description="Analyze project profitability and margins"
      />
      
      {/* Status Filter */}
      <Select 
        value={statusFilter.join(',')} 
        onValueChange={(val) => setStatusFilter(val.split(','))}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="approved,in_progress,complete">All Active</SelectItem>
          <SelectItem value="in_progress">In Progress Only</SelectItem>
          <SelectItem value="complete">Completed Only</SelectItem>
          <SelectItem value="approved">Approved Only</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Summary Cards */}
      <ProfitSummaryCards data={data} isLoading={isLoading} />
      
      {/* Tabbed Tables */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="inline-flex w-auto flex-nowrap justify-start gap-2 rounded-full bg-muted/40 p-1">
          <TabsTrigger 
            value="billing"
            className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Billing Progress
          </TabsTrigger>
          <TabsTrigger 
            value="margins"
            className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Margin Analysis
          </TabsTrigger>
          <TabsTrigger 
            value="costs"
            className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Cost Analysis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="billing" className="mt-4">
          <BillingProgressTable 
            data={data} 
            isLoading={isLoading}
            onSelectProject={setSelectedProjectId} 
          />
        </TabsContent>
        
        <TabsContent value="margins" className="mt-4">
          <MarginAnalysisTable 
            data={data} 
            isLoading={isLoading}
            onSelectProject={setSelectedProjectId} 
          />
        </TabsContent>
        
        <TabsContent value="costs" className="mt-4">
          <CostAnalysisTable 
            data={data} 
            isLoading={isLoading}
            onSelectProject={setSelectedProjectId} 
          />
        </TabsContent>
      </Tabs>
      
      {/* Project Detail Sheet */}
      <ProjectCostBreakdown 
        project={selectedProject}
        open={!!selectedProjectId}
        onClose={() => setSelectedProjectId(null)} 
      />
    </div>
  );
}
