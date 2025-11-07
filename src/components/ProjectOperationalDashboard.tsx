import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  AlertCircle, 
  Clock, 
  FileText, 
  FileEdit,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Camera,
  Video,
  Receipt,
  FileIcon,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { getMarginThresholdStatus, getThresholdStatusColor } from '@/utils/thresholdUtils';
import { calculateBudgetStatus, calculateScheduleStatus, getExpiringQuotes } from '@/utils/projectDashboard';
import type { Project } from '@/types/project';
import type { Estimate } from '@/types/estimate';
import type { Quote } from '@/types/quote';
import type { Expense } from '@/types/expense';
import type { ChangeOrder } from '@/types/changeOrder';

interface ProjectOperationalDashboardProps {
  project: Project;
  estimates: Estimate[];
  quotes: Quote[];
  expenses: Expense[];
  changeOrders: ChangeOrder[];
  pendingTimeEntries: number;
  pendingReceipts: number;
  mediaCounts: { photos: number; videos: number };
  documentCount: number;
}

export function ProjectOperationalDashboard({
  project,
  estimates,
  quotes,
  expenses,
  changeOrders,
  pendingTimeEntries,
  pendingReceipts,
  mediaCounts,
  documentCount
}: ProjectOperationalDashboardProps) {
  const navigate = useNavigate();

  // Calculate operational metrics
  const needsAttention = useMemo(() => {
    const items = [];
    
    if (pendingTimeEntries > 0) {
      items.push({
        type: 'time_entries',
        label: 'Pending Time Entries',
        count: pendingTimeEntries,
        color: 'orange',
        icon: Clock,
        onClick: () => navigate('/time-entries?filter=pending')
      });
    }
    
    if (pendingReceipts > 0) {
      items.push({
        type: 'receipts',
        label: 'Pending Receipts',
        count: pendingReceipts,
        color: 'blue',
        icon: FileText,
        onClick: () => navigate('/time-tracker?tab=receipts&filter=pending')
      });
    }
    
    const pendingCOs = changeOrders.filter(co => co.status === 'pending');
    if (pendingCOs.length > 0) {
      items.push({
        type: 'change_orders',
        label: 'Pending Change Orders',
        count: pendingCOs.length,
        color: 'purple',
        icon: FileEdit,
        onClick: () => navigate(`/projects/${project.id}#change-orders`)
      });
    }
    
    const expiringQuotes = getExpiringQuotes(quotes, 7);
    if (expiringQuotes.length > 0) {
      items.push({
        type: 'expiring_quotes',
        label: 'Expiring Quotes (7 days)',
        count: expiringQuotes.length,
        color: 'red',
        icon: AlertTriangle,
        onClick: () => navigate(`/projects/${project.id}#quotes`)
      });
    }
    
    return items;
  }, [pendingTimeEntries, pendingReceipts, changeOrders, quotes, project.id, navigate]);

  const budgetStatus = useMemo(() => 
    calculateBudgetStatus(project.contracted_amount, expenses),
    [project.contracted_amount, expenses]
  );

  const scheduleStatus = useMemo(() => 
    calculateScheduleStatus(project.start_date, project.end_date),
    [project.start_date, project.end_date]
  );

  const changeOrderSummary = useMemo(() => {
    const pending = changeOrders.filter(co => co.status === 'pending').length;
    const approved = changeOrders.filter(co => co.status === 'approved');
    const rejected = changeOrders.filter(co => co.status === 'rejected').length;
    
    const totalRevenue = approved.reduce((sum, co) => sum + (co.client_amount || 0), 0);
    const totalCosts = approved.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const netImpact = totalRevenue - totalCosts;
    
    return {
      pending,
      approvedCount: approved.length,
      rejected,
      totalRevenue,
      totalCosts,
      netImpact
    };
  }, [changeOrders]);

  const marginStatus = getMarginThresholdStatus(
    project.margin_percentage,
    project.minimum_margin_threshold,
    project.target_margin
  );

  const originalMarginPercent = project.original_margin && project.contracted_amount
    ? (project.original_margin / project.contracted_amount) * 100
    : null;

  const marginDelta = project.margin_percentage && originalMarginPercent
    ? project.margin_percentage - originalMarginPercent
    : null;

  return (
    <div className="space-y-3">
      {/* Needs Attention Section */}
      {needsAttention.length > 0 && (
        <Card className="border-l-4 border-l-destructive bg-destructive/5">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold">Needs Attention</h3>
              <Badge variant="destructive" className="h-5 text-xs">{needsAttention.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-1">
            {needsAttention.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors text-left h-8"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <Badge variant="outline" className="h-5 text-xs">{item.count}</Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <h3 className="text-sm font-semibold">Financial Summary</h3>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Contract Value</div>
              <div className="text-xl font-bold">{formatCurrency(project.contracted_amount)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Original Margin</div>
              <div className="text-xl font-bold text-foreground">
                {formatCurrency(project.original_margin)}
              </div>
              {originalMarginPercent && (
                <div className="text-xs text-muted-foreground">
                  {originalMarginPercent.toFixed(1)}%
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Projected Margin</div>
              <div 
                className="text-xl font-bold flex items-center gap-1"
                style={{ color: getThresholdStatusColor(marginStatus) }}
              >
                {formatCurrency(project.projected_margin)}
                {marginDelta !== null && (
                  marginDelta >= 0 
                    ? <TrendingUp className="h-4 w-4 text-green-600" />
                    : <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </div>
              {project.margin_percentage && (
                <div className="text-xs flex items-center gap-1">
                  <span>{project.margin_percentage.toFixed(1)}%</span>
                  {marginDelta !== null && (
                    <span className={marginDelta >= 0 ? 'text-green-600' : 'text-destructive'}>
                      ({marginDelta >= 0 ? '+' : ''}{marginDelta.toFixed(1)}%)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Status & Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Budget Status */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Budget Status</h3>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Contract:</span>
                <span className="font-medium">{formatCurrency(project.contracted_amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Spent:</span>
                <span className="font-medium">{formatCurrency(budgetStatus.totalSpent)}</span>
              </div>
              <Progress 
                value={budgetStatus.percentSpent} 
                className={`h-2 ${
                  budgetStatus.status === 'critical' ? '[&>div]:bg-destructive' :
                  budgetStatus.status === 'warning' ? '[&>div]:bg-warning' :
                  '[&>div]:bg-success'
                }`}
              />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{budgetStatus.percentSpent.toFixed(1)}% spent</span>
                <span className="font-medium">{formatCurrency(budgetStatus.remaining)} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Schedule</h3>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {scheduleStatus ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-medium">
                    {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">End:</span>
                  <span className="font-medium">
                    {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'Not set'}
                  </span>
                </div>
                <Progress 
                  value={scheduleStatus.percentComplete} 
                  className={`h-2 ${scheduleStatus.isOverdue ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
                />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {scheduleStatus.elapsedDays} of {scheduleStatus.totalDays} days
                  </span>
                  <span className={`font-medium ${scheduleStatus.isOverdue ? 'text-destructive' : ''}`}>
                    {scheduleStatus.isOverdue 
                      ? `Overdue by ${Math.abs(scheduleStatus.remainingDays)} days`
                      : `${scheduleStatus.remainingDays} days remaining`
                    }
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No schedule dates set</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Orders & Documentation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Change Orders */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Change Orders</h3>
              <Badge variant="outline" className="h-5 text-xs">{changeOrders.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="flex gap-2">
              {changeOrderSummary.pending > 0 && (
                <Badge variant="outline" className="text-xs text-orange-600">
                  {changeOrderSummary.pending} Pending
                </Badge>
              )}
              {changeOrderSummary.approvedCount > 0 && (
                <Badge variant="outline" className="text-xs text-green-600">
                  {changeOrderSummary.approvedCount} Approved
                </Badge>
              )}
              {changeOrderSummary.rejected > 0 && (
                <Badge variant="outline" className="text-xs text-destructive">
                  {changeOrderSummary.rejected} Rejected
                </Badge>
              )}
            </div>
            {changeOrderSummary.approvedCount > 0 && (
              <div className="space-y-1 pt-1 border-t">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Approved Revenue:</span>
                  <span className="font-medium">{formatCurrency(changeOrderSummary.totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Approved Costs:</span>
                  <span className="font-medium">{formatCurrency(changeOrderSummary.totalCosts)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Net Impact:</span>
                  <span className={`font-semibold ${
                    changeOrderSummary.netImpact >= 0 ? 'text-green-600' : 'text-destructive'
                  }`}>
                    {formatCurrency(changeOrderSummary.netImpact)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentation */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <h3 className="text-sm font-semibold">Documentation</h3>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => navigate(`/projects/${project.id}/documents?tab=photos`)}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
              >
                <Camera className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">{mediaCounts.photos}</div>
                  <div className="text-xs text-muted-foreground">Photos</div>
                </div>
              </button>
              <button 
                onClick={() => navigate(`/projects/${project.id}/documents?tab=videos`)}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
              >
                <Video className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">{mediaCounts.videos}</div>
                  <div className="text-xs text-muted-foreground">Videos</div>
                </div>
              </button>
              <button 
                onClick={() => navigate('/time-tracker?tab=receipts')}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
              >
                <Receipt className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-sm font-medium">{pendingReceipts}</div>
                  <div className="text-xs text-muted-foreground">Receipts</div>
                </div>
              </button>
              <button 
                onClick={() => navigate(`/projects/${project.id}/documents`)}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
              >
                <FileIcon className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-sm font-medium">{documentCount}</div>
                  <div className="text-xs text-muted-foreground">Documents</div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
