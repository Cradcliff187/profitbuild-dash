// src/components/sms/ScheduledSMSLogs.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ScheduledSMSLog {
  id: string;
  scheduled_sms_id: string;
  executed_at: string;
  recipients_count: number;
  success_count: number;
  failure_count: number;
  error_details: any;
  scheduled_sms_messages?: {
    name: string;
  };
}

interface ScheduledSMS {
  id: string;
  name: string;
}

interface ScheduledSMSLogsProps {
  scheduleIdFilter?: string; // Optional: filter logs by specific schedule ID
}

export function ScheduledSMSLogs({ scheduleIdFilter }: ScheduledSMSLogsProps = {}) {
  const [logs, setLogs] = useState<ScheduledSMSLog[]>([]);
  const [schedules, setSchedules] = useState<ScheduledSMS[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(scheduleIdFilter || 'all');
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDetails, setViewingDetails] = useState<ScheduledSMSLog | null>(null);

  useEffect(() => {
    if (!scheduleIdFilter) {
      fetchSchedules();
    }
    fetchLogs();
  }, [selectedScheduleId, scheduleIdFilter]);

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('scheduled_sms_messages')
      .select('id, name')
      .order('name');

    if (!error && data) {
      setSchedules(data);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    let query = supabase
      .from('scheduled_sms_logs')
      .select(`
        *,
        scheduled_sms_messages (
          name
        )
      `)
      .order('executed_at', { ascending: false })
      .limit(100);

    const scheduleIdToUse = scheduleIdFilter || selectedScheduleId;
    if (scheduleIdToUse !== 'all') {
      query = query.eq('scheduled_sms_id', scheduleIdToUse);
    }

    const { data, error } = await query;

    if (!error && data) {
      setLogs(data);
    } else if (error) {
      toast.error('Failed to load logs');
      console.error(error);
    }
    setIsLoading(false);
  };

  const formatErrorDetails = (errorDetails: any): string => {
    if (!errorDetails) return 'No errors';
    
    if (Array.isArray(errorDetails)) {
      return errorDetails.map((err: any) => {
        if (typeof err === 'object' && err.error) {
          return err.error;
        }
        return JSON.stringify(err);
      }).join('\n');
    }
    
    if (typeof errorDetails === 'object') {
      return JSON.stringify(errorDetails, null, 2);
    }
    
    return String(errorDetails);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading execution logs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Scheduled SMS Execution Logs</h2>
          <p className="text-muted-foreground">View execution history and error details</p>
        </div>
        {!scheduleIdFilter && (
          <div className="flex gap-2">
            <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schedules</SelectItem>
                {schedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
        {scheduleIdFilter && (
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No execution logs found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Schedule</TableHead>
                <TableHead>Executed At</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Success</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.scheduled_sms_messages?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(log.executed_at), 'PPp')}
                  </TableCell>
                  <TableCell>{log.recipients_count}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {log.success_count}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.failure_count > 0 ? (
                      <Badge variant="destructive">
                        {log.failure_count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.failure_count > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingDetails(log)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Errors
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!viewingDetails} onOpenChange={(open) => !open && setViewingDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              Execution log from {viewingDetails && format(new Date(viewingDetails.executed_at), 'PPp')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Summary</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Recipients</p>
                  <p className="text-lg font-semibold">{viewingDetails?.recipients_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Successful</p>
                  <p className="text-lg font-semibold text-green-600">{viewingDetails?.success_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-lg font-semibold text-red-600">{viewingDetails?.failure_count || 0}</p>
                </div>
              </div>
            </div>
            {viewingDetails?.error_details && (
              <div>
                <p className="text-sm font-medium mb-2">Error Details</p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64">
                  {formatErrorDetails(viewingDetails.error_details)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

