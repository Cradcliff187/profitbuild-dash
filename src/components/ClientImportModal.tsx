import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  parseClientCSVFile, 
  mapCSVToClients, 
  validateClientCSVData,
  getQuickBooksColumnMapping,
  ClientCSVRow, 
  ClientColumnMapping,
  ClientImportData
} from '@/utils/clientCsvParser';
import { CLIENT_TYPES } from '@/types/client';

interface ClientImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClientImportModal: React.FC<ClientImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ClientCSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ClientColumnMapping>({});
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
      const result = await parseClientCSVFile(file);
      if (result.errors.length > 0) {
        setErrors(result.errors);
      } else {
        setCsvData(result.data);
        setHeaders(result.headers);
        
        // Auto-detect QuickBooks column mapping
        const autoMapping = getQuickBooksColumnMapping(result.headers);
        setMapping(autoMapping);
        
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
    const validationErrors = validateClientCSVData(csvData, mapping);
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
    const clients = mapCSVToClients(csvData, mapping, selectedFile.name);
    
    try {
      let successCount = 0;
      const errorMessages: string[] = [];

      // Import clients one by one to handle duplicates
      for (const client of clients) {
        try {
          const { error } = await supabase
            .from('clients')
            .insert([client]);

          if (error) {
            errorMessages.push(`Failed to import ${client.client_name}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errorMessages.push(`Failed to import ${client.client_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      setImportResults({ success: successCount, errors: errorMessages });
      setStep('complete');

      if (successCount > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} client${successCount === 1 ? '' : 's'}${errorMessages.length > 0 ? ` with ${errorMessages.length} error${errorMessages.length === 1 ? '' : 's'}` : ''}`,
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: "Failed to import clients. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const previewData = csvData.slice(0, 5);
  const previewClients = mapCSVToClients(previewData, mapping, selectedFile?.name || '');

  const getClientTypeLabel = (type: string) => {
    return CLIENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getClientTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'commercial': return 'default';
      case 'residential': return 'secondary';
      case 'government': return 'outline';
      case 'nonprofit': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Clients from CSV</DialogTitle>
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
                Supports QuickBooks customer export format and standard CSV files
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
                Map your CSV columns to client fields. Client name is required. QuickBooks format detected automatically.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Name *</label>
                <Select value={mapping.client_name || ''} onValueChange={(value) => setMapping(prev => ({ ...prev, client_name: value }))}>
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
                <label className="block text-sm font-medium mb-1">Contact Person</label>
                <Select value={mapping.contact_person || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, contact_person: value === 'none' ? undefined : value }))}>
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
                <Select value={mapping.phone || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, phone: value === 'none' ? undefined : value }))}>
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
                <label className="block text-sm font-medium mb-1">Account Number</label>
                <Select value={mapping.quickbooks_customer_id || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, quickbooks_customer_id: value === 'none' ? undefined : value }))}>
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
                Review the first 5 records before importing {csvData.length} total clients. Client types are auto-detected.
              </p>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewClients.map((client, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{client.client_name}</TableCell>
                      <TableCell>
                        <Badge variant={getClientTypeBadgeVariant(client.client_type)}>
                          {getClientTypeLabel(client.client_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{client.contact_person || '-'}</TableCell>
                      <TableCell>{client.email || '-'}</TableCell>
                      <TableCell>{client.phone || '-'}</TableCell>
                      <TableCell>{client.billing_address || '-'}</TableCell>
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
                {isImporting ? 'Importing...' : `Import ${csvData.length} Clients`}
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
                Successfully imported {importResults.success} client{importResults.success === 1 ? '' : 's'}
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