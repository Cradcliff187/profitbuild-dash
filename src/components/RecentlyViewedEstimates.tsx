import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye, Calculator } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface RecentEstimate {
  id: string;
  estimate_number: string;
  project_name: string;
  client_name: string;
  total_amount: number;
  status: string;
  version_number: number;
  date_created: Date;
  last_viewed: Date;
}

interface RecentlyViewedEstimatesProps {
  onViewEstimate?: (estimateId: string) => void;
}

export const RecentlyViewedEstimates = ({ onViewEstimate }: RecentlyViewedEstimatesProps) => {
  const [recentEstimates, setRecentEstimates] = useState<RecentEstimate[]>([]);

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  const loadRecentlyViewed = () => {
    // Get recently viewed estimates from localStorage
    const recentViewsStr = localStorage.getItem('recently_viewed_estimates');
    if (!recentViewsStr) {
      setRecentEstimates([]);
      return;
    }

    try {
      const recentViews = JSON.parse(recentViewsStr);
      const formattedEstimates = recentViews
        .sort((a: any, b: any) => new Date(b.last_viewed).getTime() - new Date(a.last_viewed).getTime())
        .slice(0, 5) // Show only 5 most recent
        .map((item: any) => ({
          ...item,
          date_created: new Date(item.date_created),
          last_viewed: new Date(item.last_viewed)
        }));
      
      setRecentEstimates(formattedEstimates);
    } catch (error) {
      console.error('Error loading recently viewed estimates:', error);
      setRecentEstimates([]);
    }
  };

  const addToRecentlyViewed = (estimate: Omit<RecentEstimate, 'last_viewed'>) => {
    const recentViewsStr = localStorage.getItem('recently_viewed_estimates');
    let recentViews = [];
    
    if (recentViewsStr) {
      try {
        recentViews = JSON.parse(recentViewsStr);
      } catch (error) {
        console.error('Error parsing recently viewed estimates:', error);
        recentViews = [];
      }
    }

    // Remove existing entry for this estimate
    recentViews = recentViews.filter((item: any) => item.id !== estimate.id);
    
    // Add current estimate at the beginning
    recentViews.unshift({
      ...estimate,
      last_viewed: new Date().toISOString()
    });

    // Keep only last 10 items
    recentViews = recentViews.slice(0, 10);

    localStorage.setItem('recently_viewed_estimates', JSON.stringify(recentViews));
    loadRecentlyViewed();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Expose the addToRecentlyViewed function globally for other components to use
  useEffect(() => {
    (window as any).addToRecentlyViewed = addToRecentlyViewed;
    return () => {
      delete (window as any).addToRecentlyViewed;
    };
  }, []);

  if (recentEstimates.length === 0) {
    return null; // Don't show the component if there are no recent estimates
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recently Viewed Estimates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentEstimates.map((estimate) => (
          <div
            key={estimate.id}
            className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">
                  {estimate.project_name}
                </h4>
                <Badge variant="outline" className="text-xs">
                  v{estimate.version_number}
                </Badge>
                <Badge className={`text-xs ${getStatusColor(estimate.status)}`}>
                  {estimate.status}
                </Badge>
              </div>
               <div className="text-xs text-muted-foreground">
                 <p className="truncate">{estimate.client_name}</p>
                 <p>{formatCurrency(estimate.total_amount, { showCents: false })}</p>
               </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <div className="text-right text-xs text-muted-foreground">
                <p>Viewed {format(estimate.last_viewed, 'MMM dd')}</p>
                <p>{format(estimate.last_viewed, 'h:mm a')}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewEstimate?.(estimate.id)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        
        <Button 
          variant="ghost" 
          className="w-full text-sm"
          onClick={() => window.location.href = '/estimates'}
        >
          <Calculator className="h-4 w-4 mr-2" />
          View All Estimates
        </Button>
      </CardContent>
    </Card>
  );
};
