import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  parsePayeeCSVFile, 
  mapCSVToPayees, 
  validatePayeeCSVData,
  PayeeCSVRow, 
  PayeeColumnMapping,
  PayeeImportData
} from '@/utils/payeeCsvParser';

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
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });
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
    setImportResults({ success: 0, errors: [] });
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

  const handlePreview = () => {
    const validationErrors = validatePayeeCSVData(csvData, mapping);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setStep('preview');
    setErrors([]);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    const payees = mapCSVToPayees(csvData, mapping, selectedFile.name);
    
    try {
      let successCount = 0;
      const errorMessages: string[] = [];

      // Import payees one by one to handle duplicates
      for (const payee of payees) {
        try {
          const { error } = await supabase
            .from('payees')
            .insert([payee]);

          if (error) {
            errorMessages.push(`Failed to import ${payee.payee_name}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errorMessages.push(`Failed to import ${payee.payee_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      setImportResults({ success: successCount, errors: errorMessages });
      setStep('complete');

      if (successCount > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} payee${successCount === 1 ? '' : 's'}${errorMessages.length > 0 ? ` with ${errorMessages.length} error${errorMessages.length === 1 ? '' : 's'}` : ''}`,
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

  const previewData = csvData.slice(0, 5);

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
                    {headers.map(header => (
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
                    {headers.map(header => (
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
                    {headers.map(header => (
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
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
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
              <h3 className="text-lg font-medium mb-2">Preview Import Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                Review the first 5 records before importing {csvData.length} total payees.
              </p>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payee Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Billing Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mapCSVToPayees(previewData, mapping, selectedFile?.name || '').map((payee, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{payee.payee_name}</TableCell>
                      <TableCell>{payee.email || '-'}</TableCell>
                      <TableCell>{payee.phone_numbers || '-'}</TableCell>
                      <TableCell>{payee.billing_address || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'Importing...' : `Import ${csvData.length} Payees`}
              </Button>
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
                {importResults.errors.length > 0 && ` with ${importResults.errors.length} error${importResults.errors.length === 1 ? '' : 's'}`}
              </p>
            </div>
            
            {importResults.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                <Alert>
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