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
  parseVendorCSVFile, 
  mapCSVToVendors, 
  validateVendorCSVData,
  VendorCSVRow, 
  VendorColumnMapping,
  VendorImportData
} from '@/utils/vendorCsvParser';

interface VendorImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VendorImportModal: React.FC<VendorImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<VendorCSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<VendorColumnMapping>({});
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
    setStep('upload');
    setImportResults({ success: 0, errors: [] });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrors(['Please select a CSV file']);
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    
    try {
      const result = await parseVendorCSVFile(file);
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
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handlePreview = () => {
    const validationErrors = validateVendorCSVData(csvData, mapping);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    const vendors = mapCSVToVendors(csvData, mapping, selectedFile.name);
    
    try {
      let successCount = 0;
      const errorMessages: string[] = [];

      // Import vendors one by one to handle duplicates
      for (const vendor of vendors) {
        try {
          const { error } = await supabase
            .from('vendors')
            .insert(vendor);

          if (error) {
            errorMessages.push(`Failed to import ${vendor.vendor_name}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (error) {
          errorMessages.push(`Failed to import ${vendor.vendor_name}: ${error}`);
        }
      }

      setImportResults({ success: successCount, errors: errorMessages });
      setStep('complete');

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} vendors`,
      });

    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import vendors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleComplete = () => {
    onSuccess();
    handleClose();
  };

  const previewData = csvData.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Import Vendors from CSV</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById('vendor-file-input')?.click()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {selectedFile ? selectedFile.name : 'Drop your CSV file here or click to browse'}
                </p>
                <p className="text-muted-foreground">
                  Supports QuickBooks vendor exports and standard CSV formats
                </p>
                <input
                  id="vendor-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
              {isUploading && (
                <div className="text-center">
                  <p className="text-muted-foreground">Parsing CSV file...</p>
                </div>
              )}
            </div>
          )}

          {/* Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Map CSV Columns to Vendor Fields</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Vendor Name *</label>
                  <Select value={mapping.vendor_name || ''} onValueChange={(value) => setMapping({...mapping, vendor_name: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor name column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Select value={mapping.email || ''} onValueChange={(value) => setMapping({...mapping, email: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {headers.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Select value={mapping.phone_numbers || ''} onValueChange={(value) => setMapping({...mapping, phone_numbers: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phone column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {headers.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Billing Address</label>
                  <Select value={mapping.billing_address || ''} onValueChange={(value) => setMapping({...mapping, billing_address: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select address column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {headers.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={handlePreview} disabled={!mapping.vendor_name}>
                  Preview Import
                </Button>
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preview Import</h3>
              <p className="text-sm text-muted-foreground">
                Preview of first 5 vendors (of {csvData.length} total)
              </p>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Billing Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{mapping.vendor_name ? row[mapping.vendor_name] : '-'}</TableCell>
                        <TableCell>{mapping.email ? row[mapping.email] : '-'}</TableCell>
                        <TableCell>{mapping.phone_numbers ? row[mapping.phone_numbers] : '-'}</TableCell>
                        <TableCell>{mapping.billing_address ? row[mapping.billing_address] : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? 'Importing...' : `Import ${csvData.length} Vendors`}
                </Button>
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back to Mapping
                </Button>
              </div>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <div className="space-y-2">
                <p className="text-green-600 font-medium">
                  Successfully imported {importResults.success} vendors
                </p>
                {importResults.errors.length > 0 && (
                  <div className="text-left">
                    <p className="text-orange-600 font-medium mb-2">
                      {importResults.errors.length} errors occurred:
                    </p>
                    <div className="max-h-32 overflow-y-auto text-sm text-muted-foreground">
                      {importResults.errors.map((error, index) => (
                        <p key={index}>• {error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={handleComplete} className="w-full">
                Done
              </Button>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};