import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyTraining } from '@/hooks/useTrainingAssignments';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileTabSelector } from '@/components/ui/mobile-tab-selector';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  GraduationCap, 
  Video, 
  FileText, 
  Link as LinkIcon, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { format } from 'date-fns';
import { MyTrainingItem, TrainingContentType } from '@/types/training';

type FilterTab = 'all' | 'pending' | 'completed' | 'overdue';

export default function Training() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { items, stats, isLoading } = useMyTraining();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const tabOptions = [
    { value: 'all', label: 'All', icon: GraduationCap },
    { value: 'pending', label: 'Pending', icon: Clock },
    { value: 'completed', label: 'Completed', icon: CheckCircle2 },
    { value: 'overdue', label: 'Overdue', icon: AlertCircle },
  ];

  // Filter items based on active tab
  const filteredItems = items.filter(item => {
    if (activeTab === 'all') return true;
    return item.status === activeTab;
  });

  // Get content type icon
  const getContentTypeIcon = (type: TrainingContentType) => {
    switch (type) {
      case 'video_link':
      case 'video_embed':
        return Video;
      case 'document':
      case 'presentation':
        return FileText;
      case 'external_link':
        return LinkIcon;
      default:
        return FileText;
    }
  };

  // Get status badge
  const getStatusBadge = (item: MyTrainingItem) => {
    const { status, daysRemaining } = item;
    
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
            {daysRemaining !== null && daysRemaining > 0 && (
              <span className="ml-1">({daysRemaining} days)</span>
            )}
          </Badge>
        );
      case 'overdue':
        const daysOverdue = daysRemaining !== null ? Math.abs(daysRemaining) : 0;
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
            {daysOverdue > 0 && (
              <span className="ml-1">({daysOverdue} days)</span>
            )}
          </Badge>
        );
      case 'assigned':
        return (
          <Badge variant="secondary">
            Assigned
          </Badge>
        );
      default:
        return null;
    }
  };

  // Format due date
  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    try {
      return format(new Date(dueDate), 'MMM dd, yyyy');
    } catch {
      return null;
    }
  };

  // Handle card click
  const handleCardClick = (contentId: string) => {
    navigate(`/training/${contentId}`);
  };

  if (isLoading) {
    return (
      <div className="w-full overflow-x-hidden px-2 sm:px-3 py-2 sm:py-4 max-w-7xl mx-auto">
        <div className="mb-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={GraduationCap}
        title="My Training"
        description="View and complete training modules"
      />
      
      {/* Completion Progress Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Training Progress</span>
          <span className={cn(
            "text-lg font-bold",
            stats.completionRate === 100 ? "text-green-600" : 
            stats.overdue > 0 ? "text-red-600" : "text-primary"
          )}>
            {stats.completionRate}% Complete
          </span>
        </div>
        <Progress 
          value={stats.completionRate} 
          className={cn(
            "h-3",
            stats.completionRate === 100 ? "[&>div]:bg-green-600" :
            stats.overdue > 0 ? "[&>div]:bg-red-500" :
            "[&>div]:bg-primary"
          )}
        />
        {stats.completionRate === 100 && (
          <div className="flex items-center gap-1 mt-2 text-green-600 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            All training complete!
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Overdue</div>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)} className="mb-4">
        {/* Mobile Dropdown */}
        <div className="sm:hidden mb-4">
          <MobileTabSelector
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as FilterTab)}
            options={tabOptions as any}
          />
        </div>

        {/* Desktop Tabs */}
        <div className="hidden sm:block mb-4">
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <TabsList className="inline-flex w-auto flex-nowrap justify-start gap-2 rounded-full bg-muted/50 p-1 min-w-full">
              <TabsTrigger
                value="all"
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm shrink-0"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm shrink-0"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm shrink-0"
              >
                Completed
              </TabsTrigger>
              <TabsTrigger
                value="overdue"
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm shrink-0"
              >
                Overdue
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Training Cards */}
        <TabsContent value={activeTab} className="mt-0 sm:mt-4">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {activeTab === 'all' 
                    ? 'No training assigned' 
                    : `No ${activeTab} training`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeTab === 'completed' 
                    ? "You're all caught up!" 
                    : 'Check back later for new assignments'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const TypeIcon = getContentTypeIcon(item.content.content_type);
                const dueDateFormatted = formatDueDate(item.assignment.due_date);
                
                return (
                  <Card
                    key={item.assignment.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors min-h-[48px]"
                    onClick={() => handleCardClick(item.content.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-0.5">
                            <TypeIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium mb-1.5 truncate">
                              {item.content.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {dueDateFormatted ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Due: {dueDateFormatted}</span>
                                </div>
                              ) : (
                                <span>No due date</span>
                              )}
                              {item.content.duration_minutes && (
                                <>
                                  <span>•</span>
                                  <span>{item.content.duration_minutes} min</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {getStatusBadge(item)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MobilePageWrapper>
  );
}

