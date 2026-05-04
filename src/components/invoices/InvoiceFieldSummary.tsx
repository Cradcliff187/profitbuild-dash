import type { InvoiceFieldValues } from '@/types/invoice';

interface InvoiceFieldSummaryProps {
  fieldValues: InvoiceFieldValues;
}

/**
 * Read-only "what we're about to send to the template" summary. Mirrors the
 * shape of `ContractFieldSummary`.
 */
export function InvoiceFieldSummary({ fieldValues }: InvoiceFieldSummaryProps) {
  const { customer, project, invoice } = fieldValues;
  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-4 text-sm">
      <div>
        <h4 className="font-semibold text-base mb-2">Bill To</h4>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
          <span className="text-muted-foreground">Customer:</span>
          <span className="col-span-2">{customer.name || '—'}</span>
          <span className="text-muted-foreground">Address:</span>
          <span className="col-span-2">
            {[customer.streetAddress, customer.cityStateZip].filter(Boolean).join(', ') || '—'}
          </span>
          {customer.contactPerson && (
            <>
              <span className="text-muted-foreground">Attn:</span>
              <span className="col-span-2">{customer.contactPerson}</span>
            </>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-base mb-2">Project</h4>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
          <span className="text-muted-foreground">Project:</span>
          <span className="col-span-2">{project.projectNameNumber || '—'}</span>
          <span className="text-muted-foreground">Location:</span>
          <span className="col-span-2">{project.location || '—'}</span>
          <span className="text-muted-foreground">PO #:</span>
          <span className="col-span-2">{project.poNumber || '—'}</span>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-base mb-2">Invoice</h4>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
          <span className="text-muted-foreground">Invoice #:</span>
          <span className="col-span-2">{invoice.invoiceNumber || '—'}</span>
          <span className="text-muted-foreground">Issue date:</span>
          <span className="col-span-2">{invoice.invoiceDateFormatted || '—'}</span>
          <span className="text-muted-foreground">Due date:</span>
          <span className="col-span-2">{invoice.dueDateFormatted || '—'}</span>
          <span className="text-muted-foreground">Total due:</span>
          <span className="col-span-2 font-semibold">{invoice.amountFormatted || '—'}</span>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-base mb-2">Description</h4>
        <p className="whitespace-pre-wrap text-muted-foreground">
          {invoice.description || '(blank — no approved estimate or AI draft skipped)'}
        </p>
      </div>

      {invoice.notes && (
        <div>
          <h4 className="font-semibold text-base mb-2">Notes</h4>
          <p className="whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
