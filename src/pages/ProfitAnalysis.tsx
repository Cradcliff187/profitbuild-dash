import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileResponsiveTabs, type TabDefinition } from '@/components/ui/mobile-responsive-tabs';
import { TrendingUp, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { useProfitAnalysisData } from '@/components/profit-analysis/hooks/useProfitAnalysisData';
import { ProfitSummaryCards } from '@/components/profit-analysis/ProfitSummaryCards';
import { BudgetHealthTable } from '@/components/profit-analysis/BudgetHealthTable';
import { MarginAnalysisTable } from '@/components/profit-analysis/MarginAnalysisTable';
import { CostAnalysisTable } from '@/components/profit-analysis/CostAnalysisTable';
import { ProjectCostBreakdown } from '@/components/profit-analysis/ProjectCostBreakdown';
import type { ProjectStatus } from '@/types/project';

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'estimating', label: 'Estimating' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full md:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Status ({statusFilter.length} selected)
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={statusFilter.includes(value)}
              onCheckedChange={(checked) =>
                setStatusFilter((prev) =>
                  checked ? [...prev, value] : prev.filter((s) => s !== value)
                )
              }
              onSelect={(e) => e.preventDefault()}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
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
