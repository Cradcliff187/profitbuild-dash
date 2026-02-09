import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ArrowLeft, Info } from 'lucide-react';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { importBudgetSheet, convertToEstimateLineItems } from '@/services/estimateImportService';
import { ImportResult, ImportStep, IMPORT_CATEGORY_DISPLAY, calculateImportedItemCushion } from '@/types/importTypes';
import { useInternalLaborRates } from '@/hooks/useCompanySettings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: any[]) => void;
}

export function ImportEstimateModal({ isOpen, onClose, onImport }: Props) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: laborRates, isLoading: ratesLoading } = useInternalLaborRates();
  const laborBillingRate = laborRates?.billing_rate_per_hour ?? 75;
  const laborActualRate = laborRates?.actual_cost_per_hour ?? 35;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
    setError(null);
    setIsLoading(true);

    try {
      setStep('processing');
      
      const result = await importBudgetSheet(uploadedFile, {
        useLLMEnrichment: false, // Deterministic by default
        laborBillingRate,
        laborActualRate,
      });

      if (!result.success) {
        throw new Error(result.warnings[0]?.message || 'Failed to parse file');
      }

      setParseResult(result);
      setSelectedIndices(new Set(result.items.map((_, i) => i)));
      setStep('review');
      
      toast.success(`Found ${result.items.length} line items`, {
        description: `${result.metadata.compoundRowsSplit} compound rows split`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setStep('upload');
      toast.error('Import failed');
    } finally {
      setIsLoading(false);
    }
  }, [laborBillingRate, laborActualRate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isLoading || ratesLoading
  });

  const toggleItem = (i: number) => setSelectedIndices(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const toggleAll = () => {
    if (!parseResult) return;
    setSelectedIndices(prev => 
      prev.size === parseResult.items.length ? new Set() : new Set(parseResult.items.map((_, i) => i))
    );
  };

  const handleImport = () => {
    if (!parseResult) return;
    const items = parseResult.items.filter((_, i) => selectedIndices.has(i));
    onImport(convertToEstimateLineItems(items));
    toast.success(`Imported ${items.length} items`);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setParseResult(null);
    setSelectedIndices(new Set());
    setError(null);
    onClose();
  };

  // Calculate totals for selected items
  const selectedItems = parseResult?.items.filter((_, i) => selectedIndices.has(i)) || [];
  const totalCost = selectedItems.reduce((s, i) => s + i.cost, 0);
  const totalPrice = selectedItems.reduce((s, i) => s + (i.price || 0), 0);
  const laborCushion = selectedItems.reduce((s, i) => s + calculateImportedItemCushion(i), 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Budget Sheet
          </DialogTitle>
          <DialogDescription>
            Upload a budget sheet to automatically extract line items
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}>
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">{isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}</p>
              <p className="text-sm text-muted-foreground mt-2">Supports .csv, .xlsx, .xls</p>
              {error && <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            </div>
          )}

          {/* PROCESSING STEP */}
          {step === 'processing' && (
            <div className="text-center py-12">
              <BrandedLoader size="lg" message="Analyzing budget sheet..." />
              <p className="text-sm text-muted-foreground mt-2">Extracting line items deterministically</p>
              <Progress value={66} className="w-64 mx-auto mt-6" />
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'review' && parseResult && (
            <div className="space-y-4">
              {/* Extraction metadata */}
              <div className="bg-muted/50 rounded-lg p-2 text-sm">
                <div className="flex flex-wrap gap-4">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Deterministic Parser
                  </Badge>
                  <span>Header: Row {parseResult.metadata.headerRowIndex + 1}</span>
                  <span>Scanned: {parseResult.metadata.rowsScanned} rows</span>
                  <span>Extracted: {parseResult.metadata.rowsExtracted} items</span>
                  {parseResult.metadata.compoundRowsSplit > 0 && (
                    <span className="text-amber-600">
                      {parseResult.metadata.compoundRowsSplit} compound rows split
                    </span>
                  )}
                  {parseResult.metadata.stopReason && (
                    <span className="text-muted-foreground text-xs">
                      Stop: {parseResult.metadata.stopReason}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    Confidence: {(parseResult.metadata.mappingConfidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {parseResult.warnings.length > 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>{parseResult.warnings.length} warnings:</strong>
                    <ul className="list-disc list-inside mt-1 text-sm max-h-20 overflow-auto">
                      {parseResult.warnings
                        .filter(w => w.code !== 'SKIPPED_EMPTY_ROW')
                        .slice(0, 5)
                        .map((w, i) => (
                          <li key={i}>{w.message}</li>
                        ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={selectedIndices.size === parseResult.items.length} onCheckedChange={toggleAll} />
                  <span className="font-medium">{selectedIndices.size} of {parseResult.items.length} selected</span>
                </div>
                <span className="text-sm text-muted-foreground">{file?.name}</span>
              </div>

              <div className="border rounded-lg overflow-hidden max-h-[50vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Markup</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.items.map((item, i) => {
                      const cat = IMPORT_CATEGORY_DISPLAY[item.category];
                      const cushion = calculateImportedItemCushion(item);
                      return (
                        <TableRow key={i} className={`cursor-pointer ${!selectedIndices.has(i) ? 'opacity-40' : ''}`} onClick={() => toggleItem(i)}>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Checkbox checked={selectedIndices.has(i)} onCheckedChange={() => toggleItem(i)} />
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.normalizedName}</span>
                              {item.wasSplit && <Badge variant="secondary" className="ml-2 text-xs">Split</Badge>}
                              {cushion > 0 && <div className="text-xs text-amber-600">+{formatCurrency(cushion)} cushion</div>}
                            </div>
                          </TableCell>
                          <TableCell><Badge className={`${cat.bgColor} ${cat.color} border-0`}>{cat.label}</Badge></TableCell>
                          <TableCell className="text-sm">{item.vendorName || '-'}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                          <TableCell className="text-right font-mono">{item.markupPct !== null ? `${(item.markupPct * 100).toFixed(0)}%` : '-'}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{item.price !== null ? formatCurrency(item.price) : '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-slate-50 border rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Cost</div>
                  <div className="font-mono font-semibold text-lg">{formatCurrency(totalCost)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Price</div>
                  <div className="font-mono font-semibold text-lg">{formatCurrency(totalPrice)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gross Margin</div>
                  <div className="font-mono font-semibold text-lg">{totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice * 100).toFixed(1) : 0}%</div>
                </div>
              </div>
              {laborCushion > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-900">Estimated Labor Cushion: <strong>{formatCurrency(laborCushion)}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === 'review' ? () => { setStep('upload'); setFile(null); setParseResult(null); } : handleClose} disabled={isLoading}>
            {step === 'review' ? <><ArrowLeft className="h-4 w-4 mr-2" />Back</> : 'Cancel'}
          </Button>
          {step === 'review' && (
            <Button onClick={handleImport} disabled={!selectedIndices.size}>
              <CheckCircle2 className="h-4 w-4 mr-2" />Import {selectedIndices.size} Items
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImportEstimateModal;
