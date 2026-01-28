import type { ContractFieldValues, ContractFieldValidation } from '@/types/contract';
import { REQUIRED_CONTRACT_FIELDS } from '@/constants/contractFields';

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => (current as Record<string, unknown>)?.[key], obj);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^[\d\s\-\(\)\.+]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function validateContractFields(fieldValues: ContractFieldValues): ContractFieldValidation {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  for (const fieldPath of REQUIRED_CONTRACT_FIELDS) {
    const value = getNestedValue(fieldValues as unknown as Record<string, unknown>, fieldPath);
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      errors[fieldPath] = 'This field is required';
    }
  }

  if (fieldValues.subcontractor.email && !isValidEmail(fieldValues.subcontractor.email)) {
    errors['subcontractor.email'] = 'Invalid email format';
  }

  if (fieldValues.subcontractor.phone && !isValidPhone(fieldValues.subcontractor.phone)) {
    warnings['subcontractor.phone'] = 'Phone format may be invalid';
  }

  if (fieldValues.contract.subcontractPrice <= 0) {
    errors['contract.subcontractPrice'] = 'Subcontract price must be greater than zero';
  }

  const startDate = new Date(fieldValues.project.startDate);
  const endDate = new Date(fieldValues.project.endDate);
  if (isNaN(startDate.getTime())) errors['project.startDate'] = 'Invalid start date';
  if (isNaN(endDate.getTime())) errors['project.endDate'] = 'Invalid end date';
  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
    warnings['project.endDate'] = 'End date is before start date';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
