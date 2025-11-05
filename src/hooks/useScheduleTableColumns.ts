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
    { key: 'end', label: 'End Date', required: false, mobileDefault: true },
    { key: 'duration', label: 'Duration', required: false, mobileDefault: true },
    { key: 'progress', label: 'Progress', required: false, mobileDefault: false },
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
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // Mobile: name, start, end, duration
      return ['name', 'start', 'end', 'duration'];
    }
    // Desktop: name, category, start, end, duration, progress, dependencies
    return ['name', 'category', 'start', 'end', 'duration', 'progress', 'dependencies'];
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
