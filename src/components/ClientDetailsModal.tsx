import React from 'react';
import { EntityDetailsModal } from './EntityDetailsModal';
import { Client, CLIENT_TYPES } from '@/types/client';
import { Badge } from '@/components/ui/badge';

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
    <EntityDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      title={client.client_name}
      subtitle={client.company_name}
      sections={sections}
      onEdit={() => onEdit(client)}
      onDelete={() => onDelete(client.id)}
    />
  );
};