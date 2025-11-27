import { useState } from 'react';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface DashboardHeaderProps {
  activeProjectCount: number;
  lastUpdated: Date;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DashboardHeader({
  activeProjectCount,
  lastUpdated,
  onRefresh,
  isRefreshing
}: DashboardHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of projects and activities</p>
        </div>
      </div>
      <div className="flex items-center justify-between py-2 border-b">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{activeProjectCount} Active Projects</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </span>
        </div>
      
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
