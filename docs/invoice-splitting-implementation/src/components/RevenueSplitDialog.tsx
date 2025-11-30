/**
 * @file RevenueSplitDialog.tsx
 * @description Dialog component for splitting invoices/revenues across multiple projects
 * 
 * Pattern mirrors existing src/components/ExpenseSplitDialog.tsx
 * Uses Sheet component for slide-out panel UX
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Split, AlertCircle, CheckCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Project } from '@/types/project';
import { ProjectRevenue, RevenueSplitFormInput } from '@/types/revenue';
import {
  createRevenueSplits,
  updateRevenueSplits,
  deleteRevenueSplits,
  getRevenueSplits,
  validateSplitTotal,
  calculateSplitPercentage,
} from '@/utils/revenueSplits';

// ============================================================================
// INTERFACES
// ============================================================================

interface RevenueSplitDialogProps {
  revenue: ProjectRevenue | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const RevenueSplitDialog: React.FC<RevenueSplitDialogProps> = ({
  revenue,
  open,
  onClose,
  onSuccess,
}) => {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [splits, setSplits] = useState<RevenueSplitFormInput[]>([
    { project_id: '', split_amount: '', notes: '' },
    { project_id: '', split_amount: '', notes: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('category', 'construction')
          .order('project_number');

        if (error) throw error;

        const transformedProjects = (data || []).map(project => ({
          ...project,
          start_date: project.start_date ? new Date(project.start_date) : undefined,
          end_date: project.end_date ? new Date(project.end_date) : undefined,
          created_at: new Date(project.created_at),
          updated_at: new Date(project.updated_at),
        }));
        setProjects(transformedProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects',
          variant: 'destructive',
        });
      }
    };

    if (open) {
      loadProjects();
    }
  }, [open, toast]);

  // Load existing splits when dialog opens
  useEffect(() => {
    if (open && revenue?.is_split && revenue?.id) {
      loadExistingSplits();
    } else if (open && revenue && !revenue.is_split) {
      // Reset to default 2 empty splits for new split
      setSplits([
        { project_id: '', split_amount: '', notes: '' },
        { project_id: '', split_amount: '', notes: '' },
      ]);
      setValidationError(null);
    }
  }, [open, revenue]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadExistingSplits = async () => {
    if (!revenue?.id) return;

    try {
      const existingSplits = await getRevenueSplits(revenue.id);
      if (existingSplits.length > 0) {
        setSplits(
          existingSplits.map(split => ({
            project_id: split.project_id,
            split_amount: split.split_amount.toString(),
            notes: split.notes || '',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading splits:', error);
    }
  };

  // ============================================================================
  // SPLIT MANAGEMENT
  // ============================================================================

  const addSplit = () => {
    setSplits([...splits, { project_id: '', split_amount: '', notes: '' }]);
  };

  const removeSplit = (index: number) => {
    if (splits.length > 2) {
      const newSplits = splits.filter((_, i) => i !== index);
      setSplits(newSplits);
      validateSplits(newSplits);
    }
  };

  const updateSplit = (
    index: number,
    field: keyof RevenueSplitFormInput,
    value: string
  ) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);

    // Validate on amount or project change
    if (field === 'split_amount' || field === 'project_id') {
      validateSplits(newSplits);
    }
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateSplits = (currentSplits: RevenueSplitFormInput[]): boolean => {
    if (!revenue) return false;

    // Check all splits have projects and amounts
    const hasEmptyFields = currentSplits.some(
      s => !s.project_id || !s.split_amount || parseFloat(s.split_amount) <= 0
    );
    if (hasEmptyFields) {
      setValidationError('All splits must have a project and valid amount.');
      return false;
    }

    // Check for duplicate projects
    const projectIds = currentSplits.map(s => s.project_id);
    const hasDuplicates = projectIds.length !== new Set(projectIds).size;
    if (hasDuplicates) {
      setValidationError('Cannot split to the same project multiple times.');
      return false;
    }

    // Check total matches revenue amount
    const splitAmounts = currentSplits.map(s => parseFloat(s.split_amount) || 0);
    const validation = validateSplitTotal(revenue.amount, splitAmounts);
    if (!validation.valid) {
      setValidationError(validation.error || 'Split amounts must equal revenue total');
      return false;
    }

    setValidationError(null);
    return true;
  };

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const calculateRemaining = (): number => {
    if (!revenue) return 0;
    const allocated = splits.reduce(
      (sum, s) => sum + (parseFloat(s.split_amount) || 0),
      0
    );
    return revenue.amount - allocated;
  };

  const getAvailableProjects = (currentIndex: number) => {
    const selectedIds = splits
      .map((s, i) => (i !== currentIndex ? s.project_id : null))
      .filter(Boolean);
    return projects.filter(p => !selectedIds.includes(p.id));
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSave = async () => {
    if (!revenue || !validateSplits(splits)) return;

    setLoading(true);
    try {
      const splitInputs = splits.map(s => ({
        project_id: s.project_id,
        split_amount: parseFloat(s.split_amount),
        notes: s.notes || undefined,
      }));

      let result;
      if (revenue.is_split) {
        // Update existing splits
        result = await updateRevenueSplits(revenue.id, splitInputs);
      } else {
        // Create new splits
        result = await createRevenueSplits(revenue.id, splitInputs);
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: 'Success',
        description: `Invoice split across ${splits.length} projects`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving splits:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save splits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSplits = async () => {
    if (!revenue?.id) return;

    setLoading(true);
    try {
      const result = await deleteRevenueSplits(revenue.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: 'Success',
        description: 'Invoice splits removed',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error removing splits:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to remove splits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!revenue) return null;

  const remaining = calculateRemaining();
  const isValid =
    splits.length >= 2 && Math.abs(remaining) <= 0.01 && !validationError;

  return (
    <Sheet open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[700px] flex flex-col p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            {revenue.is_split ? 'Manage' : 'Split'} Invoice
          </SheetTitle>
          <SheetDescription>
            Allocate this {formatCurrency(revenue.amount)} invoice across multiple
            projects
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Invoice Details */}
            <div className="rounded-md bg-muted p-3 space-y-1">
              <div className="text-sm font-medium">Invoice Details</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Invoice #: </span>
                  <span>{revenue.invoice_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount: </span>
                  <span className="font-mono font-medium">
                    {formatCurrency(revenue.amount)}
                  </span>
                </div>
              </div>
              {revenue.description && (
                <div className="text-sm text-muted-foreground truncate">
                  {revenue.description}
                </div>
              )}
            </div>

            {/* Validation Error */}
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Remaining Amount Indicator */}
            <div
              className={`rounded-md p-3 ${
                Math.abs(remaining) <= 0.01
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {Math.abs(remaining) <= 0.01 ? (
                    <span className="flex items-center gap-1 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Fully allocated
                    </span>
                  ) : (
                    <span className="text-yellow-700">
                      Remaining: {formatCurrency(remaining)}
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">
                  Total: {formatCurrency(revenue.amount)}
                </span>
              </div>
            </div>

            {/* Split Entries */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Project Allocations</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSplit}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Split
                </Button>
              </div>

              {splits.map((split, index) => (
                <div
                  key={index}
                  className="border rounded-md p-3 space-y-3 bg-background"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Split {index + 1}
                    </span>
                    {splits.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSplit(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`project-${index}`} className="text-xs">
                        Project *
                      </Label>
                      <Select
                        value={split.project_id}
                        onValueChange={value =>
                          updateSplit(index, 'project_id', value)
                        }
                      >
                        <SelectTrigger id={`project-${index}`} className="h-9">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableProjects(index).map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.project_number} - {project.project_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`amount-${index}`} className="text-xs">
                        Amount *
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          $
                        </span>
                        <Input
                          id={`amount-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={split.split_amount}
                          onChange={e =>
                            updateSplit(index, 'split_amount', e.target.value)
                          }
                          className="h-9 pl-7"
                        />
                      </div>
                      {split.split_amount && revenue.amount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {calculateSplitPercentage(
                            parseFloat(split.split_amount) || 0,
                            revenue.amount
                          ).toFixed(1)}
                          %
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`notes-${index}`} className="text-xs">
                      Notes (optional)
                    </Label>
                    <Textarea
                      id={`notes-${index}`}
                      placeholder="Add notes for this allocation..."
                      value={split.notes}
                      onChange={e => updateSplit(index, 'notes', e.target.value)}
                      className="h-16 resize-none text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 shrink-0 bg-background">
          <div className="flex items-center justify-between">
            {revenue.is_split && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemoveSplits}
                disabled={loading}
                className="text-destructive hover:text-destructive"
              >
                Remove All Splits
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={loading || !isValid}
              >
                {loading ? 'Saving...' : 'Save Splits'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RevenueSplitDialog;
