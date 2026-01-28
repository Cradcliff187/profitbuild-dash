import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContractFieldValues } from '@/types/contract';

interface ContractFieldSummaryProps {
  fieldValues: ContractFieldValues;
}

function FieldRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-[1fr_1.5fr] gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="font-medium truncate" title={String(value)}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export function ContractFieldSummary({ fieldValues }: ContractFieldSummaryProps) {
  const { subcontractor, project, contract, rcg } = fieldValues;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Subcontractor Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-0">
          <FieldRow label="Company Name" value={subcontractor.company} />
          <FieldRow label="Contact Name" value={subcontractor.contactName} />
          <FieldRow label="Contact Title" value={subcontractor.contactTitle} />
          <FieldRow label="Phone Number" value={subcontractor.phone} />
          <FieldRow label="Email Address" value={subcontractor.email} />
          <FieldRow label="Physical Address" value={subcontractor.address} />
          <FieldRow label="Address (formatted)" value={subcontractor.addressFormatted} />
          <FieldRow label="Legal Form" value={subcontractor.legalForm} />
          <FieldRow label="State of Formation" value={subcontractor.stateOfFormation} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Project Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-0">
          <FieldRow label="Project Name/Number" value={project.projectNameNumber} />
          <FieldRow label="Project Number" value={project.projectNumber} />
          <FieldRow label="Project Name" value={project.projectName} />
          <FieldRow label="Location/Address" value={project.location} />
          <FieldRow label="Property Owner" value={project.propertyOwner} />
          <FieldRow label="Start Date" value={project.startDate} />
          <FieldRow label="End Date" value={project.endDate} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Contract Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-0">
          <FieldRow label="Subcontract Number" value={contract.subcontractNumber} />
          <FieldRow label="Subcontract Price (raw)" value={contract.subcontractPrice} />
          <FieldRow label="Subcontract Price (formatted)" value={contract.subcontractPriceFormatted} />
          <FieldRow label="Agreement Date (long)" value={contract.agreementDate} />
          <FieldRow label="Agreement Date (short)" value={contract.agreementDateShort} />
          <FieldRow label="Prime Contract Owner" value={contract.primeContractOwner} />
          <div className="grid grid-cols-[1fr_1.5fr] gap-2 py-1.5 text-sm">
            <span className="text-muted-foreground">List of Exhibits</span>
            <span className="font-medium whitespace-pre-wrap" title={contract.listOfExhibits ?? ''}>
              {contract.listOfExhibits || '—'}
            </span>
          </div>
          <FieldRow label="Payment terms (days)" value={contract.paymentTermsDays ?? ''} />
          <FieldRow label="Liquidated damages (daily)" value={contract.liquidatedDamagesDaily ?? ''} />
          <FieldRow label="Lien cure (days)" value={contract.lienCureDays ?? ''} />
          <FieldRow label="Delay notice (days)" value={contract.delayNoticeDays ?? ''} />
          <FieldRow label="Notice cure (days)" value={contract.noticeCureDays ?? ''} />
          <FieldRow label="Default cure (hours)" value={contract.defaultCureHours ?? ''} />
          <FieldRow label="Insurance cancellation notice (days)" value={contract.insuranceCancellationNoticeDays ?? ''} />
          <FieldRow label="Insurance limit $1M" value={contract.insuranceLimit1m ?? ''} />
          <FieldRow label="Insurance limit $2M" value={contract.insuranceLimit2m ?? ''} />
          <FieldRow label="Governing state" value={contract.governingState ?? ''} />
          <FieldRow label="Venue (county, state)" value={contract.governingCountyState ?? ''} />
          <FieldRow label="Arbitration location" value={contract.arbitrationLocation ?? ''} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">RCG Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-0">
          <FieldRow label="Legal Name" value={rcg.legalName} />
          <FieldRow label="Display Name" value={rcg.displayName} />
          <FieldRow label="Address" value={rcg.address} />
          <FieldRow label="Phone" value={rcg.phone} />
          <FieldRow label="Email" value={rcg.email} />
          <FieldRow label="Website" value={rcg.website} />
          <FieldRow label="Signatory Name" value={rcg.signatoryName} />
          <FieldRow label="Signatory Title" value={rcg.signatoryTitle} />
        </CardContent>
      </Card>
    </div>
  );
}
