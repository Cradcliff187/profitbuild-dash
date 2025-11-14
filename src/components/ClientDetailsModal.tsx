import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Client, CLIENT_TYPES } from '@/types/client';

interface ClientDetailsModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
}

export const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({
  client,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!client) return null;

  const renderFieldValue = (field: any) => {
    if (!field.value && field.value !== 0 && field.value !== false) {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (field.type) {
      case 'badge':
        return <Badge variant={field.variant as any}>{field.value}</Badge>;
      case 'date':
        return new Date(field.value).toLocaleDateString();
      case 'boolean':
        return field.value ? 'Yes' : 'No';
      default:
        return field.value;
    }
  };

  const getClientTypeLabel = (type: string) => {
    return CLIENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getClientTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'commercial': return 'default';
      case 'residential': return 'secondary';
      case 'government': return 'outline';
      case 'nonprofit': return 'outline';
      default: return 'secondary';
    }
  };

  const sections = [
    {
      title: 'Basic Information',
      fields: [
        { label: 'Client Name', value: client.client_name },
        { label: 'Company Name', value: client.company_name },
        { label: 'Contact Person', value: client.contact_person },
        { 
          label: 'Client Type', 
          value: getClientTypeLabel(client.client_type),
          type: 'badge' as const,
          variant: getClientTypeBadgeVariant(client.client_type)
        },
        { 
          label: 'Status', 
          value: client.is_active ? 'Active' : 'Inactive',
          type: 'badge' as const,
          variant: client.is_active ? 'default' : 'secondary'
        },
        { 
          label: 'Tax Exempt', 
          value: client.tax_exempt,
          type: 'boolean' as const
        }
      ]
    },
    {
      title: 'Contact Information',
      fields: [
        { label: 'Email', value: client.email },
        { label: 'Phone', value: client.phone },
        { label: 'Billing Address', value: client.billing_address },
        { label: 'Mailing Address', value: client.mailing_address }
      ]
    },
    {
      title: 'Business Details',
      fields: [
        { label: 'Payment Terms', value: client.payment_terms },
        { label: 'QuickBooks ID', value: client.quickbooks_customer_id },
        { label: 'Notes', value: client.notes }
      ]
    },
    {
      title: 'System Information',
      fields: [
        { 
          label: 'Created Date', 
          value: client.created_at,
          type: 'date' as const
        },
        { 
          label: 'Last Updated', 
          value: client.updated_at,
          type: 'date' as const
        }
      ]
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
          <SheetTitle>{client.client_name}</SheetTitle>
          {client.company_name && (
            <SheetDescription>{client.company_name}</SheetDescription>
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
                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this client? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(client.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={() => onEdit(client)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Client
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};