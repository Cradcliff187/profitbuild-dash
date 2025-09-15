import { useState } from "react";
import { FileText, Edit, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Estimate } from "@/types/estimate";
import { useToast } from "@/hooks/use-toast";

interface EstimatesListProps {
  estimates: Estimate[];
  onEdit: (estimate: Estimate) => void;
  onDelete: (id: string) => void;
  onView: (estimate: Estimate) => void;
  onCreateNew: () => void;
}

export const EstimatesList = ({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesListProps) => {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setEstimateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (estimateToDelete) {
      onDelete(estimateToDelete);
      toast({
        title: "Estimate Deleted",
        description: "The estimate has been successfully deleted."
      });
    }
    setDeleteDialogOpen(false);
    setEstimateToDelete(null);
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'Labor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Materials':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Equipment':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Other':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (estimates.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Estimates Yet</h3>
          <p className="text-muted-foreground mb-6">Create your first project to get started.</p>
          <Button onClick={onCreateNew}>Create First Project</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Estimates</h2>
          <p className="text-muted-foreground">{estimates.length} estimate{estimates.length === 1 ? '' : 's'} created</p>
        </div>
        <Button onClick={onCreateNew}>Create New Project</Button>
      </div>

      <div className="grid gap-6">
        {estimates.map((estimate) => (
          <Card key={estimate.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{estimate.project_name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>Client: {estimate.client_name}</span>
                    <span>•</span>
                    <span>{estimate.estimate_number}</span>
                    <span>•</span>
                    <span>{format(estimate.date_created, 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">${estimate.total_amount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">{estimate.lineItems.length} line item{estimate.lineItems.length === 1 ? '' : 's'}</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Status badge */}
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="text-sm">
                  Status: {estimate.status}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  Revision: {estimate.revision_number}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(estimate)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(estimate)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(estimate.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this estimate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};