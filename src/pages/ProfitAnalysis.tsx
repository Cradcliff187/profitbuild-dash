import { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { MobileResponsiveTabs, type TabDefinition } from '@/components/ui/mobile-responsive-tabs';
import { TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { useProfitAnalysisData } from '@/components/profit-analysis/hooks/useProfitAnalysisData';
import { ProfitSummaryCards } from '@/components/profit-analysis/ProfitSummaryCards';
import { BudgetHealthTable } from '@/components/profit-analysis/BudgetHealthTable';
import { MarginAnalysisTable } from '@/components/profit-analysis/MarginAnalysisTable';
import { CostAnalysisTable } from '@/components/profit-analysis/CostAnalysisTable';
import { ProjectCostBreakdown } from '@/components/profit-analysis/ProjectCostBreakdown';

export default function ProfitAnalysis() {
  const [statusFilter, setStatusFilter] = useState<string[]>(['approved', 'in_progress', 'complete']);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data, isLoading, error } = useProfitAnalysisData(statusFilter);

  const selectedProject = data?.find(p => p.id === selectedProjectId) || null;

  const tabs: TabDefinition[] = [
    {
      value: 'budget',
      label: 'Budget Health',
      content: (
        <BudgetHealthTable
          data={data}
          isLoading={isLoading}
          onSelectProject={setSelectedProjectId}
        />
      ),
    },
    {
      value: 'margins',
      label: 'Margin Analysis',
      content: (
        <MarginAnalysisTable
          data={data}
          isLoading={isLoading}
          onSelectProject={setSelectedProjectId}
        />
      ),
    },
    {
      value: 'costs',
      label: 'Cost Analysis',
      content: (
        <CostAnalysisTable
          data={data}
          isLoading={isLoading}
          onSelectProject={setSelectedProjectId}
        />
      ),
    },
  ];

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
    <MobilePageWrapper>
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
        <SelectTrigger className="w-full md:w-[200px]">
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
      <div className="mt-4">
        <ProfitSummaryCards data={data} isLoading={isLoading} />
      </div>
      
      {/* Tabbed Tables */}
      <div className="mt-4">
        <MobileResponsiveTabs
          tabs={tabs}
          defaultTab="budget"
          maxMobileTabs={3}
        />
      </div>
      
      {/* Project Detail Sheet */}
      <ProjectCostBreakdown 
        project={selectedProject}
        open={!!selectedProjectId}
        onClose={() => setSelectedProjectId(null)} 
      />
    </MobilePageWrapper>
  );
}
