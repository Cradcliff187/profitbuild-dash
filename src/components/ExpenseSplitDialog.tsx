import React, { useState, useEffect } from 'react';
import { Plus, X, AlertCircle, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { createExpenseSplits, updateExpenseSplits, getExpenseSplits, validateSplitTotal } from '@/utils/expenseSplits';
import { Expense } from '@/types/expense';

interface SplitInput {
  project_id: string;
  split_amount: string;
  notes: string;
}

interface ExpenseSplitDialogProps {
  expense: Expense | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExpenseSplitDialog: React.FC<ExpenseSplitDialogProps> = ({
  expense,
  open,
  onClose,
  onSuccess
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [splits, setSplits] = useState<SplitInput[]>([{ project_id: '', split_amount: '', notes: '' }]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProjects();
      if (expense?.is_split) {
        loadExistingSplits();
      } else {
        setSplits([{ project_id: '', split_amount: '', notes: '' }]);
      }
    }
  }, [open, expense]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, project_number')
        .neq('project_number', '000-UNASSIGNED')
        .neq('project_number', 'SYS-000')
        .order('project_name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects.",
        variant: "destructive"
      });
    }
  };

  const loadExistingSplits = async () => {
    if (!expense?.id) return;

    try {
      const existingSplits = await getExpenseSplits(expense.id);
      if (existingSplits.length > 0) {
        setSplits(existingSplits.map(split => ({
          project_id: split.project_id,
          split_amount: split.split_amount.toString(),
          notes: split.notes || ''
        })));
      }
    } catch (error) {
      console.error('Error loading splits:', error);
    }
  };

  const addSplit = () => {
    setSplits([...splits, { project_id: '', split_amount: '', notes: '' }]);
  };

  const removeSplit = (index: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== index));
    }
  };

  const updateSplit = (index: number, field: keyof SplitInput, value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
    
    // Validate on change
    if (field === 'split_amount' || field === 'project_id') {
      validateSplits(newSplits);
    }
  };

  const validateSplits = (currentSplits: SplitInput[]): boolean => {
    if (!expense) return false;

    // Check all splits have projects and amounts
    const hasEmptyFields = currentSplits.some(s => !s.project_id || !s.split_amount || parseFloat(s.split_amount) <= 0);
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

    // Check total matches expense amount
    const amounts = currentSplits.map(s => parseFloat(s.split_amount));
    const validation = validateSplitTotal(expense.amount, amounts);
    
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid split amounts');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const calculateRemaining = (): number => {
    if (!expense) return 0;
    const total = splits.reduce((sum, split) => {
      const amount = parseFloat(split.split_amount) || 0;
      return sum + amount;
    }, 0);
    return expense.amount - total;
  };

  const calculatePercentage = (amount: string): number => {
    if (!expense || !amount) return 0;
    return (parseFloat(amount) / expense.amount) * 100;
  };

  const handleSubmit = async () => {
    if (!expense) return;

    if (!validateSplits(splits)) {
      return;
    }

    setLoading(true);
    try {
      const splitData = splits.map(s => ({
        project_id: s.project_id,
        split_amount: parseFloat(s.split_amount),
        notes: s.notes || undefined
      }));

      let result;
      if (expense.is_split) {
        result = await updateExpenseSplits(expense.id, splitData);
      } else {
        result = await createExpenseSplits(expense.id, splitData);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save splits');
      }

      toast({
        title: "Success",
        description: `Expense ${expense.is_split ? 'splits updated' : 'split'} successfully.`
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving splits:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save splits',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!expense) return null;

  const remaining = calculateRemaining();
  const isValid = splits.length >= 2 && Math.abs(remaining) <= 0.01 && !validationError;

  // Get available projects (exclude already selected ones for each dropdown)
  const getAvailableProjects = (currentIndex: number) => {
    const selectedIds = splits
      .map((s, i) => i !== currentIndex ? s.project_id : null)
      .filter(Boolean);
    return projects.filter(p => !selectedIds.includes(p.id));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense.is_split ? 'Manage' : 'Split'} Expense</DialogTitle>
          <DialogDescription>
            Allocate this {formatCurrency(expense.amount)} expense across multiple projects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expense Details */}
          <div className="rounded-md bg-muted p-3 space-y-1">
            <div className="text-sm font-medium">Expense Details</div>
            <div className="text-xs text-muted-foreground">
              {expense.description || 'No description'}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{expense.category}</Badge>
              <span className="font-mono font-medium">{formatCurrency(expense.amount)}</span>
            </div>
          </div>

          {/* Splits */}
          <div className="space-y-3">
            {splits.map((split, index) => (
              <div key={index} className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Split {index + 1}</span>
                  {splits.length > 1 && (
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
                    <Label htmlFor={`project-${index}`}>Project *</Label>
                    <Select
                      value={split.project_id}
                      onValueChange={(value) => updateSplit(index, 'project_id', value)}
                    >
                      <SelectTrigger id={`project-${index}`}>
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
                    <Label htmlFor={`amount-${index}`}>Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        id={`amount-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={split.split_amount}
                        onChange={(e) => updateSplit(index, 'split_amount', e.target.value)}
                        className="pl-9 text-sm"
                      />
                    </div>
                    {split.split_amount && (
                      <div className="text-xs text-muted-foreground">
                        {calculatePercentage(split.split_amount).toFixed(1)}% of total
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`notes-${index}`}>Notes (optional)</Label>
                  <Textarea
                    id={`notes-${index}`}
                    placeholder="Add notes about this split..."
                    value={split.notes}
                    onChange={(e) => updateSplit(index, 'notes', e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSplit}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Split
            </Button>
          </div>

          {/* Remaining Amount Indicator */}
          <div className={`rounded-md p-3 ${
            Math.abs(remaining) <= 0.01 
              ? 'bg-success/10 border border-success/20' 
              : remaining > 0 
                ? 'bg-warning/10 border border-warning/20'
                : 'bg-destructive/10 border border-destructive/20'
          }`}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Remaining to allocate:</span>
              <span className={`font-mono font-bold ${
                Math.abs(remaining) <= 0.01 
                  ? 'text-success' 
                  : remaining > 0 
                    ? 'text-warning'
                    : 'text-destructive'
              }`}>
                {formatCurrency(remaining)}
              </span>
            </div>
            {Math.abs(remaining) <= 0.01 && (
              <div className="text-xs text-success mt-1">
                ✓ Split amounts match expense total
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading}>
            {loading ? 'Saving...' : expense.is_split ? 'Update Splits' : 'Create Splits'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
