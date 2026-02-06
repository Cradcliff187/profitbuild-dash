import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckSquare, Square, Search } from 'lucide-react';

export interface TransactionSelectionControlsProps {
  totalNew: number;
  totalDuplicates: number;
  totalErrors: number;
  totalUnassigned: number;
  selectedCount: number;
  totalSelectable: number;
  onSelectAllNew: () => void;
  onSelectAllDuplicates: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  statusFilter: 'all' | 'new' | 'duplicate' | 'unassigned';
  onStatusFilterChange: (filter: 'all' | 'new' | 'duplicate' | 'unassigned') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TransactionSelectionControls = ({
  totalNew,
  totalDuplicates,
  totalErrors,
  totalUnassigned,
  selectedCount,
  totalSelectable,
  onSelectAllNew,
  onSelectAllDuplicates,
  onSelectAll,
  onDeselectAll,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
}: TransactionSelectionControlsProps) => {
  return (
    <div className="space-y-3">
      {/* Live count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          <span className="text-lg font-bold text-blue-600">{selectedCount}</span>
          {' '}of{' '}
          <span className="font-semibold">{totalSelectable}</span>
          {' '}selected for import
        </p>
        {totalErrors > 0 && (
          <Badge variant="destructive" className="text-xs">
            {totalErrors} error{totalErrors !== 1 ? 's' : ''} (not importable)
          </Badge>
        )}
      </div>

      {/* Status filter tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => onStatusFilterChange(v as 'all' | 'new' | 'duplicate' | 'unassigned')}
      >
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="all" className="min-h-[48px] text-xs sm:text-sm gap-1.5">
            All
            <Badge variant="outline" className="text-[10px] ml-1">{totalNew + totalDuplicates + totalUnassigned + totalErrors}</Badge>
          </TabsTrigger>
          <TabsTrigger value="new" className="min-h-[48px] text-xs sm:text-sm gap-1.5">
            New
            <Badge variant="outline" className="text-[10px] ml-1 bg-green-50 text-green-700">{totalNew}</Badge>
          </TabsTrigger>
          <TabsTrigger value="duplicate" className="min-h-[48px] text-xs sm:text-sm gap-1.5">
            Duplicate
            <Badge variant="outline" className="text-[10px] ml-1 bg-amber-50 text-amber-700">{totalDuplicates}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="min-h-[48px] text-xs sm:text-sm gap-1.5">
            Unassigned
            <Badge variant="outline" className="text-[10px] ml-1 bg-orange-50 text-orange-700">{totalUnassigned}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bulk actions + search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[48px] text-xs"
            onClick={onSelectAllNew}
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1" />
            Select New
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[48px] text-xs"
            onClick={onSelectAllDuplicates}
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1" />
            Select Duplicates
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[48px] text-xs"
            onClick={onSelectAll}
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1" />
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[48px] text-xs"
            onClick={onDeselectAll}
          >
            <Square className="h-3.5 w-3.5 mr-1" />
            None
          </Button>
        </div>

        <div className="relative sm:ml-auto sm:w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 min-h-[48px] text-sm"
          />
        </div>
      </div>
    </div>
  );
};
