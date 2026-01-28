import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ContractFieldValues, RCGInfo } from '@/types/contract';
import type { LegalFormType, USState } from '@/types/contract';
import {
  formatAgreementDate,
  formatProjectDate,
  formatCurrency,
  formatProjectNameNumber,
  generateContractNumber,
} from '@/utils/contractFormatters';

interface UseContractDataParams {
  projectId: string;
  estimateId?: string;
  quoteId?: string;
  payeeId: string;
}

interface UseContractDataResult {
  fieldValues: ContractFieldValues | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Payee row with contract-related columns (from migration) */
interface PayeeWithContractFields {
  payee_name: string;
  email?: string | null;
  phone_numbers?: string | null;
  billing_address?: string | null;
  contact_name?: string | null;
  contact_title?: string | null;
  legal_form?: string | null;
  state_of_formation?: string | null;
}

export function useContractData({
  projectId,
  estimateId,
  quoteId,
  payeeId,
}: UseContractDataParams): UseContractDataResult {
  const [fieldValues, setFieldValues] = useState<ContractFieldValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId || !payeeId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const [
        projectResult,
        payeeResult,
        estimateResult,
        quoteResult,
        settingsResult,
        existingContractsResult,
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_number, project_name, address, start_date, end_date, client_id, client_name')
          .eq('id', projectId)
          .single(),
        supabase
          .from('payees')
          .select('payee_name, email, phone_numbers, billing_address, contact_name, contact_title, legal_form, state_of_formation')
          .eq('id', payeeId)
          .single(),
        estimateId
          ? supabase.from('estimates').select('total_amount').eq('id', estimateId).single()
          : Promise.resolve({ data: null, error: null }),
        quoteId
          ? supabase.from('quotes').select('total_amount').eq('id', quoteId).single()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('company_settings').select('setting_key, setting_value'),
        supabase.from('contracts').select('contract_number').eq('project_id', projectId),
      ]);

      if (projectResult.error) throw new Error(`Project: ${projectResult.error.message}`);
      if (payeeResult.error) throw new Error(`Payee: ${payeeResult.error.message}`);
      if (settingsResult.error) throw new Error(`Settings: ${settingsResult.error.message}`);

      const project = projectResult.data as {
        project_number: string | null;
        project_name: string | null;
        address: string | null;
        start_date: string | null;
        end_date: string | null;
        client_name: string | null;
      };
      const payee = payeeResult.data as PayeeWithContractFields | null;
      const estimate = estimateResult.data as { total_amount?: number } | null;
      const quote = quoteResult.data as { total_amount?: number } | null;
      const settings = (settingsResult.data || []) as { setting_key: string; setting_value: string }[];
      const existingNumbers = ((existingContractsResult.data || []) as { contract_number: string }[]).map(
        (c) => c.contract_number
      );

      const settingsMap = new Map(settings.map((s) => [s.setting_key, s.setting_value]));
      const rcg: RCGInfo = {
        legalName: settingsMap.get('company_legal_name') ?? 'RCG LLC, a Kentucky limited liability company',
        displayName: settingsMap.get('company_display_name') ?? 'Radcliff Construction Group, LLC',
        address: settingsMap.get('company_address') ?? '23 Erlanger Road, Erlanger, KY 41017',
        phone: settingsMap.get('company_phone') ?? '(859) 802-0746',
        email: settingsMap.get('company_email') ?? 'matt@radcliffcg.com',
        website: settingsMap.get('company_website') ?? 'teamradcliff.com',
        signatoryName: settingsMap.get('signatory_name') ?? 'Matt Radcliff',
        signatoryTitle: settingsMap.get('signatory_title') ?? 'President/Owner',
      };

      const clientName = project?.client_name ?? '';
      const subcontractPrice = Number(quote?.total_amount ?? estimate?.total_amount ?? 0);

      const values: ContractFieldValues = {
        subcontractor: {
          company: payee?.payee_name ?? '',
          legalForm: (payee?.legal_form as LegalFormType) ?? 'LLC',
          stateOfFormation: (payee?.state_of_formation as USState) ?? 'KY',
          contactName: payee?.contact_name ?? '',
          contactTitle: payee?.contact_title ?? '',
          phone: payee?.phone_numbers ?? '',
          email: payee?.email ?? '',
          address: payee?.billing_address ?? '',
          addressFormatted: payee?.billing_address ?? '',
        },
        project: {
          projectNameNumber: formatProjectNameNumber(
            project?.project_number ?? null,
            project?.project_name ?? null,
            clientName
          ),
          projectNumber: project?.project_number ?? '',
          projectName: project?.project_name ?? '',
          location: project?.address ?? '',
          propertyOwner: clientName,
          startDate: project?.start_date ? formatProjectDate(project.start_date) : '',
          endDate: project?.end_date ? formatProjectDate(project.end_date) : '',
        },
        contract: {
        subcontractNumber: '', // User enters the subcontractor's reference number manually
          subcontractPrice,
          subcontractPriceFormatted: formatCurrency(subcontractPrice),
          agreementDate: formatAgreementDate(new Date()),
          agreementDateShort: new Date().toISOString().split('T')[0],
          primeContractOwner: clientName,
          listOfExhibits: '',
          paymentTermsDays: settingsMap.get('payment_terms_days') ?? '30',
          liquidatedDamagesDaily: settingsMap.get('liquidated_damages_daily') ?? '100.00',
          lienCureDays: settingsMap.get('lien_cure_days') ?? '10',
          delayNoticeDays: settingsMap.get('delay_notice_days') ?? '3',
          noticeCureDays: settingsMap.get('notice_cure_days') ?? '7',
          defaultCureHours: settingsMap.get('default_cure_hours') ?? '48',
          insuranceCancellationNoticeDays: settingsMap.get('insurance_cancellation_notice_days') ?? '30',
          insuranceLimit1m: settingsMap.get('insurance_limit_1m') ?? '1,000,000',
          insuranceLimit2m: settingsMap.get('insurance_limit_2m') ?? '2,000,000',
          governingState: settingsMap.get('governing_state') ?? 'Kentucky',
          governingCountyState: settingsMap.get('governing_county_state') ?? 'Boone County, Kentucky',
          arbitrationLocation: settingsMap.get('arbitration_location') ?? 'Covington, Kentucky',
        },
        rcg,
      };

      setFieldValues(values);
    } catch (err) {
      console.error('Error fetching contract data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contract data');
      setFieldValues(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, estimateId, quoteId, payeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    fieldValues,
    isLoading,
    error,
    refetch: fetchData,
  };
}
