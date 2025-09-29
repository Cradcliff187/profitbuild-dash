import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface DetailField {
  label: string;
  value: any;
  type?: 'text' | 'badge' | 'date' | 'currency' | 'boolean';
  variant?: string;
}

interface DetailSection {
  title: string;
  fields: DetailField[];
}

interface EntityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  sections: DetailSection[];
  onEdit?: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
}

export const EntityDetailsModal: React.FC<EntityDetailsModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  sections,
  onEdit,
  onDelete,
  children
}) => {
  const renderFieldValue = (field: DetailField) => {
    if (!field.value && field.value !== 0 && field.value !== false) {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (field.type) {
      case 'badge':
        return <Badge variant={field.variant as any}>{field.value}</Badge>;
      case 'date':
        return new Date(field.value).toLocaleDateString();
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(field.value);
      case 'boolean':
        return field.value ? 'Yes' : 'No';
      default:
        return field.value;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {section.title}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="space-y-1">
                    <label className="text-sm font-medium">{field.label}</label>
                    <div className="text-sm">
                      {renderFieldValue(field)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {children && (
            <div className="border-t pt-4">
              {children}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Item</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this item? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};