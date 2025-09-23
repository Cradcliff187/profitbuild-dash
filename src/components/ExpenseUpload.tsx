import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseCSVFile, mapCSVToExpenses, validateCSVData } from '@/utils/csvParser';
import { CSVRow, ColumnMapping, Expense } from '@/types/expense';
import { Estimate } from '@/types/estimate';
import { ProjectSelector } from './ProjectSelector';
import { useToast } from '@/hooks/use-toast';

interface ExpenseUploadProps {
  estimates: Estimate[];
  onExpensesImported: (expenses: Expense[]) => void;
}

export const ExpenseUpload: React.FC<ExpenseUploadProps> = ({ estimates, onExpensesImported }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrors(['Please select a CSV file']);
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    
    try {
      const result = await parseCSVFile(file);
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
    const validationErrors = validateCSVData(csvData, mapping);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    if (!selectedProject) {
      setErrors(['Please select a project']);
      return;
    }

    setErrors([]);
    setStep('preview');
  };

  const handleImport = () => {
    if (!selectedFile || !selectedProject) return;

    const expenses = mapCSVToExpenses(csvData, mapping, selectedProject, selectedFile.name);
    onExpensesImported(expenses);
    
    toast({
      title: "Import Successful",
      description: `Imported ${expenses.length} expenses`,
    });

    setStep('complete');
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setSelectedProject('');
    setErrors([]);
    setStep('upload');
  };

  if (step === 'complete') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Import Complete</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Your expenses have been successfully imported and added to the project.
          </p>
          <Button onClick={resetUpload}>Import Another File</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {selectedFile ? selectedFile.name : 'Drop your CSV file here or click to browse'}
              </p>
              <p className="text-muted-foreground">
                Supports QuickBooks exports and standard CSV formats
              </p>
              <input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
            {isUploading && (
              <div className="mt-4 text-center">
                <p className="text-muted-foreground">Parsing CSV file...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Mapping */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date Column</label>
                <Select value={mapping.expense_date || ''} onValueChange={(value) => setMapping({...mapping, expense_date: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Description Column *</label>
                <Select value={mapping.description || ''} onValueChange={(value) => setMapping({...mapping, description: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select description column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Amount Column *</label>
                <Select value={mapping.amount || ''} onValueChange={(value) => setMapping({...mapping, amount: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select amount column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Payee Column</label>
                <Select value={mapping.payee_id || ''} onValueChange={(value) => setMapping({...mapping, payee_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payee column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.filter(header => header && header.trim()).map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Select Project *</label>
              <ProjectSelector
                estimates={estimates}
                selectedEstimate={estimates.find(e => e.id === selectedProject)}
                onSelect={(estimate) => setSelectedProject(estimate.id)}
                placeholder="Choose project for these expenses"
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={handlePreview} disabled={!mapping.description || !mapping.amount || !selectedProject}>
                Preview Import
              </Button>
              <Button variant="outline" onClick={resetUpload}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Import</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Preview of {csvData.length} expenses to be imported
              </p>
            </div>
            
            <div className="max-h-96 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{mapping.description ? row[mapping.description] : '-'}</TableCell>
                      <TableCell>${mapping.amount ? parseFloat(row[mapping.amount].replace(/[$,]/g, '') || '0').toFixed(2) : '0.00'}</TableCell>
                      <TableCell>{mapping.expense_date ? new Date(row[mapping.expense_date]).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>Auto-detected</TableCell>
                      <TableCell>{mapping.payee_id ? row[mapping.payee_id] : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {csvData.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing first 10 rows of {csvData.length} total expenses
              </p>
            )}

            <div className="flex space-x-2 mt-4">
              <Button onClick={handleImport}>
                Import {csvData.length} Expenses
              </Button>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
            </div>
          </CardContent>
        </Card>
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
  );
};