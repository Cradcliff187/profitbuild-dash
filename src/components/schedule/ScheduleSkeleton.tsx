/**
 * Loading skeleton for schedule view
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ScheduleSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      {/* Info Banner Skeleton */}
      <Card className="p-4">
        <Skeleton className="h-4 w-3/4" />
      </Card>
      
      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
      
      {/* Controls Skeleton */}
      <Card className="p-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-16" />
            ))}
          </div>
        </div>
      </Card>
      
      {/* Gantt Chart Skeleton */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex gap-2 border-b pb-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-8 flex-1" />
            ))}
          </div>
          
          {/* Task Rows */}
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex gap-2 items-center">
              <Skeleton className="h-10 w-32" />
              <div className="flex-1 flex gap-4">
                <Skeleton 
                  className="h-10 rounded" 
                  style={{ 
                    width: `${20 + Math.random() * 60}%`,
                    marginLeft: `${Math.random() * 20}%`
                  }} 
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

