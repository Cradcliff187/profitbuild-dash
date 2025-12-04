# CSV Import Modal UX Improvements

## Overview

Refactor `src/components/ExpenseImportModal.tsx` to improve user experience with:
1. Stepper progress indicator
2. Sticky footer with Import button
3. Collapsible sections (success states collapsed by default)
4. Consolidated duplicate sections
5. Better visual hierarchy
6. Tooltips for reconciliation
7. Tab-based layout for Preview step
8. Clearer call-to-action

---

## File to Modify

`src/components/ExpenseImportModal.tsx`

---

## Step 1: Add New Imports

At the top of the file, add these imports:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight, HelpCircle, Info } from 'lucide-react';
```

---

## Step 2: Add Stepper Component

Add this component BEFORE the main `ExpenseImportModal` component:

```typescript
interface StepperProps {
  currentStep: 'upload' | 'preview' | 'complete';
}

const ImportStepper: React.FC<StepperProps> = ({ currentStep }) => {
  const steps = [
    { id: 'upload', label: 'Upload', number: 1 },
    { id: 'preview', label: 'Review', number: 2 },
    { id: 'complete', label: 'Complete', number: 3 },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['upload', 'preview', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                  status === 'completed' && "bg-green-500 border-green-500 text-white",
                  status === 'current' && "bg-blue-500 border-blue-500 text-white",
                  status === 'upcoming' && "bg-gray-100 border-gray-300 text-gray-400"
                )}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-1 font-medium",
                  status === 'current' && "text-blue-600",
                  status === 'completed' && "text-green-600",
                  status === 'upcoming' && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-16 h-0.5 mx-2 mb-5",
                  getStepStatus(steps[index + 1].id) !== 'upcoming'
                    ? "bg-green-500"
                    : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
```

---

## Step 3: Add Collapsible Section Component

Add this component after the Stepper:

```typescript
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'error' | 'info';
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  variant,
  defaultOpen = false,
  badge,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconStyles = {
    success: 'text-green-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("rounded-lg border", variantStyles[variant])}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left">
          <div className="flex items-center gap-2">
            <span className={iconStyles[variant]}>{icon}</span>
            <span className="font-medium">{title}</span>
            {badge !== undefined && (
              <Badge variant="secondary" className="ml-2">
                {badge}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
```

---

## Step 4: Add Reconciliation Tooltip Component

Add this helper component:

```typescript
const ReconciliationTooltip: React.FC = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">
          <strong>What is reconciliation?</strong>
          <br /><br />
          We compare the total of duplicate transactions in your file against what's already in the system. 
          A small difference (under $10) is usually fine and may indicate minor edits to existing records.
          <br /><br />
          Large differences suggest you should review the duplicates before importing.
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
```

---

## Step 5: Add Issue Summary Component

Add this component to show a consolidated view of issues:

```typescript
interface IssueSummaryProps {
  unmatchedProjects: number;
  unmatchedPayees: number;
  reconciliationDiff: number;
  duplicateCount: number;
}

const IssueSummary: React.FC<IssueSummaryProps> = ({
  unmatchedProjects,
  unmatchedPayees,
  reconciliationDiff,
  duplicateCount,
}) => {
  const issues = [];
  
  if (unmatchedProjects > 0) {
    issues.push({
      label: `${unmatchedProjects} transactions need project assignment`,
      severity: 'warning' as const,
    });
  }
  
  if (unmatchedPayees > 0) {
    issues.push({
      label: `${unmatchedPayees} payees will be auto-created`,
      severity: 'info' as const,
    });
  }
  
  if (Math.abs(reconciliationDiff) > 10) {
    issues.push({
      label: `$${Math.abs(reconciliationDiff).toFixed(2)} reconciliation variance`,
      severity: reconciliationDiff > 100 ? 'error' as const : 'warning' as const,
    });
  }

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">All checks passed - ready to import</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-amber-800 mb-2">
        <AlertCircle className="h-5 w-5" />
        <span className="font-medium">{issues.length} Issue{issues.length > 1 ? 's' : ''} to Review</span>
      </div>
      <ul className="space-y-1 ml-7">
        {issues.map((issue, index) => (
          <li key={index} className="text-sm text-amber-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {issue.label}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

## Step 6: Replace the Preview Step Content

Find the `{step === 'preview' && (` section and replace it entirely with this new structure:

```typescript
{step === 'preview' && (
  <div className="flex flex-col h-[calc(90vh-180px)]">
    {/* Stepper */}
    <ImportStepper currentStep={step} />

    {/* Scrollable Content Area */}
    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
      
      {/* Import Summary Card - Always visible, compact */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-blue-900">Import Summary</h4>
            <p className="text-sm text-blue-700 mt-1">
              {csvData.length} total transactions
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {csvData.filter(row => row['Transaction type'] !== 'Invoice').length}
              </div>
              <div className="text-blue-600">Expenses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {csvData.filter(row => row['Transaction type'] === 'Invoice').length}
              </div>
              <div className="text-green-600">Revenues</div>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Summary */}
      {validationResults && (
        <IssueSummary
          unmatchedProjects={validationResults.unmatchedProjects}
          unmatchedPayees={validationResults.unmatchedPayees?.length || 0}
          reconciliationDiff={validationResults.reconciliation?.difference || 0}
          duplicateCount={
            (validationResults.inFileDuplicates?.length || 0) +
            (validationResults.databaseDuplicates?.length || 0)
          }
        />
      )}

      {/* Tabs for Details */}
      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issues" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Issues
            {validationResults && (validationResults.unmatchedProjects > 0 || validationResults.unmatchedPayees?.length > 0) && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {validationResults.unmatchedProjects + (validationResults.unmatchedPayees?.length || 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Duplicates
            {validationResults && (
              (validationResults.inFileDuplicates?.length || 0) +
              (validationResults.databaseDuplicates?.length || 0) > 0
            ) && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {(validationResults.inFileDuplicates?.length || 0) +
                  (validationResults.databaseDuplicates?.length || 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview">
            Preview Data
          </TabsTrigger>
        </TabsList>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-3 mt-4">
          {/* Project Assignment Section */}
          {validationResults && (
            <CollapsibleSection
              title="Project Assignment"
              icon={validationResults.unmatchedProjects === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              variant={validationResults.unmatchedProjects === 0 ? 'success' : 'warning'}
              defaultOpen={validationResults.unmatchedProjects > 0}
              badge={`${validationResults.matchedProjects} assigned • ${validationResults.unmatchedProjects} unassigned`}
            >
              {validationResults.unmatchedProjects > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Unassigned Project Numbers:</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    {validationResults.unmatchedProjectNumbers?.join(', ') || 'None'}
                  </p>
                  <p className="text-xs text-amber-600 italic">
                    These will be imported to "000-UNASSIGNED" project
                  </p>
                </div>
              ) : (
                <p className="text-sm text-green-700">All transactions matched to existing projects.</p>
              )}
            </CollapsibleSection>
          )}

          {/* Payee Assignment Section */}
          {validationResults && (
            <CollapsibleSection
              title="Payee Assignment"
              icon={validationResults.unmatchedPayees?.length === 0 ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
              variant={validationResults.unmatchedPayees?.length === 0 ? 'success' : 'info'}
              defaultOpen={false}
              badge={`${validationResults.matchedPayees} matched • ${validationResults.unmatchedPayees?.length || 0} new`}
            >
              {validationResults.unmatchedPayees?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>New Payees to Create:</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    {validationResults.unmatchedPayees?.slice(0, 6).join(', ')}
                    {validationResults.unmatchedPayees?.length > 6 && ` +${validationResults.unmatchedPayees.length - 6} more`}
                  </p>
                  <p className="text-xs text-blue-600 italic">
                    These payees will be automatically created during import
                  </p>
                </div>
              ) : (
                <p className="text-sm text-green-700">All payees matched to existing records.</p>
              )}
            </CollapsibleSection>
          )}

          {/* Reconciliation Section */}
          {validationResults?.reconciliation && (
            <CollapsibleSection
              title={
                <span className="flex items-center">
                  Expense Reconciliation
                  <ReconciliationTooltip />
                </span>
              }
              icon={validationResults.reconciliation.isAligned ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              variant={validationResults.reconciliation.isAligned ? 'success' : Math.abs(validationResults.reconciliation.difference) > 100 ? 'error' : 'warning'}
              defaultOpen={!validationResults.reconciliation.isAligned}
            >
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Matching Expenses in System:</span>
                  <span className="font-medium">{formatCurrency(validationResults.reconciliation.totalExistingNonLaborExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Duplicate Amount:</span>
                  <span className="font-medium">{formatCurrency(validationResults.reconciliation.totalDuplicateAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Difference:</span>
                  <span className={cn(
                    "font-bold",
                    validationResults.reconciliation.isAligned ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(Math.abs(validationResults.reconciliation.difference))}
                  </span>
                </div>
                {!validationResults.reconciliation.isAligned && (
                  <p className="text-xs text-amber-600 mt-2">
                    {Math.abs(validationResults.reconciliation.difference) < 10
                      ? "Small variance detected. This is usually acceptable and may indicate minor edits."
                      : "Significant variance detected. Please review duplicates before importing."}
                  </p>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Revenue Reconciliation Section */}
          {validationResults?.revenueReconciliation && (
            <CollapsibleSection
              title={
                <span className="flex items-center">
                  Invoice Reconciliation
                  <ReconciliationTooltip />
                </span>
              }
              icon={validationResults.revenueReconciliation.isAligned ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              variant={validationResults.revenueReconciliation.isAligned ? 'success' : 'warning'}
              defaultOpen={!validationResults.revenueReconciliation.isAligned}
            >
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Matching Invoices in System:</span>
                  <span className="font-medium">{formatCurrency(validationResults.revenueReconciliation.totalExistingRevenues)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Duplicate Invoice Amount:</span>
                  <span className="font-medium">{formatCurrency(validationResults.revenueReconciliation.totalDuplicateAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Difference:</span>
                  <span className={cn(
                    "font-bold",
                    validationResults.revenueReconciliation.isAligned ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(Math.abs(validationResults.revenueReconciliation.difference))}
                  </span>
                </div>
              </div>
            </CollapsibleSection>
          )}
        </TabsContent>

        {/* Duplicates Tab */}
        <TabsContent value="duplicates" className="space-y-3 mt-4">
          {/* Consolidated Duplicates Section */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Duplicate Summary
            </h4>
            
            <div className="space-y-3">
              {/* In-File Duplicates */}
              <div className="flex items-center justify-between text-sm">
                <span>Duplicates within this file:</span>
                <Badge variant={validationResults?.inFileDuplicates?.length ? "secondary" : "outline"}>
                  {validationResults?.inFileDuplicates?.length || 0}
                </Badge>
              </div>
              
              {/* Database Duplicates - Expenses */}
              <div className="flex items-center justify-between text-sm">
                <span>Expenses already imported:</span>
                <Badge variant={validationResults?.databaseDuplicates?.length ? "secondary" : "outline"}>
                  {validationResults?.databaseDuplicates?.length || 0}
                </Badge>
              </div>
              
              {/* Database Duplicates - Revenues */}
              <div className="flex items-center justify-between text-sm">
                <span>Invoices already imported:</span>
                <Badge variant={validationResults?.revenueDatabaseDuplicates?.length ? "secondary" : "outline"}>
                  {validationResults?.revenueDatabaseDuplicates?.length || 0}
                </Badge>
              </div>
              
              {/* Total */}
              <div className="flex items-center justify-between text-sm border-t pt-2 font-medium">
                <span>Total to be skipped:</span>
                <Badge>
                  {(validationResults?.inFileDuplicates?.length || 0) +
                    (validationResults?.databaseDuplicates?.length || 0) +
                    (validationResults?.revenueDatabaseDuplicates?.length || 0)}
                </Badge>
              </div>
            </div>

            {/* Override Options */}
            {((validationResults?.databaseDuplicates?.length || 0) > 0 ||
              (validationResults?.revenueDatabaseDuplicates?.length || 0) > 0) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <p className="text-xs text-gray-500 mb-2">
                  Override options (use with caution):
                </p>
                {(validationResults?.databaseDuplicates?.length || 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="override-expense-duplicates"
                      checked={overrideDuplicates.expenseDatabase}
                      onCheckedChange={(checked) =>
                        setOverrideDuplicates(prev => ({ ...prev, expenseDatabase: !!checked }))
                      }
                    />
                    <label htmlFor="override-expense-duplicates" className="text-sm text-gray-600">
                      Import expense duplicates anyway ({validationResults?.databaseDuplicates?.length})
                    </label>
                  </div>
                )}
                {(validationResults?.revenueDatabaseDuplicates?.length || 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="override-revenue-duplicates"
                      checked={overrideDuplicates.revenueDatabase}
                      onCheckedChange={(checked) =>
                        setOverrideDuplicates(prev => ({ ...prev, revenueDatabase: !!checked }))
                      }
                    />
                    <label htmlFor="override-revenue-duplicates" className="text-sm text-gray-600">
                      Import invoice duplicates anyway ({validationResults?.revenueDatabaseDuplicates?.length})
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expandable Duplicate Details */}
          {validationResults?.databaseDuplicates?.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                <ChevronRight className="h-4 w-4" />
                View duplicate expense transactions
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResults.databaseDuplicates.slice(0, 10).map((dup, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs py-1">{dup.transaction.Date}</TableCell>
                          <TableCell className="text-xs py-1">{dup.transaction.Amount}</TableCell>
                          <TableCell className="text-xs py-1">{dup.transaction.Name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {validationResults.databaseDuplicates.length > 10 && (
                    <p className="text-xs text-gray-500 p-2">
                      +{validationResults.databaseDuplicates.length - 10} more...
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </TabsContent>

        {/* Preview Data Tab */}
        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Project/WO #</TableHead>
                  <TableHead className="text-xs">Account</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => {
                  const isRevenue = row['Transaction type'] === 'Invoice';
                  return (
                    <TableRow key={index}>
                      <TableCell className="text-xs py-2">{row.Date}</TableCell>
                      <TableCell className="text-xs py-2">
                        <Badge variant={isRevenue ? "default" : "secondary"} className="text-xs">
                          {isRevenue ? 'Invoice' : 'Expense'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2">{row.Amount}</TableCell>
                      <TableCell className="text-xs py-2 max-w-[150px] truncate">{row.Name}</TableCell>
                      <TableCell className="text-xs py-2">{row['Project/WO #'] || '-'}</TableCell>
                      <TableCell className="text-xs py-2 max-w-[120px] truncate">{row['Account Full Name'] || '-'}</TableCell>
                      <TableCell className="text-xs py-2">
                        <Badge variant="outline" className="text-xs">
                          {isRevenue ? 'Revenue' : 'Expense'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Showing first {previewData.length} of {csvData.length} transactions
          </p>
        </TabsContent>
      </Tabs>
    </div>

    {/* Sticky Footer */}
    <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex items-center justify-between">
      <Button variant="outline" onClick={() => setStep('upload')}>
        Back
      </Button>
      
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          {calculateImportCount()} records will be imported
        </span>
        <Button
          onClick={handleImport}
          disabled={isImporting}
          className="min-w-[140px]"
        >
          {isImporting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Importing...
            </>
          ) : (
            <>Import {calculateImportCount()} Records</>
          )}
        </Button>
      </div>
    </div>
  </div>
)}
```

---

## Step 7: Add Helper Function for Import Count

Add this function inside the component, near the other helper functions:

```typescript
const calculateImportCount = useCallback(() => {
  if (!validationResults) return csvData.length;
  
  let count = csvData.length;
  
  // Subtract in-file duplicates
  count -= validationResults.inFileDuplicates?.length || 0;
  
  // Subtract database duplicates (unless override is checked)
  if (!overrideDuplicates.expenseDatabase) {
    count -= validationResults.databaseDuplicates?.length || 0;
  }
  if (!overrideDuplicates.revenueDatabase) {
    count -= validationResults.revenueDatabaseDuplicates?.length || 0;
  }
  
  return Math.max(0, count);
}, [csvData.length, validationResults, overrideDuplicates]);
```

---

## Step 8: Update Upload Step to Include Stepper

Find the `{step === 'upload' && (` section and add the stepper at the beginning:

```typescript
{step === 'upload' && (
  <div className="space-y-4">
    {/* Add Stepper */}
    <ImportStepper currentStep={step} />
    
    {/* Rest of existing upload content... */}
    <div 
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
      // ... rest of existing code
```

---

## Step 9: Update DialogContent for Proper Height

Update the DialogContent wrapper to ensure proper scrolling:

```typescript
<DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
  <DialogHeader className="px-6 pt-6 pb-4 border-b">
    <DialogTitle>Import Transactions from CSV</DialogTitle>
  </DialogHeader>
  
  <div className="flex-1 overflow-hidden px-6 py-4">
    {/* All step content goes here */}
  </div>
</DialogContent>
```

---

## Step 10: Add State for Override Duplicates (if not exists)

Make sure this state exists in the component:

```typescript
const [overrideDuplicates, setOverrideDuplicates] = useState({
  expenseDatabase: false,
  revenueDatabase: false,
  inFile: false,
});
```

---

## Verification Checklist

After implementing, verify:

- [ ] Stepper shows correct step (Upload → Review → Complete)
- [ ] Stepper steps are visually connected with progress line
- [ ] Import Summary card shows correct counts
- [ ] Issue Summary shows consolidated warnings/errors
- [ ] Tabs work correctly (Issues, Duplicates, Preview Data)
- [ ] Collapsible sections expand/collapse properly
- [ ] Success sections are collapsed by default
- [ ] Warning/Error sections are expanded by default
- [ ] Reconciliation tooltip appears on hover
- [ ] Sticky footer stays visible when scrolling
- [ ] Import button shows correct record count
- [ ] Override checkboxes work correctly
- [ ] Mobile view is still usable (may need responsive adjustments)

---

## Build and Test

```bash
npm run build
npm run dev
```

Navigate to Expenses page and test the CSV import flow.
