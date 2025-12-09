// src/components/sms/ScheduledSMSManager.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Plus, Edit, Trash2, Play, Pause, Send, Loader2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { buildCronExpression, type ScheduleConfig } from '@/utils/cronBuilder';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduledSMSLogs } from '@/components/sms/ScheduledSMSLogs';

interface ScheduledSMS {
  id: string;
  name: string;
  message_template: string;
  link_type: string | null;
  link_url: string | null;
  project_id: string | null;
  schedule_type: 'recurring' | 'one_time';
  cron_expression: string | null;
  scheduled_datetime: string | null;
  timezone: string;
  target_type: 'users' | 'roles';
  target_user_ids: string[] | null;
  target_roles: string[] | null;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
}

interface Recipient {
  id: string;
  full_name: string;
  phone: string | null;
}

const LINK_TYPES = [
  { value: 'none', label: 'No Link' },
  { value: 'clock_in', label: 'Clock In Page' },
  { value: 'timesheet', label: 'Timesheet History' },
  { value: 'receipt', label: 'Capture Receipt' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'project', label: 'Specific Project' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
];

const DAYS = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'field_worker', label: 'Field Worker' },
];

const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

export function ScheduledSMSManager() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduledSMS[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; project_number: string; project_name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledSMS | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [viewingLogsFor, setViewingLogsFor] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [linkType, setLinkType] = useState('none');
  const [scheduleType, setScheduleType] = useState<'recurring' | 'one_time'>('recurring');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [time, setTime] = useState('15:45');
  const [timezone, setTimezone] = useState('America/New_York');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [targetType, setTargetType] = useState<'users' | 'roles'>('roles');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchSchedules();
    fetchRecipients();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_number, project_name')
      .eq('category', 'construction')
      .order('project_number', { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
  };

  const fetchSchedules = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('scheduled_sms_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Check if table doesn't exist (migration not applied)
      if (error.message?.includes('does not exist') || error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('scheduled_sms_messages')) {
        // Table doesn't exist - migrations not applied yet
        // Silently set empty array, don't show error toast
        console.warn('scheduled_sms_messages table does not exist - migrations may not be applied yet');
        setSchedules([]);
      } else {
        // Other errors (permissions, etc.)
        toast.error('Failed to load scheduled messages');
        console.error(error);
      }
    } else {
      // Success - set data with proper type casting
      setSchedules((data || []).map(d => ({
        ...d,
        schedule_type: d.schedule_type as 'recurring' | 'one_time',
        target_type: d.target_type as 'users' | 'roles',
        target_user_ids: (d.target_user_ids || null) as string[] | null,
        target_roles: (d.target_roles || null) as string[] | null,
      })));
    }
    setIsLoading(false);
  };

  const fetchRecipients = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('is_active', true)
      .not('phone', 'is', null);

    if (!error && data) {
      setRecipients(data);
    }
  };

  const resetForm = () => {
    setName('');
    setMessageTemplate('');
    setLinkType('none');
    setScheduleType('recurring');
    setSelectedDays(['mon', 'tue', 'wed', 'thu', 'fri']);
    setTime('15:45');
    setTimezone('America/New_York');
    setScheduledDateTime('');
    setTargetType('roles');
    setSelectedUserIds([]);
    setSelectedRoles(['field_worker']);
    setSelectedProjectId('');
    setIsActive(true);
    setEditingSchedule(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (schedule: ScheduledSMS) => {
    setEditingSchedule(schedule);
    setName(schedule.name);
    setMessageTemplate(schedule.message_template);
    setLinkType(schedule.link_type || 'none');
    setScheduleType(schedule.schedule_type);
    setTimezone(schedule.timezone);
    setTargetType(schedule.target_type);
    setSelectedUserIds(schedule.target_user_ids || []);
    setSelectedRoles(schedule.target_roles || []);
    setSelectedProjectId(schedule.project_id || '');
    setIsActive(schedule.is_active);

    if (schedule.schedule_type === 'recurring' && schedule.cron_expression) {
      // Parse cron: "45 15 * * 1-5" -> time: "15:45", days: [mon-fri]
      const parts = schedule.cron_expression.split(' ');
      if (parts.length === 5) {
        const minutes = parts[0].padStart(2, '0');
        const hours = parts[1].padStart(2, '0');
        setTime(`${hours}:${minutes}`);
        
        // Parse day of week (simplified - assumes range or comma-separated)
        const dayPart = parts[4];
        if (dayPart.includes('-')) {
          const [start, end] = dayPart.split('-').map(Number);
          const days: string[] = [];
          for (let i = start; i <= end; i++) {
            const dayName = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === i);
            if (dayName) days.push(dayName);
          }
          setSelectedDays(days);
        } else {
          const dayNumbers = dayPart.split(',').map(Number);
          const days = dayNumbers.map(num => {
            return Object.keys(DAY_MAP).find(k => DAY_MAP[k] === num) || '';
          }).filter(Boolean);
          setSelectedDays(days);
        }
      }
    } else if (schedule.schedule_type === 'one_time' && schedule.scheduled_datetime) {
      const dt = new Date(schedule.scheduled_datetime);
      const dateStr = format(dt, 'yyyy-MM-dd');
      const timeStr = format(dt, 'HH:mm');
      setScheduledDateTime(`${dateStr}T${timeStr}`);
    }

    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !messageTemplate.trim()) {
      toast.error('Name and message template are required');
      return;
    }

    // Validate message length (300 chars max)
    if (messageTemplate.length > 300) {
      toast.error('Message template must be 300 characters or less');
      return;
    }

    if (scheduleType === 'recurring' && selectedDays.length === 0) {
      toast.error('Please select at least one day for recurring schedule');
      return;
    }

    if (scheduleType === 'one_time') {
      if (!scheduledDateTime) {
        toast.error('Please select a date and time for one-time schedule');
        return;
      }
      // Validate one-time schedule is in the future
      const scheduledTime = new Date(scheduledDateTime);
      if (scheduledTime <= new Date()) {
        toast.error('One-time schedule must be in the future');
        return;
      }
    }

    if (targetType === 'users' && selectedUserIds.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (targetType === 'roles' && selectedRoles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    if (linkType === 'project' && !selectedProjectId) {
      toast.error('Please select a project when using project link type');
      return;
    }

    setIsSaving(true);

    try {
      let cronExpression: string | null = null;
      let scheduledDatetime: string | null = null;

      if (scheduleType === 'recurring') {
        try {
          cronExpression = buildCronExpression({
            days: selectedDays,
            time,
            timezone,
          });
          // Basic validation: cron should have 5 parts (minute hour day month weekday)
          const parts = cronExpression.split(' ');
          if (parts.length !== 5) {
            throw new Error('Invalid cron expression format');
          }
          // Validate time format
          const [minutes, hours] = parts;
          const minuteNum = parseInt(minutes);
          const hourNum = parseInt(hours);
          if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) {
            throw new Error('Invalid minute value (0-59)');
          }
          if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
            throw new Error('Invalid hour value (0-23)');
          }
        } catch (error) {
          toast.error(`Invalid cron expression: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsSaving(false);
          return;
        }
      } else {
        // Convert local datetime to UTC for storage
        const dt = new Date(scheduledDateTime);
        scheduledDatetime = dt.toISOString();
      }

      const payload: any = {
        name: name.trim(),
        message_template: messageTemplate.trim(),
        link_type: linkType === 'none' ? null : linkType,
        link_url: null,
        project_id: linkType === 'project' ? selectedProjectId || null : null,
        schedule_type: scheduleType,
        cron_expression: cronExpression,
        scheduled_datetime: scheduledDatetime,
        timezone,
        target_type: targetType,
        target_user_ids: targetType === 'users' ? selectedUserIds : null,
        target_roles: targetType === 'roles' ? selectedRoles : null,
        is_active: isActive,
        created_by: user?.id,
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('scheduled_sms_messages')
          .update(payload)
          .eq('id', editingSchedule.id);

        if (error) throw error;
        toast.success('Scheduled message updated');
      } else {
        const { error } = await supabase
          .from('scheduled_sms_messages')
          .insert(payload);

        if (error) throw error;
        toast.success('Scheduled message created');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save scheduled message');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled message?')) {
      return;
    }

    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from('scheduled_sms_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Scheduled message deleted');
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete scheduled message');
      console.error(error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleActive = async (schedule: ScheduledSMS) => {
    try {
      const { error } = await supabase
        .from('scheduled_sms_messages')
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id);

      if (error) throw error;
      toast.success(`Scheduled message ${!schedule.is_active ? 'activated' : 'deactivated'}`);
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update schedule');
      console.error(error);
    }
  };

  const handleTestSend = async (schedule: ScheduledSMS) => {
    setIsTesting(schedule.id);
    try {
      // Resolve recipients
      const { data: recipients, error: recipientError } = await supabase.rpc(
        'get_scheduled_sms_recipients',
        {
          p_target_type: schedule.target_type,
          p_target_user_ids: schedule.target_user_ids || [],
          p_target_roles: schedule.target_roles || [],
        }
      );

      if (recipientError) throw recipientError;

      if (!recipients || recipients.length === 0) {
        toast.error('No eligible recipients found');
        setIsTesting(null);
        return;
      }

      // Send to first recipient as test
      const testRecipient = recipients[0];
      const personalizedMessage = schedule.message_template.replace(
        /\{\{name\}\}/gi,
        testRecipient.full_name.split(' ')[0]
      );

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          recipientUserId: testRecipient.user_id,
          message: personalizedMessage,
          linkType: schedule.link_type || undefined,
          linkUrl: schedule.link_url || undefined,
          projectId: schedule.project_id || undefined,
          testMode: true, // Use test mode
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to send test message');
      }

      toast.success(`Test message sent to ${testRecipient.full_name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test message');
      console.error(error);
    } finally {
      setIsTesting(null);
    }
  };

  const formatSchedule = (schedule: ScheduledSMS) => {
    if (schedule.schedule_type === 'recurring') {
      if (schedule.cron_expression) {
        const parts = schedule.cron_expression.split(' ');
        if (parts.length === 5) {
          const minutes = parts[0].padStart(2, '0');
          const hours = parts[1].padStart(2, '0');
          return `Daily at ${hours}:${minutes} ${schedule.timezone}`;
        }
      }
      return 'Recurring';
    } else {
      if (schedule.scheduled_datetime) {
        return format(new Date(schedule.scheduled_datetime), 'PPp');
      }
      return 'One-time';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading scheduled messages...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Scheduled SMS Messages</h2>
          <p className="text-muted-foreground">Automate SMS sending with recurring or one-time schedules</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No scheduled messages yet</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.name}</TableCell>
                  <TableCell>{formatSchedule(schedule)}</TableCell>
                  <TableCell>
                    {schedule.target_type === 'users'
                      ? `${schedule.target_user_ids?.length || 0} user(s)`
                      : schedule.target_roles?.join(', ') || 'None'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                      {schedule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {schedule.last_sent_at
                      ? format(new Date(schedule.last_sent_at), 'PPp')
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingLogsFor(schedule.id)}
                        title="View execution logs"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestSend(schedule)}
                        disabled={isTesting === schedule.id}
                        title="Send test message"
                      >
                        {isTesting === schedule.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(schedule)}
                        title={schedule.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {schedule.is_active ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(schedule)}
                        title="Edit schedule"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(schedule.id)}
                        disabled={isDeleting === schedule.id}
                        title="Delete schedule"
                      >
                        {isDeleting === schedule.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Scheduled Message' : 'Create Scheduled Message'}
            </DialogTitle>
            <DialogDescription>
              Configure when and to whom automated SMS messages should be sent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Daily Clock-Out Reminder"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message Template *</Label>
              <Textarea
                id="message"
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="Use {{name}} to insert recipient's first name"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{name}}"} to personalize messages
              </p>
            </div>

            <div className="space-y-2">
              <Label>Include App Link</Label>
              <Select value={linkType} onValueChange={(value) => {
                setLinkType(value);
                if (value !== 'project') {
                  setSelectedProjectId('');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {linkType === 'project' && (
              <div className="space-y-2">
                <Label htmlFor="project">Select Project *</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_number} - {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Schedule Type *</Label>
              <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as 'recurring' | 'one_time')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="one_time">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scheduleType === 'recurring' ? (
              <>
                <div className="space-y-2">
                  <Label>Days of Week *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={day.value}
                          checked={selectedDays.includes(day.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDays([...selectedDays, day.value]);
                            } else {
                              setSelectedDays(selectedDays.filter(d => d !== day.value));
                            }
                          }}
                        />
                        <Label htmlFor={day.value} className="font-normal cursor-pointer">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone *</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="datetime">Date & Time *</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Target Recipients *</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as 'users' | 'roles')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roles">By Role</SelectItem>
                  <SelectItem value="users">Specific Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === 'users' ? (
              <div className="space-y-2">
                <Label>Select Users *</Label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`user-${recipient.id}`}
                        checked={selectedUserIds.includes(recipient.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUserIds([...selectedUserIds, recipient.id]);
                          } else {
                            setSelectedUserIds(selectedUserIds.filter(id => id !== recipient.id));
                          }
                        }}
                      />
                      <Label htmlFor={`user-${recipient.id}`} className="font-normal cursor-pointer flex-1">
                        {recipient.full_name} {recipient.phone && `(${recipient.phone})`}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Roles *</Label>
                <div className="space-y-2">
                  {ROLES.map((role) => (
                    <div key={role.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.value}`}
                        checked={selectedRoles.includes(role.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoles([...selectedRoles, role.value]);
                          } else {
                            setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                          }
                        }}
                      />
                      <Label htmlFor={`role-${role.value}`} className="font-normal cursor-pointer">
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="is-active" className="font-normal cursor-pointer">
                Active (schedule will run automatically)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingSchedule ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={!!viewingLogsFor} onOpenChange={(open) => !open && setViewingLogsFor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution Logs</DialogTitle>
            <DialogDescription>
              View execution history for this scheduled message
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ScheduledSMSLogs scheduleIdFilter={viewingLogsFor || undefined} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

