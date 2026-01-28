import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  parsePayeeCSVFile, 
  mapCSVToPayees, 
  validatePayeeCSVData,
  dedupePayeesInFile,
  PayeeCSVRow, 
  PayeeColumnMapping,
  PayeeImportData
} from '@/utils/payeeCsvParser';
import { classifyPayees, type ClassifiedPayee } from '@/utils/payeeImportMatcher';
import type { PartialPayee } from '@/utils/fuzzyPayeeMatcher';
import { PayeeType } from '@/types/payee';

interface PayeeImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PayeeImportModal: React.FC<PayeeImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<PayeeCSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<PayeeColumnMapping>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [existingPayees, setExistingPayees] = useState<PartialPayee[]>([]);
  const [classifiedPayees, setClassifiedPayees] = useState<ClassifiedPayee[] | null>(null);
  const [dedupeMergedCount, setDedupeMergedCount] = useState(0);
  const [isFetchingPayees, setIsFetchingPayees] = useState(false);
  const [importPayeeType, setImportPayeeType] = useState<PayeeType>(PayeeType.SUBCONTRACTOR);
  const [includedByIndex, setIncludedByIndex] = useState<Record<number, boolean>>({});
  const [payeeTypeByIndex, setPayeeTypeByIndex] = useState<Record<number, PayeeType | undefined>>({});
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
    created: { payee_name: string; id?: string }[];
    updated: { payee_name: string; id: string }[];
    duplicates: { payee_name: string; reason: 'existing' | 'in_file'; matchedPayeeName?: string; confidence?: number; mergedNames?: string[] }[];
  }>({ success: 0, errors: [], created: [], updated: [], duplicates: [] });
  const { toast } = useToast();

  const resetState = () => {
    setSelectedFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setErrors([]);
    setIsUploading(false);
    setIsImporting(false);
    setStep('upload');
    setExistingPayees([]);
    setClassifiedPayees(null);
    setDedupeMergedCount(0);
    setImportPayeeType(PayeeType.SUBCONTRACTOR);
    setIncludedByIndex({});
    setPayeeTypeByIndex({});
    setImportResults({ success: 0, errors: [], created: [], updated: [], duplicates: [] });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setSelectedFile(file);
    setErrors([]);
    
    try {
      const result = await parsePayeeCSVFile(file);
      if (result.errors.length > 0) {
        setErrors(result.errors);
      } else {
        setCsvData(result.data);
        setHeaders(result.headers);
        setStep('mapping');
        setErrors([]);
      }
    } catch (error) {
      setErrors(['Failed to parse CSV file']);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(f => f.name.endsWith('.csv') || f.type === 'text/csv');
    
    if (csvFile) {
      handleFileSelect(csvFile);
    } else {
      setErrors(['Please select a CSV file']);
    }
  }, []);

  const handlePreview = async () => {
    const validationErrors = validatePayeeCSVData(csvData, mapping);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setIsFetchingPayees(true);
    try {
      const { data: payees, error } = await supabase
        .from('payees')
        .select('id, payee_name, full_name, payee_type')
        .eq('is_active', true);
      if (error) throw error;
      const existing: PartialPayee[] = (payees ?? []).map((p) => ({
        id: p.id,
        payee_name: p.payee_name ?? '',
        full_name: p.full_name ?? undefined,
        payee_type: p.payee_type as PayeeType | undefined,
      }));
      setExistingPayees(existing);

      const mapped = mapCSVToPayees(csvData, mapping, selectedFile?.name ?? '');
      const { unique, mergedCount, mergedRows } = dedupePayeesInFile(mapped);
      setDedupeMergedCount(mergedCount);
      const classified = classifyPayees(unique, existing, mergedRows);
      setClassifiedPayees(classified);
      setIncludedByIndex({});
      setPayeeTypeByIndex({});
      setStep('preview');
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to load existing payees']);
    } finally {
      setIsFetchingPayees(false);
    }
  };

  const handleImport = async () => {
    if (!classifiedPayees) return;

    setIsImporting(true);
    const created: { payee_name: string; id?: string }[] = [];
    const updated: { payee_name: string; id: string }[] = [];
    const duplicates: { payee_name: string; reason: 'existing' | 'in_file'; matchedPayeeName?: string; confidence?: number; mergedNames?: string[] }[] = [];
    const errorMessages: string[] = [];

    const getRowType = (idx: number, row: ClassifiedPayee) => {
      if (payeeTypeByIndex[idx] !== undefined) return payeeTypeByIndex[idx]!;
      if (row.status === 'existing' || row.status === 'review') {
        return row.matchedPayee?.payee_type ?? importPayeeType;
      }
      return importPayeeType;
    };
    const buildUpdatePayload = (csvPayee: PayeeImportData, includeType: boolean, rowType: PayeeType, options?: { omitPayeeName?: boolean }): Record<string, string | boolean> => {
      const payload: Record<string, string | boolean> = {};
      const keys: (keyof PayeeImportData)[] = options?.omitPayeeName
        ? ['email', 'phone_numbers', 'billing_address', 'full_name', 'contact_name', 'contact_title', 'legal_form', 'state_of_formation', 'notes', 'account_number', 'terms']
        : ['payee_name', 'email', 'phone_numbers', 'billing_address', 'full_name', 'contact_name', 'contact_title', 'legal_form', 'state_of_formation', 'notes', 'account_number', 'terms'];
      for (const k of keys) {
        const v = csvPayee[k];
        if (v != null && String(v).trim() !== '') payload[k] = String(v).trim();
      }
      if (includeType) {
        payload.payee_type = rowType;
        payload.provides_labor = rowType === PayeeType.SUBCONTRACTOR;
        payload.provides_materials = rowType === PayeeType.MATERIAL_SUPPLIER;
        payload.requires_1099 = rowType === PayeeType.SUBCONTRACTOR;
        payload.is_internal = rowType === PayeeType.INTERNAL_LABOR;
      }
      return payload;
    };

    try {
      for (let i = 0; i < classifiedPayees.length; i++) {
        if (includedByIndex[i] === false) continue;
        const row = classifiedPayees[i];
        const rowType = getRowType(i, row);
        if (row.status === 'existing' || row.status === 'review') {
          if (row.matchedPayee) {
            const payload = buildUpdatePayload(row.csvPayee, true, rowType, { omitPayeeName: true });
            if (Object.keys(payload).length === 0) {
              duplicates.push({ payee_name: row.csvPayee.payee_name, reason: 'existing', matchedPayeeName: row.matchedPayee.payee_name, confidence: row.confidence });
              continue;
            }
            try {
              const { error } = await supabase.from('payees').update(payload).eq('id', row.matchedPayee.id);
              if (error) errorMessages.push(`Failed to update ${row.csvPayee.payee_name}: ${error.message}`);
              else updated.push({ payee_name: row.csvPayee.payee_name, id: row.matchedPayee.id });
            } catch (err) {
              errorMessages.push(`Failed to update ${row.csvPayee.payee_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          } else {
            duplicates.push({
              payee_name: row.csvPayee.payee_name,
              reason: 'existing',
              matchedPayeeName: row.matchedPayee?.payee_name,
              confidence: row.confidence,
            });
          }
          continue;
        }
        // status === 'new' -> insert
        try {
          const insertPayload = {
            ...row.csvPayee,
            payee_type: rowType,
            provides_labor: rowType === PayeeType.SUBCONTRACTOR,
            provides_materials: rowType === PayeeType.MATERIAL_SUPPLIER,
            requires_1099: rowType === PayeeType.SUBCONTRACTOR,
            is_internal: rowType === PayeeType.INTERNAL_LABOR,
          };
          const { data, error } = await supabase
            .from('payees')
            .insert([insertPayload])
            .select('id')
            .single();

          if (error) {
            errorMessages.push(`Failed to import ${row.csvPayee.payee_name}: ${error.message}`);
          } else {
            created.push({ payee_name: row.csvPayee.payee_name, id: data?.id });
            if (row.mergedNames && row.mergedNames.length > 1) {
              duplicates.push({
                payee_name: row.csvPayee.payee_name,
                reason: 'in_file',
                mergedNames: row.mergedNames,
              });
            }
          }
        } catch (err) {
          errorMessages.push(`Failed to import ${row.csvPayee.payee_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      setImportResults({ success: created.length, errors: errorMessages, created, updated, duplicates });
      setStep('complete');

      if (created.length > 0 || updated.length > 0) {
        const parts = [];
        if (created.length > 0) parts.push(`${created.length} created`);
        if (updated.length > 0) parts.push(`${updated.length} updated`);
        toast({
          title: "Import completed",
          description: `${parts.join(', ')}${errorMessages.length > 0 ? `; ${errorMessages.length} error(s)` : ''}`,
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: "Failed to import payees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const newCount = classifiedPayees?.filter((c) => c.status === 'new').length ?? 0;
  const existingCount = classifiedPayees?.filter((c) => c.status === 'existing').length ?? 0;
  const reviewCount = classifiedPayees?.filter((c) => c.status === 'review').length ?? 0;
  const isIncluded = (i: number) => includedByIndex[i] !== false;
  const selectedNewCount = classifiedPayees?.filter((c, i) => c.status === 'new' && isIncluded(i)).length ?? 0;
  const selectedExistingCount = classifiedPayees?.filter((c, i) => c.status === 'existing' && isIncluded(i)).length ?? 0;
  const selectedReviewCount = classifiedPayees?.filter((c, i) => c.status === 'review' && isIncluded(i)).length ?? 0;
  const payeesAfterImport = existingPayees.length + selectedNewCount;
  const nothingToDo = selectedNewCount === 0 && selectedExistingCount + selectedReviewCount === 0;
  const getPayeeTypeLabel = (t: PayeeType) => {
    const labels: Record<PayeeType, string> = {
      [PayeeType.SUBCONTRACTOR]: 'Subcontractor',
      [PayeeType.MATERIAL_SUPPLIER]: 'Material Supplier',
      [PayeeType.EQUIPMENT_RENTAL]: 'Equipment Rental',
      [PayeeType.INTERNAL_LABOR]: 'Internal Labor',
      [PayeeType.MANAGEMENT]: 'Management',
      [PayeeType.PERMIT_AUTHORITY]: 'Permit Authority',
      [PayeeType.OTHER]: 'Other',
    };
    return labels[t] ?? t;
  };

  const CSV_FIELD_LABELS: Record<keyof PayeeImportData, string> = {
    payee_name: 'Name',
    email: 'Email',
    phone_numbers: 'Phone',
    billing_address: 'Billing address',
    full_name: 'Full name',
    contact_name: 'Contact name',
    contact_title: 'Contact title',
    legal_form: 'Legal form',
    state_of_formation: 'State of formation',
    notes: 'Notes',
    account_number: 'Account number',
    terms: 'Terms',
  };
  const getFieldsToUpdateLabel = (csvPayee: PayeeImportData, isExistingOrReview: boolean, effectivePayeeType?: PayeeType, currentPayeeType?: PayeeType): string => {
    const keys: (keyof PayeeImportData)[] = isExistingOrReview
      ? ['email', 'phone_numbers', 'billing_address', 'full_name', 'contact_name', 'contact_title', 'legal_form', 'state_of_formation', 'notes', 'account_number', 'terms']
      : ['payee_name', 'email', 'phone_numbers', 'billing_address', 'full_name', 'contact_name', 'contact_title', 'legal_form', 'state_of_formation', 'notes', 'account_number', 'terms'];
    const list: string[] = [];
    for (const k of keys) {
      if (csvPayee[k] != null && String(csvPayee[k]).trim() !== '') list.push(CSV_FIELD_LABELS[k]);
    }
    if (isExistingOrReview && effectivePayeeType !== currentPayeeType) list.push('Payee type');
    return list.length === 0 ? '—' : list.join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Payees from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium">Drop CSV file here or click to select</p>
              <p className="text-sm text-gray-500 mt-2">
                Supports QuickBooks payee export format and standard CSV files
              </p>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
            
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span>{selectedFile.name}</span>
                <span className="text-gray-500">({Math.round(selectedFile.size / 1024)} KB)</span>
              </div>
            )}
            
            {isUploading && (
              <div className="text-center">
                <p>Processing CSV file...</p>
              </div>
            )}
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Map CSV Columns</h3>
              <p className="text-sm text-gray-600 mb-4">
                Map your CSV columns to payee fields. Payee name is required.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Payee Name *</label>
                <Select value={mapping.payee_name || ''} onValueChange={(value) => setMapping(prev => ({ ...prev, payee_name: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Select value={mapping.email || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, email: value === 'none' ? undefined : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Select value={mapping.phone_numbers || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, phone_numbers: value === 'none' ? undefined : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Billing Address</label>
                <Select value={mapping.billing_address || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, billing_address: value === 'none' ? undefined : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Select value={mapping.full_name || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, full_name: value === 'none' ? undefined : value }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h?.trim()).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Name</label>
                <Select value={mapping.contact_name || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, contact_name: value === 'none' ? undefined : value }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h?.trim()).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Title</label>
                <Select value={mapping.contact_title || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, contact_title: value === 'none' ? undefined : value }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h?.trim()).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Legal Form</label>
                <Select value={mapping.legal_form || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, legal_form: value === 'none' ? undefined : value }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h?.trim()).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State of Formation</label>
                <Select value={mapping.state_of_formation || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, state_of_formation: value === 'none' ? undefined : value }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h?.trim()).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Select value={mapping.notes || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, notes: value === 'none' ? undefined : value }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h?.trim()).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Number</label>
                <Select value={mapping.account_number || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, account_number: value === 'none' ? undefined : value }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h?.trim()).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Terms</label>
                <Select value={mapping.terms || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, terms: value === 'none' ? undefined : value }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h?.trim()).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handlePreview}>
                Preview Data
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Preview import</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You have {classifiedPayees?.length ?? 0} rows in this file (duplicates within the file are merged). Choose which rows to add or update below.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <p className="font-medium">You have <strong>{existingPayees.length}</strong> payees in your account. After this import you&apos;ll have <strong>{payeesAfterImport}</strong> payees.</p>
              <p>This file has <strong>{newCount}</strong> new payees (will be added) and <strong>{existingCount + reviewCount}</strong> existing payees (already in your account).</p>
              <p><strong>{selectedNewCount}</strong> of {newCount} rows will <strong>add new</strong> payees.</p>
              <p><strong>{selectedExistingCount + selectedReviewCount}</strong> of {existingCount + reviewCount} rows will <strong>update</strong> existing payees with the data from this file.</p>
              {dedupeMergedCount > 0 && <p><strong>{dedupeMergedCount}</strong> rows in the file were merged as duplicates.</p>}
            </div>

            <p className="text-xs text-muted-foreground">New payees are created as Subcontractor unless you choose a different type in the table.</p>
            
            <p className="text-xs text-muted-foreground">The <strong>Updates</strong> column shows which fields from the file will be written for each row. Only those fields change; empty columns leave the existing payee unchanged.</p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIncludedByIndex({})}>
                  Include all
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setIncludedByIndex(Object.fromEntries((classifiedPayees ?? []).map((_, i) => [i, false])))}>
                  Exclude all
                </Button>
              </div>
              <div className="border rounded-lg overflow-x-auto max-h-[40vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Include</TableHead>
                      <TableHead>Payee Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Billing Address</TableHead>
                      <TableHead>Payee type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Match info</TableHead>
                      <TableHead className="min-w-[140px]">Updates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classifiedPayees?.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Checkbox
                            checked={includedByIndex[index] !== false}
                            onCheckedChange={(v) => setIncludedByIndex(prev => ({ ...prev, [index]: v === true }))}
                            aria-label={`Include row ${index + 1}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.csvPayee.payee_name}</TableCell>
                        <TableCell>{row.csvPayee.email || '-'}</TableCell>
                        <TableCell>{row.csvPayee.phone_numbers || '-'}</TableCell>
                        <TableCell>{row.csvPayee.billing_address || '-'}</TableCell>
                        <TableCell>
                          {(() => {
                            const currentType = payeeTypeByIndex[index] ?? (row.status === 'existing' || row.status === 'review' ? row.matchedPayee?.payee_type : undefined) ?? importPayeeType;
                            const isUsingDefault = payeeTypeByIndex[index] === undefined;
                            return (
                              <Select
                                value={payeeTypeByIndex[index] ?? '__default__'}
                                onValueChange={(v) => setPayeeTypeByIndex(prev => ({ ...prev, [index]: v === '__default__' ? undefined : v as PayeeType }))}
                              >
                                <SelectTrigger className="h-8 text-xs min-w-[120px]">
                                  <SelectValue>
                                    {isUsingDefault && (row.status === 'existing' || row.status === 'review') && row.matchedPayee?.payee_type
                                      ? `Keep current (${getPayeeTypeLabel(row.matchedPayee.payee_type)})`
                                      : getPayeeTypeLabel(currentType)}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__default__">
                                    {row.status === 'new' 
                                      ? `Use default (${getPayeeTypeLabel(importPayeeType)})`
                                      : row.matchedPayee?.payee_type 
                                        ? `Keep current (${getPayeeTypeLabel(row.matchedPayee.payee_type)})`
                                        : `Use default (${getPayeeTypeLabel(importPayeeType)})`}
                                  </SelectItem>
                              <SelectItem value={PayeeType.SUBCONTRACTOR}>Subcontractor</SelectItem>
                              <SelectItem value={PayeeType.MATERIAL_SUPPLIER}>Material Supplier</SelectItem>
                              <SelectItem value={PayeeType.EQUIPMENT_RENTAL}>Equipment Rental</SelectItem>
                              <SelectItem value={PayeeType.INTERNAL_LABOR}>Internal Labor</SelectItem>
                              <SelectItem value={PayeeType.MANAGEMENT}>Management</SelectItem>
                              <SelectItem value={PayeeType.PERMIT_AUTHORITY}>Permit Authority</SelectItem>
                              <SelectItem value={PayeeType.OTHER}>Other</SelectItem>
                                </SelectContent>
                              </Select>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <span className={
                            row.status === 'new' ? 'text-green-600 font-medium' :
                            row.status === 'existing' ? 'text-amber-600 font-medium' : 'text-blue-600 font-medium'
                          }>
                            {row.status === 'new' ? 'New' : row.status === 'existing' ? 'Existing' : 'Review'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(row.status === 'existing' || row.status === 'review') && row.matchedPayee && (
                            <>Matches: {row.matchedPayee.payee_name}{row.confidence != null ? ` (${Math.round(row.confidence)}%)` : ''}</>
                          )}
                          {row.inFileMergedCount != null && row.inFileMergedCount > 0 && (
                            <>{row.inFileMergedCount} row(s) merged in file</>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground" title={row.status === 'new' ? 'New payee: all mapped fields will be saved.' : 'Only these fields from the file will be written to the existing payee. Empty columns are not changed.'}>
                          {row.status === 'new' ? 'All (new payee)' : getFieldsToUpdateLabel(row.csvPayee, true, payeeTypeByIndex[index] ?? (row.status === 'existing' || row.status === 'review' ? row.matchedPayee?.payee_type ?? importPayeeType : importPayeeType), row.matchedPayee?.payee_type)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              {nothingToDo && (
                <p className="text-sm text-muted-foreground">Nothing to do: no rows selected to add or update. Check the rows you want to process above.</p>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back to Mapping
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || isFetchingPayees || nothingToDo}
                >
                  {isFetchingPayees ? 'Loading...' : isImporting ? 'Importing...' : selectedNewCount > 0 || selectedExistingCount + selectedReviewCount > 0 ? `Import ${selectedNewCount} New, Update ${selectedExistingCount + selectedReviewCount} Existing` : 'Import'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Import Complete</h3>
              <p className="text-gray-600">
                Successfully imported {importResults.success} payee{importResults.success === 1 ? '' : 's'}
                {importResults.updated.length > 0 && `, updated ${importResults.updated.length}`}
                {importResults.errors.length > 0 && `; ${importResults.errors.length} error(s)`}
              </p>
            </div>

            {importResults.created.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Newly added payees</h4>
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payee Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.created.map((c, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{c.payee_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {importResults.updated.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Updated payees</h4>
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payee Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.updated.map((u, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{u.payee_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {importResults.duplicates.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Potential duplicates (skipped or merged)</h4>
                <ul className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 text-sm list-disc list-inside">
                  {importResults.duplicates.map((d, index) => (
                    <li key={index}>
                      {d.reason === 'existing' && (
                        <>Skipped: {d.payee_name} – matches existing payee {d.matchedPayeeName ?? '?'}{d.confidence != null ? ` (${Math.round(d.confidence)}%)` : ''}</>
                      )}
                      {d.reason === 'in_file' && (
                        <>Merged in file: {d.mergedNames?.join(', ')} → imported as one payee</>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {importResults.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {importResults.errors.map((error, index) => (
                        <div key={index} className="text-sm">{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="flex justify-center">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};