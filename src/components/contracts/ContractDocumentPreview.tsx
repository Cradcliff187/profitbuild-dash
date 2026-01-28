import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContractFieldValues } from '@/types/contract';

interface ContractDocumentPreviewProps {
  fieldValues: ContractFieldValues;
}

function term(label: string, value: string | undefined) {
  return value ? `${label}: ${value}` : null;
}

export function ContractDocumentPreview({ fieldValues }: ContractDocumentPreviewProps) {
  const { subcontractor, project, contract, rcg } = fieldValues;
  const contactLine = [subcontractor.contactName, subcontractor.contactTitle].filter(Boolean).join(', ');

  const terms = [
    term('Payment terms (days)', contract.paymentTermsDays),
    term('Liquidated damages (daily)', contract.liquidatedDamagesDaily),
    term('Lien cure (days)', contract.lienCureDays),
    term('Delay notice (days)', contract.delayNoticeDays),
    term('Notice cure (days)', contract.noticeCureDays),
    term('Default cure (hours)', contract.defaultCureHours),
    term('Insurance cancellation notice (days)', contract.insuranceCancellationNoticeDays),
    term('Insurance limit $1M', contract.insuranceLimit1m),
    term('Insurance limit $2M', contract.insuranceLimit2m),
    term('Governing state', contract.governingState),
    term('Venue (county, state)', contract.governingCountyState),
    term('Arbitration location', contract.arbitrationLocation),
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Document Preview</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="bg-muted/30 rounded-lg p-4 font-serif text-sm leading-relaxed whitespace-pre-wrap border">
          {`SUBCONTRACTOR PROJECT AGREEMENT

AGREEMENT made this ${contract.agreementDate} between ${subcontractor.company}, a ${subcontractor.legalForm} formed under the laws of ${subcontractor.stateOfFormation} ("Subcontractor") and ${rcg.displayName} ("Contractor").

Project: ${project.projectNameNumber}
Subcontract No.: ${contract.subcontractNumber}
Location: ${project.location}
Property Owner: ${project.propertyOwner}
Project Dates: ${project.startDate || '—'} to ${project.endDate || '—'}

Subcontract Price: ${contract.subcontractPriceFormatted}

List of Exhibits: ${contract.listOfExhibits || '—'}

Subcontractor contact: ${contactLine || '—'}
Phone: ${subcontractor.phone || '—'}
E-Mail: ${subcontractor.email || '—'}

${terms.length ? `Terms & conditions\n${terms.join('\n')}` : ''}

This agreement covers the scope of work as specified in the attached documents.
`}
        </div>
      </CardContent>
    </Card>
  );
}
