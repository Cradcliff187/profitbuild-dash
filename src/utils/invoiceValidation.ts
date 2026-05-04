import type { InvoiceFieldValues, InvoiceFieldValidation } from '@/types/invoice';

const REQUIRED_INVOICE_FIELDS: string[] = [
  'customer.name',
  'customer.streetAddress',
  'customer.cityStateZip',
  'project.projectNameNumber',
  'invoice.invoiceNumber',
  'invoice.invoiceDate',
  'invoice.amount',
  'invoice.amountFormatted',
  'rcg.legalName',
];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce((current: unknown, key) => (current as Record<string, unknown>)?.[key], obj);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateInvoiceFields(
  fieldValues: InvoiceFieldValues
): InvoiceFieldValidation {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  for (const fieldPath of REQUIRED_INVOICE_FIELDS) {
    const value = getNestedValue(
      fieldValues as unknown as Record<string, unknown>,
      fieldPath
    );
    const isMissing =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value === 'number' && Number.isNaN(value));
    if (isMissing) {
      errors[fieldPath] = 'This field is required';
    }
  }

  if (fieldValues.invoice.amount <= 0) {
    errors['invoice.amount'] = 'Amount must be greater than zero';
  }

  if (fieldValues.customer.email && !isValidEmail(fieldValues.customer.email)) {
    warnings['customer.email'] = 'Email format may be invalid';
  }

  if (fieldValues.invoice.dueDate && fieldValues.invoice.invoiceDate) {
    const issued = new Date(fieldValues.invoice.invoiceDate);
    const due = new Date(fieldValues.invoice.dueDate);
    if (
      !Number.isNaN(issued.getTime()) &&
      !Number.isNaN(due.getTime()) &&
      due < issued
    ) {
      warnings['invoice.dueDate'] = 'Due date is before invoice date';
    }
  }

  if (fieldValues.invoice.description && fieldValues.invoice.description.length > 1500) {
    warnings['invoice.description'] = 'Description is quite long for an invoice';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
