import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Users, X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProjectSelectorNew } from "@/components/ProjectSelectorNew";
import { ExpenseCategory, TransactionType, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from "@/types/expense";

interface ExpenseBulkActionsProps {
  selectedExpenseIds: string[];
  onSelectionChange: (selection: Set<string>) => void;
  onComplete: () => void;
}

export const ExpenseBulkActions = ({ 
  selectedExpenseIds, 
  onSelectionChange, 
  onComplete 
}: ExpenseBulkActionsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | "">("");
  const [selectedType, setSelectedType] = useState<TransactionType | "">("");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const { toast } = useToast();

  // Load projects when project dialog opens
  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("project_name");
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .in("id", selectedExpenseIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedExpenseIds.length} expenses deleted successfully`,
      });
      
      onSelectionChange(new Set());
      onComplete();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting expenses:", error);
      toast({
        title: "Error",
        description: "Failed to delete expenses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdateCategory = async () => {
    if (!selectedCategory) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ category: selectedCategory })
        .in("id", selectedExpenseIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedExpenseIds.length} expenses updated successfully`,
      });
      
      onSelectionChange(new Set());
      onComplete();
      setShowCategoryDialog(false);
      setSelectedCategory("");
    } catch (error) {
      console.error("Error updating expense categories:", error);
      toast({
        title: "Error",
        description: "Failed to update expense categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdateType = async () => {
    if (!selectedType) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ transaction_type: selectedType })
        .in("id", selectedExpenseIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedExpenseIds.length} expenses updated successfully`,
      });
      
      onSelectionChange(new Set());
      onComplete();
      setShowTypeDialog(false);
      setSelectedType("");
    } catch (error) {
      console.error("Error updating expense types:", error);
      toast({
        title: "Error",
        description: "Failed to update expense types",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkAssignProject = async () => {
    if (!selectedProject) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ project_id: selectedProject.id })
        .in("id", selectedExpenseIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedExpenseIds.length} expenses assigned to ${selectedProject.project_name}`,
      });
      
      onSelectionChange(new Set());
      onComplete();
      setShowProjectDialog(false);
      setSelectedProject(null);
    } catch (error) {
      console.error("Error assigning expenses to project:", error);
      toast({
        title: "Error",
        description: "Failed to assign expenses to project",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">{selectedExpenseIds.length} expenses selected</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  loadProjects();
                  setShowProjectDialog(true);
                }}
                disabled={isLoading}
                size="sm"
                variant="outline"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Assign Project
              </Button>

              <Button
                onClick={() => setShowCategoryDialog(true)}
                disabled={isLoading}
                size="sm"
                variant="outline"
              >
                Update Category
              </Button>

              <Button
                onClick={() => setShowTypeDialog(true)}
                disabled={isLoading}
                size="sm"
                variant="outline"
              >
                Update Type
              </Button>

              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedExpenseIds.length} selected expenses? 
              This action cannot be undone and may affect project financials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Update Dialog */}
      <AlertDialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Category</AlertDialogTitle>
            <AlertDialogDescription>
              Select the new category for {selectedExpenseIds.length} selected expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ExpenseCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkUpdateCategory}
              disabled={isLoading || !selectedCategory}
            >
              {isLoading ? "Updating..." : "Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction Type Update Dialog */}
      <AlertDialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Transaction Type</AlertDialogTitle>
            <AlertDialogDescription>
              Select the new transaction type for {selectedExpenseIds.length} selected expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as TransactionType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRANSACTION_TYPE_DISPLAY).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkUpdateType}
              disabled={isLoading || !selectedType}
            >
              {isLoading ? "Updating..." : "Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Assignment Dialog */}
      <AlertDialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign to Project</AlertDialogTitle>
            <AlertDialogDescription>
              Select the project to assign {selectedExpenseIds.length} selected expenses to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <ProjectSelectorNew
              projects={projects}
              selectedProject={selectedProject}
              onSelect={setSelectedProject}
              placeholder="Select a project..."
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkAssignProject}
              disabled={isLoading || !selectedProject}
            >
              {isLoading ? "Assigning..." : "Assign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};