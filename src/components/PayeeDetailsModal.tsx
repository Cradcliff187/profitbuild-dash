import React from 'react';
import { EntityDetailsModal } from './EntityDetailsModal';
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
    <EntityDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      title={payee.payee_name}
      subtitle={payee.full_name}
      sections={sections}
      onEdit={() => onEdit(payee)}
      onDelete={() => onDelete(payee.id)}
    />
  );
};