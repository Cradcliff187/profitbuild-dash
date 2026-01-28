import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Calendar as CalendarIcon, AlertCircle, FileText, Download, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { useContractData } from '@/hooks/useContractData';
import { validateContractFields } from '@/utils/contractValidation';
import { formatAgreementDate, formatProjectDate, formatCurrency } from '@/utils/contractFormatters';
import { LEGAL_FORM_OPTIONS, US_STATE_OPTIONS } from '@/constants/contractFields';
import type {
  ContractFieldValues,
  ContractGenerationResponse,
  LegalFormType,
  USState,
} from '@/types/contract';

/** Convert field paths to human-readable labels for validation errors */
function fieldPathToLabel(path: string): string {
  const labels: Record<string, string> = {
    'subcontractor.company': 'Company Name',
    'subcontractor.contactName': 'Contact Name',
    'subcontractor.address': 'Address',
    'subcontractor.legalForm': 'Legal Form',
    'subcontractor.stateOfFormation': 'State of Formation',
    'project.projectNameNumber': 'Project Name/Number',
    'project.location': 'Project Location',
    'project.propertyOwner': 'Property Owner',
    'project.startDate': 'Start Date',
    'project.endDate': 'End Date',
    'contract.subcontractNumber': 'Subcontract Number',
    'contract.subcontractPrice': 'Subcontract Price',
    'contract.agreementDate': 'Agreement Date',
  };
  return labels[path] || path.split('.').pop() || path;
}
import { ContractStepper } from '@/components/contracts/ContractStepper';
import { ContractFieldSummary } from '@/components/contracts/ContractFieldSummary';
import { ContractDocumentPreview } from '@/components/contracts/ContractDocumentPreview';
import { ContractGenerationSuccess } from '@/components/contracts/ContractGenerationSuccess';

const contractFormSchema = z.object({
  subcontractorCompany: z.string().min(1, 'Company name is required'),
  subcontractorContactName: z.string().min(1, 'Contact name is required'),
  subcontractorContactTitle: z.string().optional(),
  subcontractorPhone: z.string().optional(),
  subcontractorEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  subcontractorAddress: z.string().min(1, 'Address is required'),
  subcontractorLegalForm: z.string().min(1, 'Legal form is required'),
  subcontractorState: z.string().min(1, 'State is required'),
  projectNameNumber: z.string().min(1, 'Project name/number is required'),
  projectLocation: z.string().min(1, 'Location is required'),
  propertyOwner: z.string().min(1, 'Property owner is required'),
  projectStartDate: z.date({ required_error: 'Start date is required' }),
  projectEndDate: z.date({ required_error: 'End date is required' }),
  subcontractNumber: z.string().optional(),
  subcontractPrice: z.number().positive('Price must be greater than zero'),
  agreementDate: z.date({ required_error: 'Agreement date is required' }),
  primeContractOwner: z.string().min(1, 'Prime contract owner is required'),
  listOfExhibits: z.array(z.string()).default(['']),
  paymentTermsDays: z.string().optional(),
  liquidatedDamagesDaily: z.string().optional(),
  lienCureDays: z.string().optional(),
  delayNoticeDays: z.string().optional(),
  noticeCureDays: z.string().optional(),
  defaultCureHours: z.string().optional(),
  insuranceCancellationNoticeDays: z.string().optional(),
  insuranceLimit1m: z.string().optional(),
  insuranceLimit2m: z.string().optional(),
  governingState: z.string().optional(),
  governingCountyState: z.string().optional(),
  arbitrationLocation: z.string().optional(),
  outputFormat: z.enum(['docx', 'pdf', 'both']),
  saveToDocuments: z.boolean(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface ContractGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  estimateId?: string;
  quoteId?: string;
  payeeId: string;
  onSuccess?: (result: ContractGenerationResponse) => void;
}

export function ContractGenerationModal({
  open,
  onOpenChange,
  projectId,
  estimateId,
  quoteId,
  payeeId,
  onSuccess,
}: ContractGenerationModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'configure' | 'preview' | 'complete'>('configure');
  const [previewData, setPreviewData] = useState<ContractFieldValues | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [generationResult, setGenerationResult] = useState<ContractGenerationResponse | null>(null);

  const { fieldValues, isLoading, error } = useContractData({
    projectId,
    estimateId,
    quoteId,
    payeeId,
  });

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      listOfExhibits: [''],
      outputFormat: 'both',
      saveToDocuments: true,
    },
  });

  const exhibitFieldArray = useFieldArray({
    control: form.control,
    name: 'listOfExhibits' as never,
  });
  const { fields: exhibitFields, append: appendExhibit, remove: removeExhibit } = exhibitFieldArray;

  useEffect(() => {
    if (fieldValues) {
      const listStr = fieldValues.contract.listOfExhibits ?? '';
      form.reset({
        subcontractorCompany: fieldValues.subcontractor.company,
        subcontractorContactName: fieldValues.subcontractor.contactName,
        subcontractorContactTitle: fieldValues.subcontractor.contactTitle,
        subcontractorPhone: fieldValues.subcontractor.phone,
        subcontractorEmail: fieldValues.subcontractor.email,
        subcontractorAddress: fieldValues.subcontractor.address,
        subcontractorLegalForm: fieldValues.subcontractor.legalForm,
        subcontractorState: fieldValues.subcontractor.stateOfFormation,
        projectNameNumber: fieldValues.project.projectNameNumber,
        projectLocation: fieldValues.project.location,
        propertyOwner: fieldValues.project.propertyOwner,
        projectStartDate: fieldValues.project.startDate
          ? new Date(fieldValues.project.startDate)
          : new Date(),
        projectEndDate: fieldValues.project.endDate
          ? new Date(fieldValues.project.endDate)
          : new Date(),
        subcontractNumber: fieldValues.contract.subcontractNumber,
        subcontractPrice: fieldValues.contract.subcontractPrice,
        agreementDate: new Date(fieldValues.contract.agreementDateShort),
        primeContractOwner: fieldValues.contract.primeContractOwner,
        listOfExhibits: listStr ? listStr.split('\n').filter(Boolean) : [''],
        paymentTermsDays: fieldValues.contract.paymentTermsDays ?? '30',
        liquidatedDamagesDaily: fieldValues.contract.liquidatedDamagesDaily ?? '100.00',
        lienCureDays: fieldValues.contract.lienCureDays ?? '10',
        delayNoticeDays: fieldValues.contract.delayNoticeDays ?? '3',
        noticeCureDays: fieldValues.contract.noticeCureDays ?? '7',
        defaultCureHours: fieldValues.contract.defaultCureHours ?? '48',
        insuranceCancellationNoticeDays: fieldValues.contract.insuranceCancellationNoticeDays ?? '30',
        insuranceLimit1m: fieldValues.contract.insuranceLimit1m ?? '1,000,000',
        insuranceLimit2m: fieldValues.contract.insuranceLimit2m ?? '2,000,000',
        governingState: fieldValues.contract.governingState ?? 'Kentucky',
        governingCountyState: fieldValues.contract.governingCountyState ?? 'Boone County, Kentucky',
        arbitrationLocation: fieldValues.contract.arbitrationLocation ?? 'Covington, Kentucky',
        outputFormat: 'both',
        saveToDocuments: true,
      });
    }
  }, [fieldValues]);

  useEffect(() => {
    if (open) {
      setCurrentStep('configure');
      setPreviewData(null);
      setGenerationResult(null);
    }
  }, [open]);

  // Scroll to top when step changes
  useEffect(() => {
    // Use requestAnimationFrame to wait for the next paint cycle
    // This ensures the new step's content has rendered before scrolling
    requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    });
  }, [currentStep]);

  function buildFieldValues(values: ContractFormValues): ContractFieldValues {
    if (!fieldValues) throw new Error('Field values not loaded');
    return {
      subcontractor: {
        company: values.subcontractorCompany,
        legalForm: values.subcontractorLegalForm as LegalFormType,
        stateOfFormation: values.subcontractorState as USState,
        contactName: values.subcontractorContactName,
        contactTitle: values.subcontractorContactTitle || '',
        phone: values.subcontractorPhone || '',
        email: values.subcontractorEmail || '',
        address: values.subcontractorAddress,
        addressFormatted: values.subcontractorAddress,
      },
      project: {
        projectNameNumber: values.projectNameNumber,
        projectNumber: fieldValues.project.projectNumber,
        projectName: fieldValues.project.projectName,
        location: values.projectLocation,
        propertyOwner: values.propertyOwner,
        startDate: formatProjectDate(values.projectStartDate),
        endDate: formatProjectDate(values.projectEndDate),
      },
      contract: {
        subcontractNumber: values.subcontractNumber || '',
        subcontractPrice: values.subcontractPrice,
        subcontractPriceFormatted: formatCurrency(values.subcontractPrice),
        agreementDate: formatAgreementDate(values.agreementDate),
        agreementDateShort: format(values.agreementDate, 'yyyy-MM-dd'),
        primeContractOwner: values.primeContractOwner,
        listOfExhibits: (values.listOfExhibits ?? []).filter((s) => String(s).trim()).join('\n'),
        paymentTermsDays: ((values.paymentTermsDays ?? '').trim() || fieldValues.contract.paymentTermsDays) ?? '30',
        liquidatedDamagesDaily: ((values.liquidatedDamagesDaily ?? '').trim() || fieldValues.contract.liquidatedDamagesDaily) ?? '100.00',
        lienCureDays: ((values.lienCureDays ?? '').trim() || fieldValues.contract.lienCureDays) ?? '10',
        delayNoticeDays: ((values.delayNoticeDays ?? '').trim() || fieldValues.contract.delayNoticeDays) ?? '3',
        noticeCureDays: ((values.noticeCureDays ?? '').trim() || fieldValues.contract.noticeCureDays) ?? '7',
        defaultCureHours: ((values.defaultCureHours ?? '').trim() || fieldValues.contract.defaultCureHours) ?? '48',
        insuranceCancellationNoticeDays: ((values.insuranceCancellationNoticeDays ?? '').trim() || fieldValues.contract.insuranceCancellationNoticeDays) ?? '30',
        insuranceLimit1m: ((values.insuranceLimit1m ?? '').trim() || fieldValues.contract.insuranceLimit1m) ?? '1,000,000',
        insuranceLimit2m: ((values.insuranceLimit2m ?? '').trim() || fieldValues.contract.insuranceLimit2m) ?? '2,000,000',
        governingState: ((values.governingState ?? '').trim() || fieldValues.contract.governingState) ?? 'Kentucky',
        governingCountyState: ((values.governingCountyState ?? '').trim() || fieldValues.contract.governingCountyState) ?? 'Boone County, Kentucky',
        arbitrationLocation: ((values.arbitrationLocation ?? '').trim() || fieldValues.contract.arbitrationLocation) ?? 'Covington, Kentucky',
      },
      rcg: fieldValues.rcg,
    };
  }

  const handleContinueToPreview = (values: ContractFormValues) => {
    if (!fieldValues) return;
    const completeFieldValues = buildFieldValues(values);
    const validation = validateContractFields(completeFieldValues);
    if (!validation.isValid) {
      const [firstField, firstMessage] = Object.entries(validation.errors)[0];
      const fieldLabel = fieldPathToLabel(firstField);
      toast({
        title: 'Missing Required Field',
        description: `${fieldLabel}: ${firstMessage}`,
        variant: 'destructive',
      });
      return;
    }
    setPreviewData(completeFieldValues);
    setCurrentStep('preview');
  };

  const handleGenerateContract = async () => {
    if (!previewData) return;
    const values = form.getValues();
    setIsGenerating(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-contract', {
        body: {
          projectId,
          estimateId,
          quoteId,
          payeeId,
          contractType: 'subcontractor_project_agreement',
          fieldValues: previewData,
          outputFormat: values.outputFormat,
          saveToDocuments: values.saveToDocuments,
        },
      });

      const result = data as ContractGenerationResponse | null;
      if (fnError) {
        let serverMessage = result?.error ?? null;
        const err = fnError as { context?: { json?: () => Promise<{ error?: string }> } };
        if (!serverMessage && typeof err?.context?.json === 'function') {
          try {
            const body = await err.context.json();
            serverMessage = body?.error ?? null;
          } catch {
            // ignore
          }
        }
        throw new Error(serverMessage || fnError.message);
      }
      if (!result?.success) throw new Error(result?.error || 'Contract generation failed');

      setGenerationResult(result);
      setCurrentStep('complete');
      onSuccess?.(result);
      toast({
        title: 'Contract Generated',
        description: `Subcontractor Project Agreement ${(result as { internalReference?: string }).internalReference || result.contractNumber || ''} has been created successfully.`,
      });
    } catch (err) {
      console.error('Contract generation error:', err);
      toast({
        title: 'Generation Failed',
        description: err instanceof Error ? err.message : 'Failed to generate contract',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading contract data...</span>
          </div>
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
      <DialogContent ref={contentRef} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Subcontractor Project Agreement
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'configure' && 'Review and edit the contract details before generating the document.'}
            {currentStep === 'preview' && 'Review the field summary and document preview before generating.'}
            {currentStep === 'complete' && 'Your contract has been generated successfully.'}
          </DialogDescription>
        </DialogHeader>

        <ContractStepper currentStep={currentStep} />

        {currentStep === 'configure' && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleContinueToPreview)} className="space-y-6">
            <Accordion
              type="multiple"
              defaultValue={['subcontractor', 'project', 'contract', 'terms']}
              className="w-full"
            >
              <AccordionItem value="subcontractor">
                <AccordionTrigger className="text-base font-semibold">
                  Subcontractor Information
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractorCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcontractorContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractorContactTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., President, Owner" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcontractorPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 555-5555" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="subcontractorEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subcontractorAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractorState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State of Formation *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATE_OPTIONS.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcontractorLegalForm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Legal Form *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select legal form" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LEGAL_FORM_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="project">
                <AccordionTrigger className="text-base font-semibold">
                  Project Information
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="projectNameNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name/Number *</FormLabel>
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
                        <FormLabel>Location *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="propertyOwner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Owner *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="projectStartDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="projectEndDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contract">
                <AccordionTrigger className="text-base font-semibold">
                  Contract Details
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcontract Number (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter subcontractor's reference number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcontractPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcontract Price *</FormLabel>
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
                      name="agreementDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Agreement Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primeContractOwner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prime Contract Owner *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">List of Exhibits</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add each exhibit in its own row. Each row will appear as a separate line in the generated contract.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {exhibitFields.map((field, index) => (
                        <FormField
                          key={field.id}
                          control={form.control}
                          name={`listOfExhibits.${index}`}
                          render={({ field: inputField }) => (
                            <FormItem>
                              <div className="flex gap-2 items-start">
                                <FormControl className="flex-1">
                                  <Input
                                    {...inputField}
                                    value={inputField.value ?? ''}
                                    placeholder={`e.g. Exhibit "${String.fromCharCode(65 + index)}" Plans and Specifications`}
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeExhibit(index)}
                                  disabled={exhibitFields.length <= 1}
                                  aria-label="Remove exhibit"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => appendExhibit('')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add exhibit
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="terms">
                <AccordionTrigger className="text-base font-semibold">
                  Terms & conditions
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Defaults from company settings. Edit any value to override for this contract.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentTermsDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment terms (days)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="liquidatedDamagesDaily"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Liquidated damages (daily, no $)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="100.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lienCureDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lien cure (days)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="delayNoticeDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delay notice (calendar days)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="3" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="noticeCureDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notice cure (days)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="7" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultCureHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default cure (hours)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="48" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insuranceCancellationNoticeDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance cancellation notice (days)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insuranceLimit1m"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance limit $1M</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1,000,000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insuranceLimit2m"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance limit $2M</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="2,000,000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="governingState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Governing state</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Kentucky" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="governingCountyState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue (county, state)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Boone County, Kentucky" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="arbitrationLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arbitration location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Covington, Kentucky" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rcg">
                <AccordionTrigger className="text-base font-semibold">
                  RCG Information (Company Defaults)
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  {fieldValues && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Legal Name:</span>
                        <span>{fieldValues.rcg.legalName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Display Name:</span>
                        <span>{fieldValues.rcg.displayName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span>{fieldValues.rcg.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Signatory:</span>
                        <span>
                          {fieldValues.rcg.signatoryName}, {fieldValues.rcg.signatoryTitle}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        To change RCG defaults, go to Settings → Company Information
                      </p>
                    </div>
                  )}
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
                          <RadioGroupItem value="docx" id="docx" />
                          <Label htmlFor="docx">Generate DOCX only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pdf" id="pdf" />
                          <Label htmlFor="pdf">Generate PDF only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="both" id="both" />
                          <Label htmlFor="both">Generate DOCX + PDF</Label>
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
              <ContractFieldSummary fieldValues={previewData} />
              <ContractDocumentPreview fieldValues={previewData} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep('configure')}
              >
                Back
              </Button>
              <Button onClick={handleGenerateContract} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate Contract
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {currentStep === 'complete' && generationResult && (
          <ContractGenerationSuccess
            result={generationResult}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
