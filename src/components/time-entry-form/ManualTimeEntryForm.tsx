import { useState, useEffect } from 'react';
import { useTimeEntryForm, type TimeEntryFormData } from './hooks/useTimeEntryForm';
import { WorkerPicker } from './fields/WorkerPicker';
import { ProjectPicker } from './fields/ProjectPicker';
import { DateField } from './fields/DateField';
import { TimeRangeField } from './fields/TimeRangeField';
import { OvernightIndicator } from './fields/OvernightIndicator';
import { LunchSection } from './fields/LunchSection';
import { HoursDisplay } from './fields/HoursDisplay';
import { NotesField } from './fields/NotesField';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertTriangle, Lock } from 'lucide-react';
import type { TimeEntryFormInitialValues } from './hooks/useTimeEntryForm';

export interface ManualTimeEntryFormProps {
  mode: 'create' | 'edit';
  /**
   * Partial by design: edit mode passes the whole entry, while create mode
   * seeds only what the caller knows (e.g. just `date`, when the worker picked
   * a day off the week strip). Every field falls back to a sane default in
   * `useTimeEntryForm`.
   */
  initialValues?: Partial<TimeEntryFormInitialValues> & { receiptUrl?: string };
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

/**
 * Explains a read-only form instead of just grey fields.
 *
 * Only rendered when the caller says the entry can't be edited (`canEdit`
 * false) — the caller owns that rule (owner + approved, or locked; admins and
 * managers pass `canEdit` true on approved entries). RLS enforces the same
 * thing server-side via "Employees can edit their own time entries", so this
 * is the UI agreeing with the database, not a second opinion.
 */
function LockedNotice({
  approvalStatus,
  isLocked,
}: {
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  isLocked?: boolean;
}) {
  const headline = isLocked
    ? 'Locked for payroll'
    : approvalStatus === 'approved'
      ? 'Approved'
      : 'Read-only';

  return (
    <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-3">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-sm">
        <p className="font-medium">{headline} — this entry can't be changed</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ask the office if something needs to be corrected.
        </p>
      </div>
    </div>
  );
}

/** The office's reason, shown on a rejected entry so it can be fixed and resaved. */
function RejectedNotice({ reason }: { reason: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-warning bg-warning/10 p-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-warning">Rejected</p>
        <p className="mt-0.5 text-xs text-muted-foreground break-words">
          {reason}
        </p>
      </div>
    </div>
  );
}

export function ManualTimeEntryForm({
  mode,
  initialValues,
  disabled = false,
  canEdit = true,
  showRates = false,
  approvalStatus = null,
  isLocked = false,
  rejectionReason,
  restrictToCurrentUser = false,
  onFormDataReady,
}: ManualTimeEntryFormProps) {
  const isMobile = useIsMobile();
  const [selectedProjectNumber, setSelectedProjectNumber] = useState<
    string | null
  >(initialValues?.projectNumber ?? null);

  const form = useTimeEntryForm({
    initialValues,
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
    <div className="space-y-4">
      {!canEdit && (
        <LockedNotice approvalStatus={approvalStatus} isLocked={isLocked} />
      )}
      {approvalStatus === 'rejected' && rejectionReason && (
        <RejectedNotice reason={rejectionReason} />
      )}
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
      <NotesField
        value={form.notes}
        onChange={form.setNotes}
        disabled={effectiveDisabled}
      />
    </div>
  );
}
