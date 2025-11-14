import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Payee } from '@/types/payee';

interface PayeeDetailsModalProps {
  payee: Payee | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (payee: Payee) => void;
  onDelete: (payeeId: string) => void;
}

export const PayeeDetailsModal: React.FC<PayeeDetailsModalProps> = ({
  payee,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!payee) return null;

  const renderFieldValue = (field: any) => {
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

  const getPayeeTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'subcontractor': return 'default';
      case 'supplier': return 'secondary';
      case 'employee': return 'outline';
      case 'other': return 'outline';
      default: return 'secondary';
    }
  };

  const isInsuranceExpiringSoon = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    const expiry = new Date(expirationDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry <= thirtyDaysFromNow;
  };

  const sections = [
    {
      title: 'Basic Information',
      fields: [
        { label: 'Payee Name', value: payee.payee_name },
        { label: 'Full Name', value: payee.full_name },
        { 
          label: 'Payee Type', 
          value: payee.payee_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'badge' as const,
          variant: getPayeeTypeBadgeVariant(payee.payee_type || '')
        },
        { 
          label: 'Status', 
          value: payee.is_active ? 'Active' : 'Inactive',
          type: 'badge' as const,
          variant: payee.is_active ? 'default' : 'secondary'
        }
      ]
    },
    {
      title: 'Contact Information',
      fields: [
        { label: 'Email', value: payee.email },
        { label: 'Phone Numbers', value: payee.phone_numbers },
        { label: 'Billing Address', value: payee.billing_address }
      ]
    },
    {
      title: 'Business Details',
      fields: [
        { 
          label: 'Hourly Rate', 
          value: payee.hourly_rate,
          type: 'currency' as const
        },
        { label: 'Account Number', value: payee.account_number },
        { label: 'License Number', value: payee.license_number },
        { label: 'Payment Terms', value: payee.terms }
      ]
    },
    {
      title: 'Services & Capabilities',
      fields: [
        { 
          label: 'Provides Labor', 
          value: payee.provides_labor,
          type: 'boolean' as const
        },
        { 
          label: 'Provides Materials', 
          value: payee.provides_materials,
          type: 'boolean' as const
        },
        { 
          label: 'Permit Issuer', 
          value: payee.permit_issuer,
          type: 'boolean' as const
        },
        { 
          label: 'Internal Employee', 
          value: payee.is_internal,
          type: 'boolean' as const
        },
        { 
          label: 'Requires 1099', 
          value: payee.requires_1099,
          type: 'boolean' as const
        }
      ]
    },
    {
      title: 'Insurance & Compliance',
      fields: [
        { 
          label: 'Insurance Expires', 
          value: payee.insurance_expires,
          type: 'date' as const
        },
        ...(payee.insurance_expires && isInsuranceExpiringSoon(payee.insurance_expires) 
          ? [{
              label: 'Insurance Status',
              value: 'Expiring Soon',
              type: 'badge' as const,
              variant: 'destructive'
            }] 
          : []
        )
      ]
    },
    {
      title: 'System Information',
      fields: [
        { label: 'QuickBooks ID', value: payee.quickbooks_vendor_id },
        { 
          label: 'Last Synced', 
          value: payee.last_synced_at,
          type: 'date' as const
        },
        { 
          label: 'Created Date', 
          value: payee.created_at,
          type: 'date' as const
        },
        { 
          label: 'Last Updated', 
          value: payee.updated_at,
          type: 'date' as const
        }
      ]
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
          <SheetTitle>{payee.payee_name}</SheetTitle>
          {payee.full_name && (
            <SheetDescription>{payee.full_name}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">{field.label}</label>
                      <div className="text-sm">
                        {renderFieldValue(field)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between gap-3 px-6 py-4 border-t bg-background">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Payee</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this payee? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(payee.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={() => onEdit(payee)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Payee
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};