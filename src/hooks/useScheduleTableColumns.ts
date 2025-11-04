import { useState, useEffect } from 'react';

export interface ScheduleColumnConfig {
  key: string;
  label: string;
  required: boolean;
  mobileDefault?: boolean;
}

export const useScheduleTableColumns = (projectId: string) => {
  const columnDefinitions: ScheduleColumnConfig[] = [
    { key: 'name', label: 'Task Name', required: true, mobileDefault: true },
    { key: 'category', label: 'Category', required: false, mobileDefault: false },
    { key: 'start', label: 'Start Date', required: false, mobileDefault: true },
    { key: 'end', label: 'End Date', required: false, mobileDefault: false },
    { key: 'duration', label: 'Duration', required: false, mobileDefault: true },
    { key: 'progress', label: 'Progress', required: false, mobileDefault: true },
    { key: 'estimated_cost', label: 'Est. Cost', required: false, mobileDefault: false },
    { key: 'actual_cost', label: 'Actual Cost', required: false, mobileDefault: false },
    { key: 'variance', label: 'Variance', required: false, mobileDefault: false },
    { key: 'dependencies', label: 'Dependencies', required: false, mobileDefault: false },
    { key: 'notes', label: 'Notes', required: false, mobileDefault: false },
  ];

  const storageKey = `schedule_table_columns_${projectId}`;

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.filter((key: string) => 
          columnDefinitions.some(col => col.key === key)
        );
      } catch {
        return getDefaultColumns();
      }
    }
    return getDefaultColumns();
  });

  function getDefaultColumns(): string[] {
    // Check if mobile
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      return columnDefinitions
        .filter(col => col.required || col.mobileDefault)
        .map(col => col.key);
    }
    // Desktop: show all except dependencies and notes by default
    return columnDefinitions
      .filter(col => !['dependencies', 'notes'].includes(col.key))
      .map(col => col.key);
  }

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns, storageKey]);

  return {
    columnDefinitions,
    visibleColumns,
    setVisibleColumns,
  };
};
