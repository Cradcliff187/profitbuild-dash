import React from 'react';
import { cn } from '@/lib/utils';

interface HierarchicalNumberProps {
  projectNumber?: string;
  entityNumber: string;
  entityType?: 'estimate' | 'quote' | 'change_order' | 'work_order';
  className?: string;
  showProjectName?: boolean;
  projectName?: string;
}

/**
 * Component for consistently displaying hierarchical numbers across the application
 * Shows the relationship between projects and their child entities
 */
export const HierarchicalNumber: React.FC<HierarchicalNumberProps> = ({
  projectNumber,
  entityNumber,
  entityType,
  className,
  showProjectName = false,
  projectName
}) => {
  const formatDisplayNumber = () => {
    if (!projectNumber) {
      return entityNumber;
    }

    switch (entityType) {
      case 'change_order':
        return `${projectNumber} / ${entityNumber}`;
      case 'estimate':
      case 'quote':
      case 'work_order':
        // These already contain the project number in their format
        return entityNumber;
      default:
        return entityNumber;
    }
  };

  const getEntityTypeColor = () => {
    switch (entityType) {
      case 'estimate':
        return 'text-blue-600 dark:text-blue-400';
      case 'quote':
        return 'text-green-600 dark:text-green-400';
      case 'change_order':
        return 'text-orange-600 dark:text-orange-400';
      case 'work_order':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <span className={cn('font-medium', getEntityTypeColor())}>
        {formatDisplayNumber()}
      </span>
      {showProjectName && projectName && (
        <span className="text-xs text-muted-foreground">
          {projectName}
        </span>
      )}
    </div>
  );
};

export default HierarchicalNumber;