# CSV Import Modal - YTD Workflow Redesign

## User Workflow Context

Users export **Year-to-Date (YTD)** transaction reports from QuickBooks and upload them periodically. This means:

- The CSV always contains ALL transactions for the year
- Most records are already in the system (this is expected, not an error)
- Users only care about: **"What's new and can I import it?"**

The UI must be designed around this workflow, not treat duplicates as problems.

---

## Current Problems

1. "78 Duplicates" sounds like something is wrong - it's actually expected behavior
2. "47 Issues" shows stats for ALL 94 records, not just the 7 new ones
3. User has to mentally do the math to understand what's happening
4. Too much information about records that won't be imported anyway
5. Reconciliation is prominent even when there's no problem

---

## Target UX

The modal should communicate:

**"You uploaded 94 YTD transactions. 78 are already in the system. Here are your 7 new ones - ready to import."**

---

## File to Modify

`src/components/ExpenseImportModal.tsx`

---

## Step 1: Add Helper Function to Separate New vs Existing

Add this function near the top of the component (after state declarations):

```typescript
// Separate transactions into new vs already-imported
const categorizeTransactions = useMemo(() => {
  if (!validationResults || !csvData.length) {
    return {
      newRecords: csvData,
      alreadyImported: [],
      newExpenses: [],
      newRevenues: [],
      existingExpenses: [],
      existingRevenues: [],
    };
  }

  // Get all duplicate indices
  const duplicateIndices = new Set<number>();
  
  // In-file duplicates
  validationResults.inFileDuplicates?.forEach((d: any) => {
    const idx = csvData.findIndex(row => 
      row.Date === d.transaction.Date && 
      row.Amount === d.transaction.Amount && 
      row.Name === d.transaction.Name
    );
    if (idx >= 0) duplicateIndices.add(idx);
  });

  // Database duplicates (expenses)
  validationResults.databaseDuplicates?.forEach((d: any) => {
    const idx = csvData.findIndex(row => 
      row.Date === d.transaction.Date && 
      row.Amount === d.transaction.Amount && 
      row.Name === d.transaction.Name
    );
    if (idx >= 0) duplicateIndices.add(idx);
  });

  // Database duplicates (revenues)
  validationResults.revenueDatabaseDuplicates?.forEach((d: any) => {
    const idx = csvData.findIndex(row => 
      row.Date === d.transaction.Date && 
      row.Amount === d.transaction.Amount && 
      row.Name === d.transaction.Name
    );
    if (idx >= 0) duplicateIndices.add(idx);
  });

  // Separate new from existing
  const newRecords: TransactionCSVRow[] = [];
  const alreadyImported: TransactionCSVRow[] = [];

  csvData.forEach((row, index) => {
    if (duplicateIndices.has(index)) {
      alreadyImported.push(row);
    } else {
      newRecords.push(row);
    }
  });

  // Further categorize new records
  const newExpenses = newRecords.filter(r => r['Transaction type'] !== 'Invoice');
  const newRevenues = newRecords.filter(r => r['Transaction type'] === 'Invoice');
  const existingExpenses = alreadyImported.filter(r => r['Transaction type'] !== 'Invoice');
  const existingRevenues = alreadyImported.filter(r => r['Transaction type'] === 'Invoice');

  return {
    newRecords,
    alreadyImported,
    newExpenses,
    newRevenues,
    existingExpenses,
    existingRevenues,
  };
}, [csvData, validationResults]);
```

---

## Step 2: Add Function to Calculate Issues for NEW Records Only

```typescript
// Calculate issues ONLY for new records (not duplicates)
const newRecordIssues = useMemo(() => {
  if (!validationResults || !categorizeTransactions.newRecords.length) {
    return {
      unassignedProjects: 0,
      unassignedProjectNames: [] as string[],
      newPayees: 0,
      newPayeeNames: [] as string[],
      assignedProjects: 0,
      matchedPayees: 0,
    };
  }

  const newRecords = categorizeTransactions.newRecords;
  
  // Check project assignments for new records only
  const projectNumbers = newRecords
    .map(r => r['Project/WO #']?.trim())
    .filter(Boolean);
  
  const existingProjects = validationResults.projects || [];
  const existingProjectNumbers = new Set(
    existingProjects.map((p: any) => p.project_number?.toLowerCase())
  );

  const unassignedProjectNames = new Set<string>();
  let assignedCount = 0;
  let unassignedCount = 0;

  newRecords.forEach(record => {
    const projectNum = record['Project/WO #']?.trim();
    if (!projectNum) {
      unassignedCount++;
      unassignedProjectNames.add('(blank)');
    } else if (!existingProjectNumbers.has(projectNum.toLowerCase())) {
      unassignedCount++;
      unassignedProjectNames.add(projectNum);
    } else {
      assignedCount++;
    }
  });

  // Check payee assignments for new records only
  const payeeNames = newRecords
    .map(r => r.Name?.trim())
    .filter(Boolean);
  
  const existingPayees = validationResults.payees || [];
  const existingPayeeNames = new Set(
    existingPayees.map((p: any) => p.payee_name?.toLowerCase())
  );

  const newPayeeNames = new Set<string>();
  let matchedPayeeCount = 0;
  let newPayeeCount = 0;

  newRecords.forEach(record => {
    const name = record.Name?.trim();
    if (!name) {
      // No payee specified
    } else if (!existingPayeeNames.has(name.toLowerCase())) {
      newPayeeCount++;
      newPayeeNames.add(name);
    } else {
      matchedPayeeCount++;
    }
  });

  return {
    unassignedProjects: unassignedCount,
    unassignedProjectNames: Array.from(unassignedProjectNames),
    newPayees: newPayeeCount,
    newPayeeNames: Array.from(newPayeeNames),
    assignedProjects: assignedCount,
    matchedPayees: matchedPayeeCount,
  };
}, [validationResults, categorizeTransactions.newRecords]);
```

---

## Step 3: Replace the Preview Step UI

Replace the entire `{step === 'preview' && (` section with this new design:

```typescript
{step === 'preview' && (
  <div className="flex flex-col h-[calc(90vh-120px)]">
    {/* Stepper */}
    <ImportStepper currentStep={step} />

    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
      
      {/* Main Summary Card - The Key Message */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">YTD Import Summary</h3>
            <p className="text-sm text-blue-600 mt-1">
              {csvData.length} transactions in file
            </p>
          </div>
        </div>
        
        {/* The Breakdown - Visual Flow */}
        <div className="mt-4 flex items-center gap-3 text-sm">
          <div className="bg-white rounded-lg px-4 py-3 border border-blue-200 text-center min-w-[100px]">
            <div className="text-2xl font-bold text-gray-400">{categorizeTransactions.alreadyImported.length}</div>
            <div className="text-gray-500 text-xs">Already Imported</div>
          </div>
          
          <div className="text-gray-400 text-xl">→</div>
          
          <div className="bg-white rounded-lg px-4 py-3 border-2 border-green-400 text-center min-w-[100px] shadow-sm">
            <div className="text-2xl font-bold text-green-600">{categorizeTransactions.newRecords.length}</div>
            <div className="text-green-700 text-xs font-medium">New to Import</div>
          </div>
          
          <div className="ml-auto flex gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{categorizeTransactions.newExpenses.length}</div>
              <div className="text-blue-600 text-xs">Expenses</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-600">{categorizeTransactions.newRevenues.length}</div>
              <div className="text-emerald-600 text-xs">Revenues</div>
            </div>
          </div>
        </div>
      </div>

      {/* New Records Status - Only show if there ARE new records */}
      {categorizeTransactions.newRecords.length > 0 && (
        <div className={cn(
          "rounded-lg border p-4",
          newRecordIssues.unassignedProjects === 0 && newRecordIssues.newPayees === 0
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        )}>
          <h4 className={cn(
            "font-medium mb-3 flex items-center gap-2",
            newRecordIssues.unassignedProjects === 0 && newRecordIssues.newPayees === 0
              ? "text-green-800"
              : "text-amber-800"
          )}>
            {newRecordIssues.unassignedProjects === 0 && newRecordIssues.newPayees === 0 ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                All {categorizeTransactions.newRecords.length} new records ready to import
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5" />
                New Records Summary
              </>
            )}
          </h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Project Assignment Status */}
            <div className="space-y-1">
              <div className="font-medium text-gray-700">Project Assignment</div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{newRecordIssues.assignedProjects} assigned to projects</span>
              </div>
              {newRecordIssues.unassignedProjects > 0 && (
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>{newRecordIssues.unassignedProjects} → 000-UNASSIGNED</span>
                </div>
              )}
            </div>
            
            {/* Payee Status */}
            <div className="space-y-1">
              <div className="font-medium text-gray-700">Payee Status</div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{newRecordIssues.matchedPayees} matched to existing</span>
              </div>
              {newRecordIssues.newPayees > 0 && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Info className="h-4 w-4" />
                  <span>{newRecordIssues.newPayees} will be auto-created</span>
                </div>
              )}
            </div>
          </div>

          {/* Expandable Details */}
          {(newRecordIssues.unassignedProjects > 0 || newRecordIssues.newPayees > 0) && (
            <Collapsible className="mt-3">
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <ChevronRight className="h-3 w-3" />
                View details
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-xs space-y-2">
                {newRecordIssues.unassignedProjects > 0 && (
                  <div>
                    <span className="font-medium">Unassigned project codes: </span>
                    <span className="text-gray-600">
                      {newRecordIssues.unassignedProjectNames.slice(0, 5).join(', ')}
                      {newRecordIssues.unassignedProjectNames.length > 5 && 
                        ` +${newRecordIssues.unassignedProjectNames.length - 5} more`}
                    </span>
                  </div>
                )}
                {newRecordIssues.newPayees > 0 && (
                  <div>
                    <span className="font-medium">New payees: </span>
                    <span className="text-gray-600">
                      {newRecordIssues.newPayeeNames.slice(0, 5).join(', ')}
                      {newRecordIssues.newPayeeNames.length > 5 && 
                        ` +${newRecordIssues.newPayeeNames.length - 5} more`}
                    </span>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* No New Records Message */}
      {categorizeTransactions.newRecords.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h4 className="font-medium text-gray-700">All caught up!</h4>
          <p className="text-sm text-gray-500 mt-1">
            All {csvData.length} transactions in this file are already in the system.
          </p>
        </div>
      )}

      {/* Tabs - Simplified */}
      {categorizeTransactions.newRecords.length > 0 && (
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              New Records ({categorizeTransactions.newRecords.length})
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Already Imported ({categorizeTransactions.alreadyImported.length})
            </TabsTrigger>
          </TabsList>

          {/* New Records Tab */}
          <TabsContent value="new" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-medium">Date</TableHead>
                    <TableHead className="text-xs font-medium">Type</TableHead>
                    <TableHead className="text-xs font-medium">Amount</TableHead>
                    <TableHead className="text-xs font-medium">Name</TableHead>
                    <TableHead className="text-xs font-medium">Project</TableHead>
                    <TableHead className="text-xs font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorizeTransactions.newRecords.slice(0, 10).map((row, index) => {
                    const isRevenue = row['Transaction type'] === 'Invoice';
                    const hasProject = row['Project/WO #']?.trim();
                    const projectExists = hasProject && validationResults?.projects?.some(
                      (p: any) => p.project_number?.toLowerCase() === hasProject.toLowerCase()
                    );
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="text-xs py-2">{row.Date}</TableCell>
                        <TableCell className="text-xs py-2">
                          <Badge 
                            variant={isRevenue ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {isRevenue ? 'Revenue' : 'Expense'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-2 font-mono">{row.Amount}</TableCell>
                        <TableCell className="text-xs py-2 max-w-[150px] truncate">{row.Name}</TableCell>
                        <TableCell className="text-xs py-2">
                          {hasProject ? (
                            <span className={projectExists ? "text-gray-900" : "text-amber-600"}>
                              {hasProject}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          {projectExists ? (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {categorizeTransactions.newRecords.length > 10 && (
                <div className="text-xs text-gray-500 p-2 text-center border-t bg-gray-50">
                  Showing 10 of {categorizeTransactions.newRecords.length} new records
                </div>
              )}
            </div>
          </TabsContent>

          {/* Already Imported Tab */}
          <TabsContent value="existing" className="mt-4">
            <div className="bg-gray-50 border rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                These {categorizeTransactions.alreadyImported.length} transactions are already in your system 
                and will be skipped automatically. This is normal for YTD imports.
              </p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-medium">Date</TableHead>
                    <TableHead className="text-xs font-medium">Type</TableHead>
                    <TableHead className="text-xs font-medium">Amount</TableHead>
                    <TableHead className="text-xs font-medium">Name</TableHead>
                    <TableHead className="text-xs font-medium">Project</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorizeTransactions.alreadyImported.slice(0, 10).map((row, index) => {
                    const isRevenue = row['Transaction type'] === 'Invoice';
                    return (
                      <TableRow key={index} className="text-gray-400">
                        <TableCell className="text-xs py-2">{row.Date}</TableCell>
                        <TableCell className="text-xs py-2">
                          <Badge variant="outline" className="text-xs opacity-50">
                            {isRevenue ? 'Revenue' : 'Expense'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-2 font-mono">{row.Amount}</TableCell>
                        <TableCell className="text-xs py-2 max-w-[150px] truncate">{row.Name}</TableCell>
                        <TableCell className="text-xs py-2">{row['Project/WO #'] || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {categorizeTransactions.alreadyImported.length > 10 && (
                <div className="text-xs text-gray-500 p-2 text-center border-t bg-gray-50">
                  Showing 10 of {categorizeTransactions.alreadyImported.length} already imported
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Reconciliation - Only show if there's a meaningful difference */}
      {validationResults?.reconciliation && 
       !validationResults.reconciliation.isAligned && 
       Math.abs(validationResults.reconciliation.difference) > 10 && (
        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium text-sm">
                  Reconciliation variance: {formatCurrency(Math.abs(validationResults.reconciliation.difference))}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-amber-600" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-amber-50 border border-amber-200 border-t-0 rounded-b-lg p-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-amber-700">System total:</span>
                <span className="font-medium">{formatCurrency(validationResults.reconciliation.totalExistingNonLaborExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700">File total (matched):</span>
                <span className="font-medium">{formatCurrency(validationResults.reconciliation.totalDuplicateAmount)}</span>
              </div>
              <p className="text-xs text-amber-600 pt-2 border-t border-amber-200">
                This may indicate some transactions were modified after import. 
                Review if the difference is significant.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

    </div>

    {/* Sticky Footer */}
    <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex items-center justify-between">
      <Button variant="outline" onClick={() => setStep('upload')}>
        Back
      </Button>
      
      <div className="flex items-center gap-3">
        {categorizeTransactions.newRecords.length > 0 ? (
          <>
            <span className="text-sm text-gray-500">
              {categorizeTransactions.newRecords.length} new record{categorizeTransactions.newRecords.length !== 1 ? 's' : ''} will be imported
            </span>
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="min-w-[160px]"
            >
              {isImporting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Importing...
                </>
              ) : (
                <>Import {categorizeTransactions.newRecords.length} New Records</>
              )}
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-500">
              No new records to import
            </span>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </>
        )}
      </div>
    </div>
  </div>
)}
```

---

## Step 4: Remove Old Confusing Elements

Delete or comment out these old elements that are no longer needed:

1. The old `IssueSummary` component (issues for all records)
2. The old 3-tab structure (Issues / Duplicates / Preview Data)
3. The separate "Duplicate Transactions in File" sections
4. The override checkboxes for duplicates (YTD flow means duplicates are always skipped)

---

## Step 5: Update the Import Summary Card in Upload Step

When on the upload step, keep it simple:

```typescript
{step === 'upload' && (
  <div className="space-y-4">
    <ImportStepper currentStep={step} />
    
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onClick={() => document.getElementById('expense-csv-file-input')?.click()}
    >
      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <p className="text-lg font-medium text-gray-700">
        Drop your QuickBooks YTD export here
      </p>
      <p className="text-sm text-gray-500 mt-2">
        We'll automatically detect which transactions are new
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
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <FileText className="h-4 w-4" />
        <span>{selectedFile.name}</span>
        <span className="text-gray-400">({Math.round(selectedFile.size / 1024)} KB)</span>
      </div>
    )}
    
    {isUploading && (
      <div className="text-center py-4">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Analyzing transactions...</p>
      </div>
    )}

    {errors.length > 0 && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <ul className="list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    )}
  </div>
)}
```

---

## Step 6: Ensure Required Imports

Make sure these imports are at the top of the file:

```typescript
import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Upload, FileText, AlertCircle, CheckCircle2, X, 
  ChevronDown, ChevronRight, Info 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
```

---

## Verification Checklist

After implementation, verify:

- [ ] Upload step shows "Drop your QuickBooks YTD export here"
- [ ] Main summary shows: X in file → Y already imported → Z new
- [ ] New records count matches the actual new (non-duplicate) records
- [ ] Issues (unassigned projects, new payees) are calculated ONLY for new records
- [ ] "Already Imported" tab shows greyed-out records with explanation
- [ ] "New Records" tab shows the actual records that will be imported
- [ ] Import button says "Import X New Records" (not total file count)
- [ ] When all records are duplicates, shows "All caught up!" message
- [ ] Reconciliation only shows if there's a meaningful variance (>$10)

---

## Summary of Changes

| Before | After |
|--------|-------|
| "78 Duplicates" (negative framing) | "78 Already Imported ✓" (expected) |
| Issues for all 94 records | Issues only for new records |
| 3 confusing tabs | 2 clear tabs: New / Already Imported |
| Math scattered everywhere | Clear visual flow: Total → Existing → New |
| Reconciliation always visible | Only shown if variance > $10 |
| "Import 7 Records" | "Import 7 New Records" |
| Duplicate override checkboxes | Removed (YTD always skips duplicates) |

---

## Build and Test

```bash
npm run build
npm run dev
```

Test with a YTD file that has both new and existing records.
