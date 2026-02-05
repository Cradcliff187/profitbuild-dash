import { useState, useEffect } from 'react';
import { useTimeEntryForm, type TimeEntryFormData } from './hooks/useTimeEntryForm';
import { WorkerPicker } from './fields/WorkerPicker';
import { ProjectPicker } from './fields/ProjectPicker';
import { DateField } from './fields/DateField';
import { TimeRangeField } from './fields/TimeRangeField';
import { OvernightIndicator } from './fields/OvernightIndicator';
import { LunchSection } from './fields/LunchSection';
import { HoursDisplay } from './fields/HoursDisplay';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface ManualTimeEntryFormProps {
  mode: 'create' | 'edit';
  initialValues?: {
    workerId: string;
    projectId: string;
    projectNumber?: string;
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
    lunchTaken: boolean;
    lunchDurationMinutes: number;
    receiptUrl?: string;
  };
  disabled?: boolean;
  canEdit?: boolean;
  showReceipt?: boolean;
  showRates?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  isLocked?: boolean;
  rejectionReason?: string;
  /** Called when parent needs current form data (e.g. on Save). */
  onFormDataReady?: (getData: () => TimeEntryFormData) => void;
  /** When true, worker picker auto-selects current user's payee and is read-only (field worker). */
  restrictToCurrentUser?: boolean;
}

export function ManualTimeEntryForm({
  mode,
  initialValues,
  disabled = false,
  canEdit = true,
  showRates = false,
  restrictToCurrentUser = false,
  onFormDataReady,
}: ManualTimeEntryFormProps) {
  const isMobile = useIsMobile();
  const [selectedProjectNumber, setSelectedProjectNumber] = useState<
    string | null
  >(initialValues?.projectNumber ?? null);

  const form = useTimeEntryForm({
    initialValues: initialValues
      ? {
          workerId: initialValues.workerId,
          projectId: initialValues.projectId,
          projectNumber: initialValues.projectNumber,
          date: initialValues.date,
          startTime: initialValues.startTime,
          endTime: initialValues.endTime,
          hours: initialValues.hours,
          lunchTaken: initialValues.lunchTaken,
          lunchDurationMinutes: initialValues.lunchDurationMinutes,
        }
      : undefined,
    selectedProjectNumber: selectedProjectNumber ?? undefined,
  });

  // Expose getFormData to parent (e.g. Sheet footer Save)
  useEffect(() => {
    onFormDataReady?.(form.getFormData);
  }, [form.getFormData, onFormDataReady]);

  const effectiveDisabled = disabled || !canEdit;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzShortLabels: Record<string, string> = {
    'America/New_York': 'ET',
    'America/Chicago': 'CT',
    'America/Denver': 'MT',
    'America/Los_Angeles': 'PT',
    'America/Anchorage': 'AKT',
    'Pacific/Honolulu': 'HT',
  };
  const tzLabel = tzShortLabels[timezone] ?? timezone;

  return (
    <div className={cn('space-y-4', isMobile && 'space-y-4')}>
      <WorkerPicker
        value={form.workerId || null}
        onChange={form.setWorkerId}
        disabled={effectiveDisabled}
        showRates={showRates}
        restrictToCurrentUser={restrictToCurrentUser}
      />
      <ProjectPicker
        value={form.projectId || null}
        onChange={(id, projectNumber) => {
          form.setProjectId(id);
          setSelectedProjectNumber(projectNumber);
        }}
        disabled={effectiveDisabled}
      />
      <DateField
        value={form.date}
        onChange={form.setDate}
        disabled={effectiveDisabled}
      />
      {!form.isPTO && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-4">
          <TimeRangeField
            startTime={form.startTime}
            endTime={form.endTime}
            onStartTimeChange={form.setStartTime}
            onEndTimeChange={form.setEndTime}
            disabled={effectiveDisabled}
          />
          <p className="text-xs text-muted-foreground">
            Times in {tzLabel}
          </p>
          {form.isOvernight && (
            <OvernightIndicator
              isOvernight={true}
              endDate={form.adjustedEndDate}
            />
          )}
          <LunchSection
            lunchTaken={form.lunchTaken}
            onLunchTakenChange={form.setLunchTaken}
            lunchDuration={form.lunchDuration}
            onLunchDurationChange={form.setLunchDuration}
            disabled={effectiveDisabled}
            isMobile={isMobile}
            isPTO={form.isPTO}
          />
          <HoursDisplay
            grossHours={form.grossHours}
            lunchHours={form.lunchHours}
            netHours={form.netHours}
            isAutoCalculated={form.isAutoCalculated}
            manualHours={form.manualHours}
            onManualHoursChange={form.setManualHours}
            isPTO={form.isPTO}
          />
        </div>
      )}
      {form.isPTO && (
        <HoursDisplay
          grossHours={form.grossHours}
          lunchHours={form.lunchHours}
          netHours={form.netHours}
          isAutoCalculated={form.isAutoCalculated}
          manualHours={form.manualHours}
          onManualHoursChange={form.setManualHours}
          isPTO={form.isPTO}
        />
      )}
    </div>
  );
}
