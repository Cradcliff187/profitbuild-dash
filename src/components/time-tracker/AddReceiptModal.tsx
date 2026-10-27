import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera as CameraIcon, X, Loader2, Search, ScanLine, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PayeeSelector } from '@/components/PayeeSelector';
import { PayeeType } from '@/types/payee';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { isIOSPWA } from '@/utils/platform';
import { getProjectCategoryOrFilter } from '@/utils/sandboxPreferences';
import { createReceiptSignedUrl } from '@/utils/receiptUrls';
import { useAuth } from '@/contexts/AuthContext';
import { useReceiptScan, type ReceiptScanResult, type ReceiptScanStatus } from '@/hooks/useReceiptScan';
import type { Json } from '@/integrations/supabase/types';

// Per-user last-picked construction project, remembered across capture sessions.
const LAST_PROJECT_STORAGE_KEY = (userId?: string) =>
  userId ? `rcg.receipts.lastProjectId.${userId}` : null;

// Payee types this surface can display. Shared with the scan so the edge
// function never resolves a vendor the PayeeSelector below can't show.
const RECEIPT_PAYEE_TYPES = [
  PayeeType.MATERIAL_SUPPLIER,
  PayeeType.EQUIPMENT_RENTAL,
  PayeeType.MANAGEMENT,
  PayeeType.PERMIT_AUTHORITY,
  PayeeType.OTHER,
];

// Below this the amount still pre-fills but reads amber "check this".
const AMOUNT_CONFIDENCE_OK = 0.7;

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  category?: string;
}

interface AddReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (receipt: { id: string }) => void;
  initialProjectId?: string;
}

const todayLocal = () => format(new Date(), 'yyyy-MM-dd');

/** Build captured_at from the Date field: real timestamp for today, local noon for a back-dated receipt. */
function capturedAtFor(date: string): string {
  if (!date || date === todayLocal()) return new Date().toISOString();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return new Date().toISOString();
  return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0).toISOString();
}

interface ScanStatusChipProps {
  status: ReceiptScanStatus;
  result: ReceiptScanResult | null;
}

/** One-line status under the photo. Informational only — never blocks anything. */
const ScanStatusChip: React.FC<ScanStatusChipProps> = ({ status, result }) => {
  if (status === 'idle' || status === 'skipped') return null;

  const base = 'flex items-center gap-2 rounded-md px-3 py-2 text-sm';

  if (status === 'scanning') {
    return (
      <div className={cn(base, 'bg-muted text-muted-foreground')} role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Reading receipt…
      </div>
    );
  }

  if (status === 'failed' || status === 'timeout' || !result || result.status === 'failed') {
    return (
      <div className={cn(base, 'bg-muted text-muted-foreground')} role="status">
        <ScanLine className="h-4 w-4 shrink-0" />
        Couldn't read it — enter the details by hand
      </div>
    );
  }

  if (result.status === 'no_receipt') {
    return (
      <div className={cn(base, 'bg-muted text-muted-foreground')} role="status">
        <ScanLine className="h-4 w-4 shrink-0" />
        That doesn't look like a receipt — enter the details by hand
      </div>
    );
  }

  const ex = result.extraction;
  const parts: string[] = [];
  if (result.vendorMatch?.payee_name) parts.push(result.vendorMatch.payee_name);
  if (ex?.total !== null && ex?.total !== undefined) parts.push(`$${ex.total.toFixed(2)}`);
  if (ex?.date) {
    try {
      parts.push(format(parseISO(ex.date), 'MMM d'));
    } catch {
      // ignore unparsable date
    }
  }
  const amountIffy = ex?.total !== null && ex?.total !== undefined && ex.confidence.total < AMOUNT_CONFIDENCE_OK;

  if (parts.length === 0) {
    return (
      <div className={cn(base, 'bg-muted text-muted-foreground')} role="status">
        <ScanLine className="h-4 w-4 shrink-0" />
        Couldn't read the details — enter them by hand
      </div>
    );
  }

  return (
    <div
      className={cn(
        base,
        amountIffy ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200' : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
      )}
      role="status"
    >
      {amountIffy ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
      <span className="min-w-0 truncate">
        {amountIffy ? 'Check the amount · ' : 'Found: '}
        {parts.join(' · ')}
      </span>
    </div>
  );
};

export const AddReceiptModal: React.FC<AddReceiptModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialProjectId
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | undefined>();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(todayLocal);
  const [uploading, setUploading] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // --- Receipt scan (flag-gated pre-fill) ---
  const receiptScan = useReceiptScan({ allowedPayeeTypes: RECEIPT_PAYEE_TYPES });
  const { scan: runScan, reset: resetScan } = receiptScan;
  // Which fields currently hold a scanned (untouched) value — drives the highlight.
  const [prefilled, setPrefilled] = useState<{ amount: boolean; payee: boolean; date: boolean }>({
    amount: false,
    payee: false,
    date: false,
  });
  // Fields the worker has typed into; a late scan result never overwrites these.
  const touchedRef = useRef<{ amount: boolean; payee: boolean; date: boolean }>({
    amount: false,
    payee: false,
    date: false,
  });
  const scanResultRef = useRef<ReceiptScanResult | null>(null);
  const [vendorHint, setVendorHint] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const { data: projectData } = useQuery({
    queryKey: ['receipt-modal-projects', getProjectCategoryOrFilter()],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const [sysRes, overheadRes, constructionRes] = await Promise.all([
        supabase.from('projects').select('id').eq('project_number', 'SYS-000').maybeSingle(),
        supabase
          .from('projects')
          .select('id, project_number, project_name, status, category')
          .eq('category', 'overhead')
          .in('status', ['approved', 'in_progress'])
          .order('project_number', { ascending: true }),
        supabase
          .from('projects')
          .select('id, project_number, project_name, status, category')
          .or(getProjectCategoryOrFilter())
          .in('status', ['approved', 'in_progress'])
          .order('project_number', { ascending: false }),
      ]);
      if (overheadRes.error) throw overheadRes.error;
      if (constructionRes.error) throw constructionRes.error;
      return {
        systemProjectId: sysRes.data?.id ?? null,
        projects: [...(overheadRes.data || []), ...(constructionRes.data || [])] as Project[],
      };
    },
  });

  const projects = useMemo(() => projectData?.projects ?? [], [projectData]);
  const systemProjectId = projectData?.systemProjectId ?? null;

  useEffect(() => {
    if (!open) return;

    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
      return;
    }

    // No initialProjectId → try last-used construction project from localStorage.
    // Uses the in-memory auth user (`useAuth`) instead of `supabase.auth.getUser()`.
    // getUser() is a network round-trip that holds the supabase-js auth lock, which
    // serialized the payee/project data queries behind it on every modal open (they
    // each need an access token through that same lock). Reading user.id from context
    // is synchronous and lets those queries fire immediately in parallel.
    // `projects` is in the dep array so this retries once the useQuery resolves.
    try {
      const key = LAST_PROJECT_STORAGE_KEY(user?.id);
      if (!key) return;
      const lastId = localStorage.getItem(key);
      if (!lastId) return;
      const project = projects.find(p => p.id === lastId);
      if (project && project.category === 'construction' &&
          (project.status === 'approved' || project.status === 'in_progress')) {
        setSelectedProjectId(lastId);
      }
    } catch {
      // localStorage failures are non-fatal
    }
  }, [open, initialProjectId, projects, user?.id]);

  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;

    const query = projectSearchQuery.toLowerCase();
    return projects.filter(project =>
      project.project_number.toLowerCase().includes(query) ||
      project.project_name.toLowerCase().includes(query)
    );
  }, [projects, projectSearchQuery]);

  const IOS_TIP_STORAGE_KEY = 'rcg.ios-upload-tip-shown';

  const openFilePicker = () => {
    if (isIOSPWA() && !localStorage.getItem(IOS_TIP_STORAGE_KEY)) {
      toast.info('Device upload tip', {
        description: "Select Take Photo or Video, Photo Library, or Browse from your iPhone's sheet.",
        duration: 4000,
      });
      try {
        localStorage.setItem(IOS_TIP_STORAGE_KEY, '1');
      } catch {
        // ignore quota / private-mode errors
      }
    }
    fileInputRef.current?.click();
  };

  const clearScanState = () => {
    resetScan();
    scanResultRef.current = null;
    setVendorHint(null);
    setPrefilled({ amount: false, payee: false, date: false });
  };

  /** Apply a scan result to whichever fields the worker hasn't touched. */
  const applyScanResult = (res: ReceiptScanResult) => {
    scanResultRef.current = res;
    if (res.status === 'no_receipt' || !res.extraction) return;

    const ex = res.extraction;
    const touched = touchedRef.current;
    const next = { amount: false, payee: false, date: false };

    if (ex.total !== null && !touched.amount) {
      setAmount(ex.total.toFixed(2));
      setAmountError(null);
      next.amount = true;
    }
    if (ex.date && !touched.date) {
      setDate(ex.date);
      next.date = true;
    }
    if (res.vendorMatch?.payee_id && !touched.payee) {
      setSelectedPayeeId(res.vendorMatch.payee_id);
      next.payee = true;
      setVendorHint(null);
    } else if (!res.vendorMatch?.payee_id && ex.vendor_name) {
      // No confident match → show the raw text as a hint; never auto-create.
      setVendorHint(ex.vendor_name);
    }
    setPrefilled(next);
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      event.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Please choose a file smaller than 15MB');
      event.target.value = '';
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to read file:', error);
      toast.error('Failed to read selected file');
      return;
    }

    // Retake: drop any previous scan's highlights before the new one runs.
    clearScanState();
    // Fire-and-forget. The form is fully usable while this runs; the hook's
    // request id makes a retake or close discard a late result.
    void runScan(file).then((res) => {
      if (res) applyScanResult(res);
    });
  };

  const handleSave = async () => {
    // Blur first so the iOS keyboard/dictation session tears down before the
    // save chain runs (mirrors ManualTimeEntrySheet — Gotcha #71 family).
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (!capturedPhoto) {
      toast.error('Please capture a photo first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!selectedPayeeId) {
      toast.error('Please select a payee');
      return;
    }

    if (!user) {
      toast.error('You must be signed in to save a receipt');
      return;
    }

    setUploading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();

      // Upload to storage
      const timestamp = Date.now();
      const filename = `${timestamp}_receipt.jpg`;
      const storagePath = `${user.id}/receipts/${filename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('time-tracker-documents')
        .upload(storagePath, blob);

      if (uploadError) throw uploadError;

      // Get signed URL (1-year, centralized — see src/utils/receiptUrls.ts)
      const signedUrl = await createReceiptSignedUrl(uploadData.path);

      // Scan bookkeeping: what the scan said + what the worker kept. A scan still
      // in flight at Save time is discarded (the receipt records it as skipped).
      const scanRes = scanResultRef.current;
      const scanInFlight = receiptScan.status === 'scanning';
      if (scanInFlight) resetScan();
      const ocrStatus: string | null = !receiptScan.enabled
        ? null
        : scanRes
          ? scanRes.status
          : receiptScan.status === 'timeout'
            ? 'timeout'
            : receiptScan.status === 'failed'
              ? 'failed'
              : 'skipped';
      const ocrData = scanRes
        ? {
            extraction: scanRes.extraction,
            vendorMatch: scanRes.vendorMatch,
            normalized: scanRes.normalized,
            meta: scanRes.meta,
            user_kept: { amount: parseFloat(amount), payee_id: selectedPayeeId, date },
          }
        : null;

      // Create receipt record (NOT an expense)
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          image_url: signedUrl,
          amount: parseFloat(amount),
          payee_id: selectedPayeeId,
          project_id: selectedProjectId || systemProjectId,
          description: description || null,
          captured_at: capturedAtFor(date),
          ocr_status: ocrStatus,
          ocr_data: ocrData as unknown as Json,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Learn the vendor: when the scan read a vendor string but the worker
      // saved a different payee than it suggested (or it had no suggestion),
      // remember the printed text → payee as an exact alias. Best-effort.
      try {
        const printed = scanRes?.normalized?.vendor;
        const suggested = scanRes?.vendorMatch?.payee_id ?? null;
        if (printed && printed.length >= 3 && suggested !== selectedPayeeId) {
          const { error: aliasError } = await supabase.from('payee_aliases').insert({
            payee_id: selectedPayeeId,
            alias: printed,
            match_mode: 'exact',
            source: 'learned',
            created_by: user.id,
          });
          // 23505 = someone already taught this alias; nothing to do.
          if (aliasError && aliasError.code !== '23505') {
            console.warn('[receipt-scan] alias learn failed', aliasError.message);
          }
        }
      } catch (aliasErr) {
        console.warn('[receipt-scan] alias learn failed', aliasErr);
      }

      // Remember the picked construction project for next capture.
      // Overhead picks don't overwrite — keeps the last real job sticky.
      try {
        const finalProject = projects.find(p => p.id === selectedProjectId);
        if (finalProject?.category === 'construction') {
          const key = LAST_PROJECT_STORAGE_KEY(user.id);
          if (key) localStorage.setItem(key, finalProject.id);
        }
      } catch {
        // non-fatal
      }

      // Send email notification
      console.log('📧 Invoking send-receipt-notification for receipt ID:', receiptData.id);
      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-receipt-notification', {
        body: { id: receiptData.id }
      });

      if (emailError) {
        console.error('❌ Email notification failed:', emailError);
        toast.warning('Receipt saved, but email notification failed. Use "Resend" from the receipts list.');
      } else {
        console.log('✅ Email notification sent. Response:', emailResponse);
        toast.success('Receipt saved and notification sent!');
      }
      onSuccess?.(receiptData);
      handleClose();
    } catch (error) {
      console.error('Failed to save receipt:', error);
      toast.error('Failed to save receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCapturedPhoto(null);
    setSelectedProjectId(undefined);
    setSelectedPayeeId(undefined);
    setDescription('');
    setAmount('');
    setAmountError(null);
    setDate(todayLocal());
    touchedRef.current = { amount: false, payee: false, date: false };
    setQuickAddOpen(false);
    clearScanState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const scanExtraction = receiptScan.result?.extraction ?? null;
  const amountIffy =
    prefilled.amount &&
    scanExtraction?.total !== null &&
    scanExtraction?.total !== undefined &&
    scanExtraction.confidence.total < AMOUNT_CONFIDENCE_OK;
  const prefillRing = 'ring-2 ring-emerald-400/60 bg-emerald-50/60 dark:bg-emerald-950/30';
  const prefillRingAmber = 'ring-2 ring-amber-400/70 bg-amber-50/70 dark:bg-amber-950/30';
  const vendorTier = receiptScan.result?.vendorMatch?.tier;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        className={cn(
          "flex flex-col p-0",
          isMobile
            ? "w-[92%] max-h-[92vh] rounded-t-2xl inset-x-0 mx-auto sm:max-w-xl"
            : "w-full sm:max-w-[500px]"
        )}
        side={isMobile ? "bottom" : "right"}
      >
        <SheetHeader className="space-y-1 px-6 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className="text-xl font-semibold md:text-lg">Add Receipt</SheetTitle>
          <SheetDescription className="hidden text-sm md:block">
            Capture a receipt and assign it to a vendor and project
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Camera Capture / Photo Preview */}
            <div className="space-y-3">
              {!capturedPhoto ? (
                <>
                  <Button
                    onClick={openFilePicker}
                    variant="outline"
                    className="h-48 w-full border-2 border-dashed"
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <CameraIcon className="w-12 h-12 text-muted-foreground" />
                      <span className="text-base font-medium md:text-sm">
                        Upload photo (camera, photo library, or files)
                      </span>
                    </div>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {receiptScan.enabled
                      ? 'Get the whole receipt in the frame, including the total — the amount, vendor, and date fill in automatically.'
                      : 'Tapping the button opens the default iPhone/Android prompt so you can take a photo, pick from your library, or browse files.'}
                  </p>
                </>
              ) : (
                <>
                  <div className="relative">
                    <img
                      src={capturedPhoto}
                      alt="Captured receipt"
                      className="h-48 w-full object-cover rounded-lg"
                    />
                    <Button
                      onClick={() => {
                        setCapturedPhoto(null);
                        clearScanState();
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      variant="destructive"
                      size="icon"
                      aria-label="Remove photo"
                      className="absolute top-2 right-2 h-11 w-11 md:h-9 md:w-9"
                    >
                      <X className="w-5 h-5 md:w-4 md:h-4" />
                    </Button>
                  </div>
                  <ScanStatusChip status={receiptScan.status} result={receiptScan.result} />
                  <Button
                    onClick={openFilePicker}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 min-h-[44px] text-sm md:min-h-0"
                  >
                    <CameraIcon className="w-4 h-4 mr-2" />
                    Retake photo
                  </Button>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>

            {/* Amount (Required) */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base font-medium md:text-sm">
                Amount *
                {prefilled.amount && (
                  <span className={cn('ml-2 text-xs font-normal', amountIffy ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300')}>
                    {amountIffy ? 'from scan — check this' : 'from scan'}
                  </span>
                )}
              </Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value;
                  touchedRef.current.amount = true;
                  setPrefilled((p) => (p.amount ? { ...p, amount: false } : p));
                  setAmount(v);
                  const parsed = parseFloat(v);
                  if (v && (isNaN(parsed) || parsed <= 0)) {
                    setAmountError('Amount must be greater than 0');
                  } else {
                    setAmountError(null);
                  }
                }}
                placeholder="0.00"
                required
                aria-invalid={!!amountError}
                aria-describedby={amountError ? 'amount-error' : undefined}
                className={cn(
                  "h-12 text-base md:h-9 md:text-sm",
                  amountError && "border-destructive",
                  prefilled.amount && (amountIffy ? prefillRingAmber : prefillRing),
                )}
              />
              {amountError && (
                <p id="amount-error" className="text-xs text-destructive">
                  {amountError}
                </p>
              )}
            </div>

            {/* Payee (Required) */}
            <div className="space-y-1">
              <PayeeSelector
                value={selectedPayeeId || ''}
                onValueChange={(payeeId) => {
                  touchedRef.current.payee = true;
                  setPrefilled((p) => (p.payee ? { ...p, payee: false } : p));
                  setVendorHint(null);
                  setSelectedPayeeId(payeeId);
                }}
                filterInternal={false}
                filterPayeeTypes={RECEIPT_PAYEE_TYPES}
                sortByUsage={true}
                usageSource="receipts"
                label="Vendor / Supplier"
                showLabel
                placeholder="Select a vendor or supplier"
                required
                defaultPayeeType={PayeeType.MATERIAL_SUPPLIER}
                defaultIsInternal={false}
                compact={!isMobile}
                isMobile={isMobile}
                quickAddDefaultName={vendorHint ?? undefined}
                quickAddOpen={quickAddOpen}
                onQuickAddOpenChange={setQuickAddOpen}
              />
              {prefilled.payee && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {vendorTier === 'fuzzy'
                    ? `Looks like ${receiptScan.result?.vendorMatch?.payee_name} — tap to change if that's wrong`
                    : 'Vendor from scan'}
                </p>
              )}
              {vendorHint && !selectedPayeeId && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">
                    Receipt says: <span className="font-medium text-foreground">{vendorHint}</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setQuickAddOpen(true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add as new vendor
                  </Button>
                </div>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="receipt-date" className="text-base font-medium md:text-sm">
                Date
                {prefilled.date && (
                  <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-300">from scan</span>
                )}
              </Label>
              <Input
                id="receipt-date"
                type="date"
                value={date}
                max={todayLocal()}
                onChange={(e) => {
                  touchedRef.current.date = true;
                  setPrefilled((p) => (p.date ? { ...p, date: false } : p));
                  setDate(e.target.value);
                }}
                className={cn("h-12 text-base md:h-9 md:text-sm", prefilled.date && prefillRing)}
              />
            </div>

            {/* Project Assignment (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="project" className="text-base font-medium text-muted-foreground md:text-sm">
                Assign to Project (Optional)
              </Label>
              <Select
                value={selectedProjectId || "unassigned"}
                onValueChange={(value) => {
                  setSelectedProjectId(value === "unassigned" ? undefined : value);
                  setProjectSearchQuery(''); // Clear search on selection
                }}
              >
                <SelectTrigger className="h-12 text-base md:h-9 md:text-sm">
                  <SelectValue placeholder="Select a project" className="text-base md:text-sm">
                    {selectedProjectId ? (
                      <span className="truncate text-base md:text-sm">
                        {(() => {
                          const project = projects.find(p => p.id === selectedProjectId);
                          return project?.category === 'overhead'
                            ? project.project_name
                            : `${project?.project_number} - ${project?.project_name}`;
                        })()}
                      </span>
                    ) : (
                      "Unassigned"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Search Input INSIDE Dropdown */}
                  <div className="flex items-center border-b border-border px-3 pb-2 pt-2 focus-within:border-b-2 focus-within:border-foreground/40 transition-colors">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className="h-10 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base md:h-8 md:text-sm"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  {/* Unassigned Option */}
                  <SelectItem value="unassigned">
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectItem>
                  {/* Filtered Projects */}
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.category === 'overhead'
                          ? project.project_name
                          : `${project.project_number} - ${project.project_name}`
                        }
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No projects found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Description (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium text-muted-foreground md:text-sm">
                Notes (Optional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this receipt..."
                rows={isMobile ? 4 : 3}
                className="text-base md:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Fixed Footer with Action Buttons */}
        <div className="flex gap-3 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t bg-background shrink-0">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1 min-h-[48px] text-base md:text-sm"
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 min-h-[48px] text-base font-medium md:text-sm"
            disabled={!capturedPhoto || !amount || !selectedPayeeId || !!amountError || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin md:h-4 md:w-4" />
                Saving...
              </>
            ) : (
              'Save Receipt'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
