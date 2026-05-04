import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePickerPopover } from '@/components/ui/date-picker-popover';
import { Loader2, AlertCircle, FileText, Download, Sparkles } from 'lucide-react';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { useInvoiceData } from '@/hooks/useInvoiceData';
import { useGenerateInvoiceDescription } from '@/hooks/useGenerateInvoiceDescription';
import { validateInvoiceFields } from '@/utils/invoiceValidation';
import {
  formatCurrency,
  formatInvoiceDateDisplay,
  formatInvoiceDateIso,
} from '@/utils/invoiceFormatters';
import type {
  InvoiceFieldValues,
  InvoiceGenerationResponse,
} from '@/types/invoice';

import { InvoiceStepper } from './InvoiceStepper';
import { InvoiceFieldSummary } from './InvoiceFieldSummary';
import { InvoiceGenerationSuccess } from './InvoiceGenerationSuccess';

function fieldPathToLabel(path: string): string {
  const labels: Record<string, string> = {
    'customer.name': 'Customer Name',
    'customer.streetAddress': 'Street Address',
    'customer.cityStateZip': 'City, State, ZIP',
    'project.projectNameNumber': 'Project',
    'invoice.invoiceNumber': 'Invoice Number',
    'invoice.invoiceDate': 'Invoice Date',
    'invoice.amount': 'Amount',
    'invoice.amountFormatted': 'Amount',
    'rcg.legalName': 'Company Legal Name',
  };
  return labels[path] || path.split('.').pop() || path;
}

const invoiceFormSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerStreetAddress: z.string().min(1, 'Street address is required'),
  customerCityStateZip: z.string().min(1, 'City/State/ZIP is required'),
  customerContact: z.string().optional(),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  customerPhone: z.string().optional(),

  projectNameNumber: z.string().min(1, 'Project name/number is required'),
  projectLocation: z.string().optional(),
  poNumber: z.string().optional(),

  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.date({ required_error: 'Invoice date is required' }),
  dueDate: z.date().optional(),
  amount: z.number().positive('Amount must be greater than zero'),
  description: z.string().optional(),
  notes: z.string().optional(),

  outputFormat: z.enum(['docx', 'pdf', 'both']),
  saveToDocuments: z.boolean(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  revenueId: string;
  clientId?: string | null;
  onSuccess?: (result: InvoiceGenerationResponse) => void;
}

export function InvoiceGenerationModal({
  open,
  onOpenChange,
  projectId,
  revenueId,
  clientId,
  onSuccess,
}: InvoiceGenerationModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'configure' | 'preview' | 'complete'>(
    'configure'
  );
  const [previewData, setPreviewData] = useState<InvoiceFieldValues | null>(null);
  const [generationResult, setGenerationResult] =
    useState<InvoiceGenerationResponse | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { fieldValues, isLoading, error } = useInvoiceData({
    projectId,
    revenueId,
    clientId,
  });
  const { generate: generateDescription, isGenerating: isAiGenerating } =
    useGenerateInvoiceDescription();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      outputFormat: 'both',
      saveToDocuments: true,
    },
  });

  // Prefill form once data loads
  useEffect(() => {
    if (fieldValues) {
      form.reset({
        customerName: fieldValues.customer.name,
        customerStreetAddress: fieldValues.customer.streetAddress,
        customerCityStateZip: fieldValues.customer.cityStateZip,
        customerContact: fieldValues.customer.contactPerson ?? '',
        customerEmail: fieldValues.customer.email ?? '',
        customerPhone: fieldValues.customer.phone ?? '',
        projectNameNumber: fieldValues.project.projectNameNumber,
        projectLocation: fieldValues.project.location,
        poNumber: fieldValues.project.poNumber,
        invoiceNumber: fieldValues.invoice.invoiceNumber,
        invoiceDate: fieldValues.invoice.invoiceDate
          ? new Date(fieldValues.invoice.invoiceDate)
          : new Date(),
        dueDate: fieldValues.invoice.dueDate
          ? new Date(fieldValues.invoice.dueDate)
          : undefined,
        amount: fieldValues.invoice.amount,
        description: fieldValues.invoice.description ?? '',
        notes: fieldValues.invoice.notes ?? '',
        outputFormat: 'both',
        saveToDocuments: true,
      });
    }
  }, [fieldValues, form]);

  // Reset stepper state on open
  useEffect(() => {
    if (open) {
      setCurrentStep('configure');
      setPreviewData(null);
      setGenerationResult(null);
    }
  }, [open]);

  // Scroll to top on step change
  useEffect(() => {
    requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTop = 0;
    });
  }, [currentStep]);

  const handleAutoDraftDescription = async () => {
    const result = await generateDescription({ projectId });
    if (result.reason === 'no_approved_estimate' || result.reason === 'no_line_items') {
      toast.info('No approved estimate found', {
        description: 'Description left blank. You can write one manually.',
      });
      return;
    }
    if (result.reason === 'error') {
      toast.error('Auto-draft failed', {
        description: 'Could not generate description. Please write one manually.',
      });
      return;
    }
    if (result.description) {
      form.setValue('description', result.description, { shouldDirty: true });
      toast.success('Description drafted', {
        description: 'Review and edit before generating the invoice.',
      });
    }
  };

  function buildFieldValues(values: InvoiceFormValues): InvoiceFieldValues {
    if (!fieldValues) throw new Error('Field values not loaded');
    return {
      customer: {
        name: values.customerName,
        streetAddress: values.customerStreetAddress,
        cityStateZip: values.customerCityStateZip,
        contactPerson: values.customerContact || '',
        email: values.customerEmail || '',
        phone: values.customerPhone || '',
      },
      project: {
        projectNameNumber: values.projectNameNumber,
        projectNumber: fieldValues.project.projectNumber,
        projectName: fieldValues.project.projectName,
        location: values.projectLocation ?? '',
        poNumber: values.poNumber ?? '',
      },
      invoice: {
        invoiceNumber: values.invoiceNumber,
        invoiceDate: formatInvoiceDateIso(values.invoiceDate),
        invoiceDateFormatted: formatInvoiceDateDisplay(values.invoiceDate),
        amount: values.amount,
        amountFormatted: formatCurrency(values.amount),
        dueDate: values.dueDate ? formatInvoiceDateIso(values.dueDate) : '',
        dueDateFormatted: values.dueDate ? formatInvoiceDateDisplay(values.dueDate) : '',
        description: values.description ?? '',
        notes: values.notes ?? '',
      },
      rcg: fieldValues.rcg,
    };
  }

  const handleContinueToPreview = (values: InvoiceFormValues) => {
    if (!fieldValues) return;
    const complete = buildFieldValues(values);
    const validation = validateInvoiceFields(complete);
    if (!validation.isValid) {
      const [firstField, firstMessage] = Object.entries(validation.errors)[0];
      const fieldLabel = fieldPathToLabel(firstField);
      toast.error('Missing required field', {
        description: `${fieldLabel}: ${firstMessage}`,
      });
      return;
    }
    setPreviewData(complete);
    setCurrentStep('preview');
  };

  const handleGenerateInvoice = async () => {
    if (!previewData) return;
    const values = form.getValues();
    setIsGenerating(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-invoice',
        {
          body: {
            projectId,
            revenueId,
            clientId: clientId ?? null,
            fieldValues: previewData,
            outputFormat: values.outputFormat,
            saveToDocuments: values.saveToDocuments,
          },
        }
      );

      const result = data as InvoiceGenerationResponse | null;
      if (fnError) {
        let serverMessage = result?.error ?? null;
        const ctx = (fnError as { context?: { json?: () => Promise<{ error?: string }> } })
          .context;
        if (!serverMessage && typeof ctx?.json === 'function') {
          try {
            const body = await ctx.json();
            serverMessage = body?.error ?? null;
          } catch {
            // ignore
          }
        }
        throw new Error(serverMessage || fnError.message);
      }
      if (!result?.success) {
        throw new Error(result?.error || 'Invoice generation failed');
      }

      setGenerationResult(result);
      setCurrentStep('complete');
      onSuccess?.(result);
      toast.success('Invoice generated', {
        description: `Invoice ${result.invoiceNumber || result.internalReference || ''} created.`,
      });
    } catch (err) {
      console.error('Invoice generation error:', err);
      toast.error('Generation failed', {
        description: err instanceof Error ? err.message : 'Failed to generate invoice',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <BrandedLoader size="md" message="Loading invoice data..." />
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Failed to Load Data</h3>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Invoice
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'configure' &&
              'Review and edit the invoice details before generating the document.'}
            {currentStep === 'preview' &&
              'Review the field summary before generating.'}
            {currentStep === 'complete' &&
              'Your invoice has been generated successfully.'}
          </DialogDescription>
        </DialogHeader>

        <InvoiceStepper currentStep={currentStep} />

        {currentStep === 'configure' && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleContinueToPreview)}
              className="space-y-6"
            >
              <Accordion
                type="multiple"
                defaultValue={['customer', 'project', 'invoice']}
                className="w-full"
              >
                <AccordionItem value="customer">
                  <AccordionTrigger className="text-base font-semibold">
                    Bill To
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerStreetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerCityStateZip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City, State, ZIP *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Cincinnati, OH 45202" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Attn: Jane Doe" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 555-5555" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="project">
                  <AccordionTrigger className="text-base font-semibold">
                    Project
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="projectNameNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name / Number *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="projectLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="poNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PO #</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="invoice">
                  <AccordionTrigger className="text-base font-semibold">
                    Invoice Details
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="invoiceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice # *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Amount *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="invoiceDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Invoice Date *</FormLabel>
                            <FormControl>
                              <DatePickerPopover
                                value={field.value}
                                onSelect={field.onChange}
                                iconPlacement="end"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <DatePickerPopover
                                value={field.value}
                                onSelect={field.onChange}
                                iconPlacement="end"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Description (≤150 words)</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAutoDraftDescription}
                              disabled={isAiGenerating}
                            >
                              {isAiGenerating ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                  Drafting...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-2" />
                                  Auto-draft from estimate
                                </>
                              )}
                            </Button>
                          </div>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={5}
                              placeholder="Brief summary of work completed. Click Auto-draft to generate from approved estimate."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="Anything additional to print under the line items."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Output Options</h4>
                <FormField
                  control={form.control}
                  name="outputFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="docx" id="invoice-docx" />
                            <Label htmlFor="invoice-docx">Generate DOCX only</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pdf" id="invoice-pdf" />
                            <Label htmlFor="invoice-pdf">Generate PDF only</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="both" id="invoice-both" />
                            <Label htmlFor="invoice-both">Generate DOCX + PDF</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="saveToDocuments"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 font-normal">
                        Save to Project Documents
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isGenerating}>
                  Continue to Preview
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {currentStep === 'preview' && previewData && (
          <>
            <div className="space-y-4">
              <InvoiceFieldSummary fieldValues={previewData} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep('configure')}
              >
                Back
              </Button>
              <Button onClick={handleGenerateInvoice} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {currentStep === 'complete' && generationResult && (
          <InvoiceGenerationSuccess
            result={generationResult}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
