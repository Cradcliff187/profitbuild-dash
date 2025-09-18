import { useState, useEffect } from "react";
import { Calculator, Building2, Save, Plus, Copy, History, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/ui/required-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Estimate, LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { Project, ProjectType, generateProjectNumber, JOB_TYPES } from "@/types/project";
import { ClientSelector } from "@/components/ClientSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface EstimateFormProps {
  initialEstimate?: Estimate; // For editing mode
  onSave: (estimate: Estimate) => void;
  onCancel: () => void;
}

type ProjectMode = 'existing' | 'new';

export const EstimateForm = ({ initialEstimate, onSave, onCancel }: EstimateFormProps) => {
  const { toast } = useToast();
  
  // Project selection mode
  const [projectMode, setProjectMode] = useState<ProjectMode>('new');
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  
  // New project fields
  const [projectName, setProjectName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClientData, setSelectedClientData] = useState<any>(null);
  const [address, setAddress] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>('construction_project');
  const [jobType, setJobType] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  
  const [date, setDate] = useState<Date>(initialEstimate?.date_created || new Date());
  const [validUntil, setValidUntil] = useState<Date | undefined>(initialEstimate?.valid_until);
  const [notes, setNotes] = useState(initialEstimate?.notes || "");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [contingencyPercent, setContingencyPercent] = useState(initialEstimate?.contingency_percent || 10.0);
  const [contingencyUsed, setContingencyUsed] = useState(initialEstimate?.contingency_used || 0);
  const [internalLaborRate, setInternalLaborRate] = useState(75);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  
  // Copy from estimate feature
  const [availableEstimates, setAvailableEstimates] = useState<{[projectId: string]: Estimate[]}>({});
  const [selectedCopyEstimate, setSelectedCopyEstimate] = useState<string>("");
  
  // Version history feature
  const [estimateVersions, setEstimateVersions] = useState<Estimate[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [originalLineItems, setOriginalLineItems] = useState<LineItem[]>([]);
  
  // State for markup control panel
  const [globalMarkupPercent, setGlobalMarkupPercent] = useState<number>(initialEstimate?.defaultMarkupPercent || 15);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(initialEstimate?.targetMarginPercent || 20);

  useEffect(() => {
    if (initialEstimate) {
      // Load existing estimate for editing
      setDate(initialEstimate.date_created);
      setValidUntil(initialEstimate.valid_until);
      setNotes(initialEstimate.notes || "");
      setProjectMode('existing');
      setSelectedProjectId(initialEstimate.project_id);
      // Load line items - need to fetch from database
      loadEstimateLineItems(initialEstimate.id);
      
      // Load client data if we have a project
      loadClientForProject(initialEstimate.project_id);
    } else {
      setProjectNumber(generateProjectNumber());
    }
    loadExistingProjects();
    loadAvailableEstimates();
    
    if (initialEstimate) {
      loadEstimateVersions(initialEstimate.id);
      setSelectedVersionId(initialEstimate.id);
      setOriginalLineItems([]);
    }
  }, [initialEstimate]);

  const loadExistingProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const projects = data?.map(p => ({
        ...p,
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at),
        start_date: p.start_date ? new Date(p.start_date) : undefined,
        end_date: p.end_date ? new Date(p.end_date) : undefined,
      })) || [];
      
      setExistingProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadEstimateLineItems = async (estimateId: string) => {
    try {
      const { data, error } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('sort_order');

      if (error) throw error;

      const items = data?.map(item => ({
        id: item.id,
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        pricePerUnit: item.price_per_unit || item.rate || 0,
        total: item.total,
        unit: item.unit,
        sort_order: item.sort_order,
        // Cost & Pricing fields
        costPerUnit: item.cost_per_unit || 0,
        markupPercent: item.markup_percent,
        markupAmount: item.markup_amount,
        // Calculated totals
        totalCost: item.total_cost || 0,
        totalMarkup: item.total_markup || 0
      })) || [];

      setLineItems(items as LineItem[]); // Cast the database result to our interface
    } catch (error) {
      console.error('Error loading line items:', error);
    }
  };

  const loadAvailableEstimates = async () => {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          projects!inner(project_name, client_name)
        `)
        .order('date_created', { ascending: false });

      if (error) throw error;

      const estimatesWithProjects = data?.map(e => ({
        ...e,
        project_name: e.projects.project_name,
        client_name: e.projects.client_name,
        date_created: new Date(e.date_created),
        valid_until: e.valid_until ? new Date(e.valid_until) : undefined,
        created_at: new Date(e.created_at),
        updated_at: new Date(e.updated_at),
        lineItems: []
      })) || [];

      // Group by project
      const grouped = estimatesWithProjects.reduce((acc, estimate) => {
        if (!acc[estimate.project_id]) {
          acc[estimate.project_id] = [];
        }
        acc[estimate.project_id].push({
          ...estimate,
          defaultMarkupPercent: 15,
          targetMarginPercent: 20
        });
        return acc;
      }, {} as {[key: string]: Estimate[]});

      setAvailableEstimates(grouped);
    } catch (error) {
      console.error('Error loading estimates:', error);
    }
  };

  const loadEstimateVersions = async (estimateId: string) => {
    try {
      // Find the root estimate ID
      const { data: currentEstimate } = await supabase
        .from('estimates')
        .select('parent_estimate_id')
        .eq('id', estimateId)
        .single();

      const rootId = currentEstimate?.parent_estimate_id || estimateId;

      // Load all versions in the family
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          projects!inner(project_name, client_name)
        `)
        .or(`id.eq.${rootId},parent_estimate_id.eq.${rootId}`)
        .order('version_number', { ascending: false });

      if (error) throw error;

      const versions = data?.map(e => ({
        ...e,
        project_name: e.projects.project_name,
        client_name: e.projects.client_name,
        date_created: new Date(e.date_created),
        valid_until: e.valid_until ? new Date(e.valid_until) : undefined,
        created_at: new Date(e.created_at),
        updated_at: new Date(e.updated_at),
        lineItems: [],
        defaultMarkupPercent: 15,
        targetMarginPercent: 20
      })) || [];

      setEstimateVersions(versions);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const loadClientForProject = async (projectId: string) => {
    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      if (project?.client_id) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', project.client_id)
          .single();

        if (clientError) throw clientError;

        setSelectedClientId(project.client_id);
        setSelectedClientData(clientData);
      }
    } catch (error) {
      console.error('Error loading client for project:', error);
    }
  };

  const handleCopyFromEstimate = async () => {
    if (!selectedCopyEstimate) return;

    try {
      const { data, error } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', selectedCopyEstimate)
        .order('sort_order');

      if (error) throw error;

      const copiedItems = data?.map((item, index) => ({
        id: Date.now().toString() + Math.random() + index,
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        total: item.quantity * item.rate,
        unit: item.unit,
        sort_order: index,
        // Cost & Pricing fields
        cost_per_unit: item.cost_per_unit || 0,
        markup_percent: item.markup_percent,
        markup_amount: item.markup_amount,
        price_per_unit: item.price_per_unit || item.rate || 0,
        // Calculated totals
        total_cost: item.total_cost || 0,
        total_markup: item.total_markup || 0
      })) || [];

      const transformedItems = copiedItems.map(item => ({
        ...item,
        pricePerUnit: item.rate || 0,
        costPerUnit: item.cost_per_unit || 0,
        markupPercent: item.markup_percent,
        markupAmount: item.markup_amount,
        totalCost: item.total_cost || 0,
        totalMarkup: item.total_markup || 0
      }));
      setLineItems(transformedItems as LineItem[]);
      setSelectedCopyEstimate("");
      
      toast({
        title: "Items Copied",
        description: `Copied ${copiedItems.length} line items from the selected estimate.`
      });
    } catch (error) {
      console.error('Error copying estimate:', error);
      toast({
        title: "Error",
        description: "Failed to copy line items.",
        variant: "destructive"
      });
    }
  };

  const handleVersionChange = async (versionId: string) => {
    if (versionId === selectedVersionId) return;

    const version = estimateVersions.find(v => v.id === versionId);
    if (!version) return;

    try {
      // Save current line items if editing the current version
      if (selectedVersionId === initialEstimate?.id && !isReadOnly) {
        setOriginalLineItems([...lineItems]);
      }

      // Load line items for the selected version
      await loadEstimateLineItems(versionId);
      
      // Update form with version data
      setDate(version.date_created);
      setValidUntil(version.valid_until);
      setNotes(version.notes || "");
      setContingencyPercent(version.contingency_percent);
      setContingencyUsed(version.contingency_used);
      
      setSelectedVersionId(versionId);
      setIsReadOnly(versionId !== initialEstimate?.id);

      if (versionId !== initialEstimate?.id) {
        toast({
          title: "Viewing Historical Version",
          description: `Now viewing version ${version.version_number} (read-only).`
        });
      }
    } catch (error) {
      console.error('Error loading version:', error);
    }
  };

  const handleBackToCurrentVersion = () => {
    if (!initialEstimate) return;
    
    // Restore original data
    setDate(initialEstimate.date_created);
    setValidUntil(initialEstimate.valid_until);
    setNotes(initialEstimate.notes || "");
    setContingencyPercent(initialEstimate.contingency_percent);
    setContingencyUsed(initialEstimate.contingency_used);
    
    if (originalLineItems.length > 0) {
      setLineItems(originalLineItems);
    } else {
      loadEstimateLineItems(initialEstimate.id);
    }
    
    setSelectedVersionId(initialEstimate.id);
    setIsReadOnly(false);
  };

  const generateEstimateNumber = (projectNum: string) => {
    return `EST-${projectNum}-${Date.now().toString().slice(-4)}`;
  };

  const createNewLineItem = (category: LineItemCategory = LineItemCategory.LABOR): LineItem => {
    const defaultMarkup = initialEstimate?.defaultMarkupPercent || 15;
    let costPerUnit = 0;
    let pricePerUnit = 0;
    
    if (category === LineItemCategory.LABOR) {
      costPerUnit = internalLaborRate * 0.7; // 70% cost base for labor
      pricePerUnit = costPerUnit * (1 + defaultMarkup / 100);
    }
    
    return {
      id: Date.now().toString() + Math.random(),
      category,
      description: '',
      quantity: 1,
      pricePerUnit,
      total: 0,
      unit: '',
      sort_order: lineItems.length,
      // Cost & Pricing fields
      costPerUnit,
      markupPercent: defaultMarkup,
      markupAmount: null,
      // Calculated totals
      totalCost: 0,
      totalMarkup: 0
    };
  };

  useEffect(() => {
    if (lineItems.length === 0) {
      setLineItems([createNewLineItem()]);
    }
  }, []);

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          
          // Auto-set pricePerUnit for labor category
          if (field === 'category' && value === LineItemCategory.LABOR) {
            updated.pricePerUnit = internalLaborRate;
            updated.costPerUnit = internalLaborRate * 0.7; // Default cost at 70% of price
          }
          
          // Enhanced calculation logic
          if (field === 'costPerUnit' || field === 'markupPercent') {
            // When cost or markup changes, recalculate price
            if (updated.markupPercent !== null && updated.markupPercent !== undefined) {
              updated.pricePerUnit = updated.costPerUnit * (1 + updated.markupPercent / 100);
            }
          } else if (field === 'pricePerUnit') {
            // When price changes, back-calculate markup
            if (updated.costPerUnit > 0) {
              updated.markupPercent = ((updated.pricePerUnit - updated.costPerUnit) / updated.costPerUnit) * 100;
            }
          }
          
          // Always recalculate totals
          updated.total = updated.quantity * updated.pricePerUnit;
          updated.totalCost = updated.quantity * updated.costPerUnit;
          updated.totalMarkup = updated.total - updated.totalCost;
          
          return updated;
        }
        return item;
      })
    );
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, createNewLineItem()]);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
  };

  const calculateContingencyAmount = () => {
    const total = calculateTotal();
    return total * (contingencyPercent / 100);
  };

  // Markup control panel calculation functions
  const calculateTotalCost = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
  };

  const calculateTotalMarkup = () => {
    return calculateTotal() - calculateTotalCost();
  };

  const calculateAchievedMargin = () => {
    const totalPrice = calculateTotal();
    if (totalPrice === 0) return 0;
    return (calculateTotalMarkup() / totalPrice) * 100;
  };

  const applyGlobalMarkup = (percent?: number) => {
    const markupToApply = percent ?? globalMarkupPercent;
    
    setLineItems(prev =>
      prev.map(item => {
        const updated = { ...item };
        if (updated.costPerUnit > 0) {
          updated.markupPercent = markupToApply;
          updated.pricePerUnit = updated.costPerUnit * (1 + markupToApply / 100);
          updated.total = updated.quantity * updated.pricePerUnit;
          updated.totalCost = updated.quantity * updated.costPerUnit;
          updated.totalMarkup = updated.total - updated.totalCost;
        }
        return updated;
      })
    );
    
    toast({
      title: "Markup Applied",
      description: `Applied ${markupToApply}% markup to all line items with cost data.`
    });
  };

  // Helper functions for margin warnings
  const getLineItemBorderClass = (lineItem: LineItem) => {
    if (lineItem.pricePerUnit === 0) return "border border-border";
    
    const marginPercent = ((lineItem.pricePerUnit - lineItem.costPerUnit) / lineItem.pricePerUnit) * 100;
    
    if (marginPercent < 0) {
      return "border-2 border-red-400";
    } else if (marginPercent < 15) {
      return "border-2 border-yellow-400";
    }
    return "border border-border";
  };

  const getOverallMarginStatus = () => {
    const achievedMargin = calculateAchievedMargin();
    
    if (achievedMargin < 10) {
      return 'critical';
    } else if (achievedMargin >= targetMarginPercent) {
      return 'success';
    }
    return 'normal';
  };

  const getProblematicLineItems = () => {
    return lineItems.filter(item => {
      if (item.pricePerUnit === 0 || !item.description.trim()) return false;
      const marginPercent = ((item.pricePerUnit - item.costPerUnit) / item.pricePerUnit) * 100;
      return marginPercent < 15;
    });
  };

  const validateForm = () => {
    const validLineItems = lineItems.filter(item => item.description.trim());
    
    if (validLineItems.length === 0) {
      toast({
        title: "Missing Line Items",
        description: "Please add at least one line item with a description.",
        variant: "destructive"
      });
      return false;
    }

    if (contingencyPercent < 0 || contingencyPercent > 50) {
      toast({
        title: "Invalid Contingency",
        description: "Contingency percentage must be between 0% and 50%.",
        variant: "destructive"
      });
      return false;
    }

    if (projectMode === 'new') {
      if (!projectName.trim() || !selectedClientId) {
        toast({
          title: "Missing Project Information",
          description: "Please fill in project name and select a client.",
          variant: "destructive"
        });
        return false;
      }
    } else {
      if (!selectedProjectId) {
        toast({
          title: "No Project Selected",
          description: "Please select an existing project.",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      let finalProjectId = selectedProjectId;
      let project: Project;
      
      if (initialEstimate) {
        // Update existing estimate
        const totalAmount = calculateTotal();
        const validLineItems = lineItems.filter(item => item.description.trim());
        
        const { data: estimateData, error: estimateError } = await supabase
          .from('estimates')
          .update({
            date_created: date.toISOString().split('T')[0],
            total_amount: totalAmount,
            total_cost: calculateTotalCost(),
            notes: notes.trim() || undefined,
            valid_until: validUntil?.toISOString().split('T')[0],
            contingency_percent: contingencyPercent,
            contingency_used: contingencyUsed,
            contingency_amount: calculateContingencyAmount(),
            default_markup_percent: globalMarkupPercent,
            target_margin_percent: targetMarginPercent,
            updated_at: new Date().toISOString()
          })
          .eq('id', initialEstimate.id)
          .select()
          .single();

        if (estimateError) throw estimateError;

        // Delete existing line items and create new ones
        const { error: deleteError } = await supabase
          .from('estimate_line_items')
          .delete()
          .eq('estimate_id', initialEstimate.id);

        if (deleteError) throw deleteError;

        // Create new line items
        const lineItemsData = validLineItems.map((item, index) => ({
          estimate_id: initialEstimate.id,
          category: item.category,
          description: item.description.trim(),
          quantity: item.quantity,
          rate: item.pricePerUnit, // Keep for backward compatibility
          price_per_unit: item.pricePerUnit,
          total: item.quantity * item.pricePerUnit,
          unit: item.unit || undefined,
          sort_order: index,
          // Cost & Pricing fields
          cost_per_unit: item.costPerUnit || 0,
          markup_percent: item.markupPercent,
          markup_amount: item.markupAmount,
          total_cost: item.quantity * (item.costPerUnit || 0),
          total_markup: (item.quantity * item.pricePerUnit) - (item.quantity * (item.costPerUnit || 0))
        }));

        const { error: lineItemsError } = await supabase
          .from('estimate_line_items')
          .insert(lineItemsData);

        if (lineItemsError) throw lineItemsError;

        const updatedEstimate: Estimate = {
          ...initialEstimate,
          date_created: new Date(estimateData.date_created),
          total_amount: estimateData.total_amount,
          notes: estimateData.notes,
          valid_until: estimateData.valid_until ? new Date(estimateData.valid_until) : undefined,
          contingency_percent: estimateData.contingency_percent,
          contingency_amount: estimateData.contingency_amount,
          contingency_used: estimateData.contingency_used,
          lineItems: validLineItems,
          updated_at: new Date(estimateData.updated_at)
        };

        onSave(updatedEstimate);
        
        toast({
          title: "Estimate Updated",
          description: `Estimate ${initialEstimate.estimate_number} has been updated successfully.`
        });

        return;
      }
      
      // Create project first if needed
      if (projectMode === 'new') {
        const { data: insertedProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            project_name: projectName.trim(),
            client_id: selectedClientId,
            client_name: selectedClientData?.client_name || "",
            address: address.trim() || null,
            project_type: projectType,
            job_type: jobType.trim() || null,
            project_number: projectNumber,
            status: 'estimating' as const,
            company_id: '00000000-0000-0000-0000-000000000000' // RLS will handle
          })
          .select()
          .single();

        if (projectError) throw projectError;
        
        finalProjectId = insertedProject.id;
        project = {
          ...insertedProject,
          created_at: new Date(insertedProject.created_at),
          updated_at: new Date(insertedProject.updated_at),
          start_date: insertedProject.start_date ? new Date(insertedProject.start_date) : undefined,
          end_date: insertedProject.end_date ? new Date(insertedProject.end_date) : undefined,
        };
      } else {
        project = existingProjects.find(p => p.id === finalProjectId)!;
      }

      // Create estimate
      const estimateNumber = generateEstimateNumber(project.project_number);
      const totalAmount = calculateTotal();
      const validLineItems = lineItems.filter(item => item.description.trim());
      
      const { data: estimateData, error: estimateError } = await supabase
        .from('estimates')
        .insert({
          project_id: finalProjectId,
          estimate_number: estimateNumber,
          date_created: date.toISOString().split('T')[0],
          total_amount: totalAmount,
          total_cost: calculateTotalCost(),
          status: 'draft' as const,
          notes: notes.trim() || undefined,
          valid_until: validUntil?.toISOString().split('T')[0],
          contingency_percent: contingencyPercent,
          contingency_used: contingencyUsed,
          contingency_amount: calculateContingencyAmount(),
          revision_number: 1,
          version_number: 1,
          is_current_version: true,
          valid_for_days: 30,
          default_markup_percent: globalMarkupPercent,
          target_margin_percent: targetMarginPercent
        })
        .select()
        .single();

      if (estimateError) throw estimateError;

      // Create line items
      const lineItemsData = validLineItems.map((item, index) => ({
        estimate_id: estimateData.id,
        category: item.category,
        description: item.description.trim(),
        quantity: item.quantity,
        rate: item.pricePerUnit, // Keep for backward compatibility
        price_per_unit: item.pricePerUnit,
        total: item.quantity * item.pricePerUnit,
        unit: item.unit || undefined,
        sort_order: index,
        // Cost & Pricing fields
        cost_per_unit: item.costPerUnit || 0,
        markup_percent: item.markupPercent,
        markup_amount: item.markupAmount,
        total_cost: item.quantity * (item.costPerUnit || 0),
        total_markup: (item.quantity * item.pricePerUnit) - (item.quantity * (item.costPerUnit || 0))
      }));

      const { error: lineItemsError } = await supabase
        .from('estimate_line_items')
        .insert(lineItemsData);

      if (lineItemsError) throw lineItemsError;

      const newEstimate: Estimate = {
        id: estimateData.id,
        project_id: estimateData.project_id,
        estimate_number: estimateData.estimate_number,
        defaultMarkupPercent: estimateData.default_markup_percent || 15,
        targetMarginPercent: estimateData.target_margin_percent || 20,
        date_created: new Date(estimateData.date_created),
        total_amount: estimateData.total_amount,
        status: estimateData.status as any,
        notes: estimateData.notes,
        valid_until: estimateData.valid_until ? new Date(estimateData.valid_until) : undefined,
        revision_number: estimateData.revision_number,
        contingency_percent: estimateData.contingency_percent,
        contingency_amount: estimateData.contingency_amount,
        contingency_used: estimateData.contingency_used,
        version_number: estimateData.version_number || 1,
        parent_estimate_id: estimateData.parent_estimate_id || undefined,
        is_current_version: estimateData.is_current_version ?? true,
        valid_for_days: estimateData.valid_for_days || 30,
        lineItems: validLineItems,
        created_at: new Date(estimateData.created_at),
        updated_at: new Date(estimateData.updated_at),
        project_name: project.project_name,
        client_name: project.client_name
      };

      onSave(newEstimate);
      
      toast({
        title: "Estimate Created",
        description: `Estimate ${estimateNumber} has been created successfully.`
      });

    } catch (error) {
      console.error('Error creating estimate:', error);
      toast({
        title: "Error",
        description: "Failed to create estimate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsNewVersion = async () => {
    if (!initialEstimate) return;
    
    setIsCreatingVersion(true);
    try {
      const { data, error } = await supabase.rpc('create_estimate_version', {
        source_estimate_id: initialEstimate.id
      });

      if (error) throw error;

      toast({
        title: "New Version Created",
        description: "Successfully created estimate version."
      });
      
      // Refresh to show the new version
      window.location.reload();
      
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: "Error", 
        description: "Failed to create new version.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingVersion(false);
    }
  };

  const regenerateProjectNumber = () => {
    setProjectNumber(generateProjectNumber());
  };

  const selectedProject = existingProjects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {initialEstimate ? 'Edit Estimate' : 'Create New Estimate'}
              {isReadOnly && <Badge variant="outline">Read Only</Badge>}
            </div>
            
            {/* Version History Dropdown */}
            {initialEstimate && estimateVersions.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Version:</Label>
                <Select value={selectedVersionId} onValueChange={handleVersionChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estimateVersions.map(version => (
                      <SelectItem key={version.id} value={version.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span>v{version.version_number}</span>
                            {version.is_current_version && <Badge variant="default" className="text-xs">Current</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(version.date_created, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isReadOnly && (
                  <Button variant="outline" size="sm" onClick={handleBackToCurrentVersion}>
                    <Eye className="h-4 w-4 mr-1" />
                    Back to Current
                  </Button>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-4">
            <Label>Project Selection</Label>
            <RadioGroup value={projectMode} onValueChange={(value: ProjectMode) => setProjectMode(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing">Use existing project</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new">Create new project</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Existing Project Selection */}
          {projectMode === 'existing' && (
            <div className="space-y-2">
              <Label>Select Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an existing project" />
                </SelectTrigger>
                <SelectContent>
                  {existingProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col items-start">
                        <span>{project.project_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {project.project_number} • {project.client_name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedProject && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Project:</span> {selectedProject.project_name}
                      </div>
                      <div>
                        <span className="font-medium">Client:</span> {selectedProject.client_name}
                      </div>
                      <div>
                        <span className="font-medium">Number:</span> {selectedProject.project_number}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {selectedProject.project_type.replace('_', ' ')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* New Project Fields */}
          {projectMode === 'new' && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-4 w-4" />
                  New Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project Number */}
                <div className="space-y-2">
                  <Label>Project Number</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg px-4 py-2 font-mono">
                      {projectNumber}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={regenerateProjectNumber}
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <RequiredLabel htmlFor="projectName">Project Name</RequiredLabel>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <RequiredLabel htmlFor="client">Client</RequiredLabel>
                    <ClientSelector
                      value={selectedClientId}
                      onValueChange={async (clientId: string, clientName?: string) => {
                        setSelectedClientId(clientId);
                        // Fetch full client data for display
                        if (clientId) {
                          const { data: clientData } = await supabase
                            .from('clients')
                            .select('*')
                            .eq('id', clientId)
                            .single();
                          setSelectedClientData(clientData);
                        } else {
                          setSelectedClientData(null);
                        }
                      }}
                      placeholder="Select or add a client"
                      required
                    />
                  </div>

                  {/* Client Details Card */}
                  {selectedClientData && (
                    <div className="mt-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Selected Client</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground">Name:</span>
                              <p className="font-medium">{selectedClientData.client_name}</p>
                            </div>
                            {selectedClientData.company_name && (
                              <div>
                                <span className="font-medium text-muted-foreground">Company:</span>
                                <p className="font-medium">{selectedClientData.company_name}</p>
                              </div>
                            )}
                            {selectedClientData.email && (
                              <div>
                                <span className="font-medium text-muted-foreground">Email:</span>
                                <p className="font-medium">{selectedClientData.email}</p>
                              </div>
                            )}
                            {selectedClientData.phone && (
                              <div>
                                <span className="font-medium text-muted-foreground">Phone:</span>
                                <p className="font-medium">{selectedClientData.phone}</p>
                              </div>
                            )}
                          </div>
                          {selectedClientData.billing_address && (
                            <div>
                              <span className="font-medium text-muted-foreground">Address:</span>
                              <p className="text-sm">{selectedClientData.billing_address}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Project Address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter project address"
                    rows={2}
                  />
                </div>

                {/* Project Type and Job Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Type</Label>
                    <Select value={projectType} onValueChange={(value: ProjectType) => setProjectType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="construction_project">Construction Project</SelectItem>
                        <SelectItem value="work_order">Work Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobType">Job Type</Label>
                    <Select value={jobType} onValueChange={setJobType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Estimate Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Estimate Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <RequiredLabel>Estimate Date</RequiredLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(date) => date && setDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Valid Until (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !validUntil && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntil ? format(validUntil, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={validUntil}
                      onSelect={setValidUntil}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes"
                />
              </div>
            </div>
          </div>

          {/* Internal Labor Rate */}
          <div className="space-y-2">
            <Label htmlFor="internal-labor-rate">Internal Labor Rate</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="internal-labor-rate"
                type="number"
                min="0"
                step="0.01"
                value={internalLaborRate}
                onChange={(e) => setInternalLaborRate(parseFloat(e.target.value) || 75)}
                placeholder="75.00"
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">/hour</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This rate will be used for all Internal Labor line items
            </p>
          </div>

          {/* Copy from Previous Estimate */}
          {!initialEstimate && Object.keys(availableEstimates).length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Copy from Previous Estimate</Label>
                  <p className="text-sm text-muted-foreground">Copy line items from an existing estimate</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedCopyEstimate} onValueChange={setSelectedCopyEstimate}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select estimate to copy from" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(availableEstimates).map(([projectId, estimates]) => {
                        const projectName = estimates[0]?.project_name;
                        const clientName = estimates[0]?.client_name;
                        return (
                          <div key={projectId}>
                            <div className="px-2 py-1 text-sm font-medium text-muted-foreground border-b">
                              {projectName} • {clientName}
                            </div>
                            {estimates.map(estimate => (
                              <SelectItem key={estimate.id} value={estimate.id}>
                                <div className="flex flex-col items-start">
                                  <span>{estimate.estimate_number}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(estimate.date_created, 'MMM d, yyyy')} • ${estimate.total_amount?.toLocaleString()}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyFromEstimate}
                    disabled={!selectedCopyEstimate}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Items
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <RequiredLabel className="text-lg font-semibold">Line Items</RequiredLabel>
              <Button onClick={addLineItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
            </div>

            {/* Line Items Header */}
            <div className="grid grid-cols-15 gap-2 p-2 text-sm font-medium text-muted-foreground border-b">
              <div className="col-span-2">Category</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-2">Cost/Unit</div>
              <div className="col-span-1">Markup%</div>
              <div className="col-span-2">Price/Unit</div>
              <div className="col-span-2">Margin</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1"></div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              {lineItems.map(lineItem => {
                const marginPercent = lineItem.pricePerUnit > 0 
                  ? ((lineItem.pricePerUnit - lineItem.costPerUnit) / lineItem.pricePerUnit) * 100 
                  : 0;
                const isHealthy = marginPercent >= 20;
                const isMedium = marginPercent >= 10 && marginPercent < 20;
                
                return (
                  <div key={lineItem.id} className={cn("grid grid-cols-15 gap-2 items-center p-2 rounded", getLineItemBorderClass(lineItem))}>
                    <div className="col-span-2">
                      <Select
                        value={lineItem.category}
                        onValueChange={(value: LineItemCategory) => updateLineItem(lineItem.id, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_DISPLAY_MAP).map(([key, display]) => (
                            <SelectItem key={key} value={key}>
                              {display}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-3">
                      <Input
                        value={lineItem.description}
                        onChange={(e) => updateLineItem(lineItem.id, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={lineItem.quantity}
                        onChange={(e) => updateLineItem(lineItem.id, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={lineItem.costPerUnit}
                        onChange={(e) => updateLineItem(lineItem.id, 'costPerUnit', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={lineItem.markupPercent || 0}
                        onChange={(e) => updateLineItem(lineItem.id, 'markupPercent', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={lineItem.pricePerUnit}
                        onChange={(e) => updateLineItem(lineItem.id, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      {lineItem.pricePerUnit > 0 && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            isHealthy && "bg-green-50 text-green-700 border-green-200",
                            isMedium && "bg-yellow-50 text-yellow-700 border-yellow-200",
                            !isHealthy && !isMedium && "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {marginPercent.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    
                    <div className="col-span-1 text-right font-medium">
                      ${(lineItem.quantity * lineItem.pricePerUnit).toFixed(2)}
                    </div>
                    
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(lineItem.id)}
                        disabled={lineItems.length <= 1}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Markup Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Markup & Margin Control</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Apply Global Markup Section */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground">Apply Global Markup</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label htmlFor="global-markup">Markup Percentage</Label>
                    <Input
                      id="global-markup"
                      type="number"
                      min="0"
                      step="1"
                      value={globalMarkupPercent}
                      onChange={(e) => setGlobalMarkupPercent(parseFloat(e.target.value) || 0)}
                      placeholder="15"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button 
                      onClick={() => applyGlobalMarkup()}
                      className="w-full md:w-auto"
                      disabled={lineItems.every(item => item.costPerUnit === 0)}
                    >
                      Apply to All Items
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Applies markup to all line items with cost data
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Margin Analysis Section */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground">Margin Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/30 p-3 rounded">
                    <div className="text-sm text-muted-foreground">Total Cost</div>
                    <div className="text-lg font-semibold">
                      ${calculateTotalCost().toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded">
                    <div className="text-sm text-muted-foreground">Total Markup</div>
                    <div className="text-lg font-semibold">
                      ${calculateTotalMarkup().toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded">
                    <div className="text-sm text-muted-foreground">Achieved Margin</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold">
                        {calculateAchievedMargin().toFixed(1)}%
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          calculateAchievedMargin() >= 20 && "bg-green-50 text-green-700 border-green-200",
                          calculateAchievedMargin() >= 10 && calculateAchievedMargin() < 20 && "bg-yellow-50 text-yellow-700 border-yellow-200",
                          calculateAchievedMargin() < 10 && "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {calculateAchievedMargin() >= 20 ? 'Excellent' : 
                         calculateAchievedMargin() >= 10 ? 'Good' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Target Margin Comparison */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground">Target Margin Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="target-margin">Target Margin %</Label>
                    <Input
                      id="target-margin"
                      type="number"
                      min="0"
                      step="1"
                      value={targetMarginPercent}
                      onChange={(e) => setTargetMarginPercent(parseFloat(e.target.value) || 0)}
                      placeholder="20"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="bg-muted/30 p-3 rounded w-full">
                      <div className="text-sm text-muted-foreground">Performance vs Target</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Target: {targetMarginPercent.toFixed(1)}% | Achieved: {calculateAchievedMargin().toFixed(1)}%
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs ml-2",
                            calculateAchievedMargin() >= targetMarginPercent && "bg-green-50 text-green-700 border-green-200",
                            calculateAchievedMargin() < targetMarginPercent && "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {calculateAchievedMargin() >= targetMarginPercent ? 
                            `+${(calculateAchievedMargin() - targetMarginPercent).toFixed(1)}%` : 
                            `${(calculateAchievedMargin() - targetMarginPercent).toFixed(1)}%`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Margin Warnings */}
          {getOverallMarginStatus() === 'critical' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Low Margin Warning</AlertTitle>
              <AlertDescription>
                Your overall margin is {calculateAchievedMargin().toFixed(1)}%, which is below the 10% critical threshold. 
                Target margin: {targetMarginPercent}%. Consider increasing prices or reducing costs.
                {getProblematicLineItems().length > 0 && (
                  <span className="block mt-2">
                    Problematic items: {getProblematicLineItems().map(item => item.description).filter(Boolean).join(', ')}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {getOverallMarginStatus() === 'success' && (
            <Alert className="border-green-200 bg-green-50/50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Excellent Margin Performance</AlertTitle>
              <AlertDescription className="text-green-700">
                Congratulations! Your margin of {calculateAchievedMargin().toFixed(1)}% meets or exceeds your target of {targetMarginPercent}%. 
                This estimate maintains healthy profitability.
              </AlertDescription>
            </Alert>
          )}

          {/* Contingency and Total */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contingency-percent">Contingency %</Label>
                <Input
                  id="contingency-percent"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={contingencyPercent}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setContingencyPercent(Math.min(Math.max(value, 0), 50));
                  }}
                  placeholder="10.0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contingency-used">Contingency Used</Label>
                <Input
                  id="contingency-used"
                  type="number"
                  step="0.01"
                  value={contingencyUsed}
                  onChange={(e) => setContingencyUsed(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Subtotal */}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-semibold">
                  ${calculateTotal().toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>

              <Separator />

              {/* Contingency as Line Item */}
              <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Contingency ({contingencyPercent}%)</span>
                  <span className="text-xs text-muted-foreground">Buffer for unforeseen costs</span>
                </div>
                <span className="text-lg font-semibold">
                  ${calculateContingencyAmount().toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center py-3 border-t-2 border-primary">
                <span className="text-lg font-semibold">Total with Contingency</span>
                <span className="text-2xl font-bold text-primary">
                  ${(calculateTotal() + calculateContingencyAmount()).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1" disabled={isLoading || isCreatingVersion}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : (initialEstimate ? "Update Estimate" : "Create Estimate")}
            </Button>
            
            {/* Version button - only show when editing */}
            {initialEstimate && (
              <Button 
                onClick={handleSaveAsNewVersion} 
                variant="outline"
                disabled={isLoading || isCreatingVersion}
              >
                {isCreatingVersion ? "Creating..." : "Save as New Version"}
              </Button>
            )}
            
            <Button onClick={onCancel} variant="outline" disabled={isLoading || isCreatingVersion}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
