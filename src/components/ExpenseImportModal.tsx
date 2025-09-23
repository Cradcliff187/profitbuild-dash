import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  parseExpenseCSVFile, 
  mapCSVToExpenses, 
  validateExpenseCSVData,
  ExpenseCSVRow, 
  ExpenseColumnMapping,
  ExpenseImportData
} from '@/utils/expenseCsvParser';
import { ExpenseCategory, TransactionType, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from '@/types/expense';

interface ExpenseImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  estimates: any[];
}

export const ExpenseImportModal: React.FC<ExpenseImportModalProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  estimates 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ExpenseCSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ExpenseColumnMapping>({});
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [payees, setPayees] = useState<Array<{id: string, payee_name: string}>>([]);
  const [projects, setProjects] = useState<Array<{id: string, project_name: string, project_number?: string | null, qb_formatted_number?: string | null}>>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });
  const { toast } = useToast();

  // Load payees and projects when modal opens
  useEffect(() => {
    if (open) {
      loadPayeesAndProjects();
    }
  }, [open]);

  const loadPayeesAndProjects = async () => {
    try {
      const [payeesResult, projectsResult] = await Promise.all([
        supabase.from('payees').select('id, payee_name').eq('is_active', true),
        supabase.from('projects').select('id, project_name, project_number, qb_formatted_number')
      ]);

      if (payeesResult.data) setPayees(payeesResult.data);
      if (projectsResult.data) setProjects(projectsResult.data);
    } catch (error) {
      console.error('Failed to load payees and projects:', error);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setSelectedProject('');
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
      const result = await parseExpenseCSVFile(file);
      if (result.errors.length > 0) {
        setErrors(result.errors);
      } else {
        setCsvData(result.data);
        setHeaders(result.headers);
        setStep('mapping');
        setErrors([]);
        // Auto-detect common column mappings
        autoDetectColumns(result.headers);
      }
    } catch (error) {
      setErrors(['Failed to parse CSV file']);
    } finally {
      setIsUploading(false);
    }
  };

  const autoDetectColumns = (headers: string[]) => {
    const newMapping: ExpenseColumnMapping = {};
    
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader.includes('date')) {
        newMapping.expense_date = header;
      } else if (lowerHeader.includes('description') || lowerHeader.includes('memo') || lowerHeader.includes('detail')) {
        newMapping.description = header;
      } else if (lowerHeader.includes('amount') || lowerHeader.includes('total') || lowerHeader.includes('cost')) {
        newMapping.amount = header;
      } else if (lowerHeader.includes('payee') || lowerHeader.includes('vendor') || lowerHeader.includes('name')) {
        newMapping.payee_name = header;
      } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
        newMapping.category = header;
      } else if (lowerHeader.includes('project') || lowerHeader.includes('wo') || lowerHeader.includes('work order') || lowerHeader.includes('job')) {
        newMapping.project_name = header;
      } else if (lowerHeader.includes('invoice') || lowerHeader.includes('ref')) {
        newMapping.invoice_number = header;
      }
    });
    
    setMapping(newMapping);
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
    const validationErrors = validateExpenseCSVData(csvData, mapping, selectedProject);
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
    
    // Create payee name to ID mapping
    const payeeMap = new Map<string, string>();
    payees.forEach(p => payeeMap.set(p.payee_name, p.id));
    
    const expenses = mapCSVToExpenses(csvData, mapping, selectedProject, payeeMap, projectMap);
    
    try {
      let successCount = 0;
      const errorMessages: string[] = [];

      // Import expenses one by one to handle errors gracefully
      for (const expense of expenses) {
        try {
          const { error } = await supabase
            .from('expenses')
            .insert([expense]);

          if (error) {
            errorMessages.push(`Failed to import expense "${expense.description}": ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errorMessages.push(`Failed to import expense "${expense.description}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      setImportResults({ success: successCount, errors: errorMessages });
      setStep('complete');

      if (successCount > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} expense${successCount === 1 ? '' : 's'}${errorMessages.length > 0 ? ` with ${errorMessages.length} error${errorMessages.length === 1 ? '' : 's'}` : ''}`,
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: "Failed to import expenses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const previewData = csvData.slice(0, 5);
  const payeeMap = new Map<string, string>();
  payees.forEach(p => payeeMap.set(p.payee_name, p.id));

  const normalizeProjectKey = useCallback((v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, ''), []);
  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => {
      [p.project_name, p.project_number as string | undefined | null, p.qb_formatted_number as string | undefined | null]
        .forEach(val => { if (val) map.set(normalizeProjectKey(String(val)), p.id); });
    });
    return map;
  }, [projects, normalizeProjectKey]);

  const idToProjectName = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach(p => m.set(p.id, p.project_name));
    return m;
  }, [projects]);

  const previewExpenses = useMemo(() => mapCSVToExpenses(previewData, mapping, selectedProject, payeeMap, projectMap), [previewData, mapping, selectedProject, payeeMap, projectMap]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Expenses from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => document.getElementById('expense-csv-file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium">Drop CSV file here or click to select</p>
              <p className="text-sm text-gray-500 mt-2">
                Supports any CSV format including QuickBooks exports, bank statements, and custom formats
              </p>
              <input
                id="expense-csv-file-input"
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
                Map your CSV columns to expense fields. Date, description, and amount are required.
              </p>
            </div>
            
            {/* Project Selection */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="block text-sm font-medium mb-1">Fallback Project *</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fallback project for unmatched rows" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600 mt-1">Rows that don't match a Project/WO # from CSV will use this project</p>
            </div>
            
            {/* Column Mapping */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <Select value={mapping.expense_date || ''} onValueChange={(value) => setMapping(prev => ({ ...prev, expense_date: value }))}>
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
                <label className="block text-sm font-medium mb-1">Description *</label>
                <Select value={mapping.description || ''} onValueChange={(value) => setMapping(prev => ({ ...prev, description: value }))}>
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
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <Select value={mapping.amount || ''} onValueChange={(value) => setMapping(prev => ({ ...prev, amount: value }))}>
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
                <label className="block text-sm font-medium mb-1">Project/WO # (Optional)</label>
                <Select value={mapping.project_name || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, project_name: value === 'none' ? undefined : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Use fallback</SelectItem>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Payee (Optional)</label>
                <Select value={mapping.payee_name || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, payee_name: value === 'none' ? undefined : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
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
                <label className="block text-sm font-medium mb-1">Category (Optional)</label>
                <Select value={mapping.category || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, category: value === 'none' ? undefined : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Use "Other"</SelectItem>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Invoice # (Optional)</label>
                <Select value={mapping.invoice_number || 'none'} onValueChange={(value) => setMapping(prev => ({ ...prev, invoice_number: value === 'none' ? undefined : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
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
              <Button onClick={handlePreview} disabled={!selectedProject}>
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
                Review the first 5 records before importing {csvData.length} total expenses.
              </p>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Invoice #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewExpenses.map((expense, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell>{idToProjectName.get(expense.project_id) || '-'}{expense.project_id === selectedProject ? ' (Fallback)' : ''}</TableCell>
                      <TableCell>${expense.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {EXPENSE_CATEGORY_DISPLAY[expense.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>{expense.payee_id ? payees.find(p => p.id === expense.payee_id)?.payee_name || 'Unknown' : '-'}</TableCell>
                      <TableCell>{expense.invoice_number || '-'}</TableCell>
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
                {isImporting ? 'Importing...' : `Import ${csvData.length} Expenses`}
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
                Successfully imported {importResults.success} expense{importResults.success === 1 ? '' : 's'}
                {importResults.errors.length > 0 && ` with ${importResults.errors.length} error${importResults.errors.length === 1 ? '' : 's'}`}
              </p>
            </div>
            
            {importResults.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {importResults.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-sm">{error}</div>
                      ))}
                      {importResults.errors.length > 10 && (
                        <div className="text-sm text-gray-500">...and {importResults.errors.length - 10} more errors</div>
                      )}
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