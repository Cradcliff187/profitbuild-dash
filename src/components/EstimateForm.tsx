import { useState, useEffect, useRef } from "react";
import { Save, Plus, Trash2, Calculator, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/ui/required-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableField, CalculatedField, ReadOnlyField } from "@/components/ui/field-types";
import { Estimate, LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP, EstimateStatus } from "@/types/estimate";
import { Project } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProjectSelectorNew } from "@/components/ProjectSelectorNew";
import { LineItemTable } from "@/components/LineItemTable";
import { LineItemDetailModal } from "@/components/LineItemDetailModal";
import { EstimateStatusActions } from "@/components/EstimateStatusActions";
import { getRecommendedUnitCodes } from "@/utils/units";
import { useIsMobile } from "@/hooks/use-mobile";



interface EstimateFormProps {
  initialEstimate?: Estimate; // For editing mode
  preselectedProjectId?: string; // For linking from project page
  onSave: (estimate: Estimate) => void;
  onCancel: () => void;
}

export const EstimateForm = ({ initialEstimate, preselectedProjectId, onSave, onCancel }: EstimateFormProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Form state
  const [projectId, setProjectId] = useState(preselectedProjectId || initialEstimate?.project_id || "");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState<Date>(initialEstimate?.date_created || new Date());
  const [validUntil, setValidUntil] = useState<Date | undefined>(initialEstimate?.valid_until);
  const [notes, setNotes] = useState(initialEstimate?.notes || "");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [contingencyPercent, setContingencyPercent] = useState(initialEstimate?.contingency_percent || 10.0);
  const [status, setStatus] = useState<EstimateStatus>(initialEstimate?.status || 'draft');
  const [isLoading, setIsLoading] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  
  // View state for line items
  const [selectedLineItemForEdit, setSelectedLineItemForEdit] = useState<LineItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);

useEffect(() => {
  // Load available projects once on mount
  loadAvailableProjects();
  
  // Initialize line items
  if (initialEstimate) {
    loadEstimateLineItems(initialEstimate.id);
  } else {
    setLineItems([createNewLineItem()]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  // Load project data when projectId changes
  if (projectId) {
    loadProjectData();
  }
}, [projectId]);

useEffect(() => {
  // If a project is preselected via URL, set it
  if (preselectedProjectId && !projectId) {
    setProjectId(preselectedProjectId);
  }
}, [preselectedProjectId]);

  const loadAvailableProjects = async () => {
    setProjectsLoading(true);
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .neq('project_number', 'SYS-000')
        .neq('project_number', '000-UNASSIGNED')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProjects = projects?.map(project => ({
        ...project,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at),
        start_date: project.start_date ? new Date(project.start_date) : undefined,
        end_date: project.end_date ? new Date(project.end_date) : undefined,
      })) || [];

      setAvailableProjects(formattedProjects);
    } catch (error) {
      console.error('Error loading available projects:', error);
      
      const isNetworkError = error instanceof TypeError && 
                             error.message.includes('fetch');
      
      toast({
        title: isNetworkError ? "Connection Error" : "Error Loading Projects",
        description: isNetworkError 
          ? "Please check your internet connection and try again."
          : "Failed to load projects. If this persists, contact support.",
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadAvailableProjects()}
          >
            Retry
          </Button>
        )
      });
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setProjectId(project.id);
    
    // Auto-populate fields from the selected project
    setClientName(project.client_name || '');
    setProjectName(project.project_name || '');
  };

  const handleCreateNewProject = (newProject: Project) => {
    // Add the new project to the available projects list
    setAvailableProjects(prev => [newProject, ...prev]);
    // Auto-select the new project
    handleProjectSelect(newProject);
  };



  const loadProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('project_name, client_name')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      setProjectName(data.project_name);
      setClientName(data.client_name);
    } catch (error) {
      console.error('Error loading project data:', error);
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
        costPerUnit: item.cost_per_unit || 0,
        markupPercent: item.markup_percent,
        markupAmount: item.markup_amount,
        totalCost: item.total_cost || 0,
        totalMarkup: item.total_markup || 0
      })) || [];

      setLineItems(items as LineItem[]);
    } catch (error) {
      console.error('Error loading line items:', error);
    }
  };

  const generateEstimateNumber = async (projectId: string, projectNumber: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_estimate_number', {
        project_number_param: projectNumber,
        project_id_param: projectId
      });
      
      if (error) {
        console.error('Error generating estimate number:', error);
        // Fallback to timestamp-based number
        const timestamp = Date.now().toString().slice(-4);
        return `EST-${timestamp}`;
      }
      
      return data;
    } catch (error) {
      console.error('Error generating estimate number:', error);
      // Fallback to timestamp-based number
      const timestamp = Date.now().toString().slice(-4);
      return `EST-${timestamp}`;
    }
  };

  // Helper function to detect new items
  const isNewItem = (item: LineItem): boolean => {
    return !item.description.trim() || item.id.includes(Date.now().toString().slice(-5));
  };

  const createNewLineItem = (category: LineItemCategory = LineItemCategory.LABOR): LineItem => {
    // Get default unit for the category
    const recommendedUnits = getRecommendedUnitCodes(category);
    const defaultUnit = recommendedUnits[0] || 'EA';

    return {
      id: Date.now().toString() + Math.random(),
      category,
      description: '',
      quantity: 1,
      pricePerUnit: 0,
      total: 0,
      unit: defaultUnit,
      sort_order: lineItems.length,
      costPerUnit: 0,
      markupPercent: 15, // Default 15% markup
      markupAmount: null,
      totalCost: 0,
      totalMarkup: 0
    };
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          
          // If category is changing on a new item, update unit to new category's default
          if (field === 'category' && isNewItem(item)) {
            const recommendedUnits = getRecommendedUnitCodes(value);
            updated.unit = recommendedUnits[0] || 'EA';
          }
          
          // Recalculate derived values based on what changed
          if (field === 'costPerUnit' || field === 'markupPercent' || field === 'markupAmount') {
            // Calculate pricePerUnit based on markup
            if (updated.markupPercent !== null) {
              // Percentage markup
              updated.pricePerUnit = updated.costPerUnit * (1 + (updated.markupPercent / 100));
            } else if (updated.markupAmount !== null) {
              // Fixed amount markup
              updated.pricePerUnit = updated.costPerUnit + updated.markupAmount;
            }
          }
          
          // Always recalculate totals
          updated.total = updated.quantity * updated.pricePerUnit;
          updated.totalCost = updated.quantity * updated.costPerUnit;
          updated.totalMarkup = updated.quantity * (updated.pricePerUnit - updated.costPerUnit);
          
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

  const duplicateLineItem = (lineItem: LineItem) => {
    const duplicated: LineItem = {
      ...lineItem,
      id: Date.now().toString() + Math.random(),
      description: `${lineItem.description} (Copy)`,
    };
    setLineItems(prev => [...prev, duplicated]);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
  };

  const calculateTotalCost = () => {
    return lineItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  };

  const calculateGrossProfit = () => {
    return calculateTotal() - calculateTotalCost();
  };

  const calculateGrossMarginPercent = () => {
    const total = calculateTotal();
    if (total === 0) return 0;
    return (calculateGrossProfit() / total) * 100;
  };

  const calculateContingencyAmount = () => {
    const total = calculateTotal();
    return total * (contingencyPercent / 100);
  };

  const handleSave = async () => {
    const validLineItems = lineItems.filter(item => item.description.trim());
    
    if (validLineItems.length === 0) {
      toast({
        title: "Missing Line Items",
        description: "Please add at least one line item with a description.",
        variant: "destructive"
      });
      return;
    }

    if (!projectId) {
      toast({
        title: "Missing Project",
        description: "Please select a project for this estimate.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // Optimistic update: Show saving state
    toast({
      title: initialEstimate ? "Updating Estimate" : "Creating Estimate",
      description: "Processing estimate details...",
    });
    
    // Get project data to pass project number to estimate generation
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('project_number')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      toast({
        title: "Error",
        description: "Failed to fetch project information",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    const estimateNumber = await generateEstimateNumber(projectId, projectData.project_number);
    const totalAmount = calculateTotal();
    const contingencyAmount = calculateContingencyAmount();
    
    console.log('Starting estimate save process:', {
      projectId,
      estimateNumber,
      totalAmount,
      lineItemsCount: validLineItems.length,
      isEdit: !!initialEstimate
    });
    
    try {
      
      if (initialEstimate) {
        // Check if this is an approved estimate - if so, create a new version instead of editing
        if (initialEstimate.status === 'approved') {
          // Create new version using the RPC function
          const { data: newVersionId, error: versionError } = await supabase
            .rpc('create_estimate_version', {
              source_estimate_id: initialEstimate.id
            });

          if (versionError) throw versionError;

          // Now update the new version with our changes
          const { data: estimateData, error: updateError } = await supabase
            .from('estimates')
            .update({
              date_created: date.toISOString().split('T')[0],
              total_amount: totalAmount,
              total_cost: calculateTotalCost(),
              notes: notes.trim() || null,
              valid_until: validUntil?.toISOString().split('T')[0],
              contingency_percent: contingencyPercent,
              is_current_version: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', newVersionId)
            .select()
            .single();

          if (updateError) throw updateError;

          // Delete default line items from new version
          await supabase
            .from('estimate_line_items')
            .delete()
            .eq('estimate_id', newVersionId);

          // Insert updated line items for new version
          const lineItemsData = validLineItems.map((item, index) => ({
            estimate_id: newVersionId,
            category: item.category,
            description: item.description.trim(),
            quantity: item.quantity,
            rate: item.pricePerUnit, // For backward compatibility
            unit: item.unit || null,
            sort_order: index,
            cost_per_unit: item.costPerUnit || 0,
            markup_percent: item.markupPercent,
            markup_amount: item.markupAmount
          }));

          const { error: lineItemsError } = await supabase
            .from('estimate_line_items')
            .insert(lineItemsData)
            .select('id, estimate_id, category, description, quantity, rate, unit, sort_order, cost_per_unit, markup_percent, markup_amount, created_at');

          if (lineItemsError) throw lineItemsError;

          const newVersionEstimate: Estimate = {
            ...initialEstimate,
            id: newVersionId,
            date_created: new Date(estimateData.date_created),
            total_amount: estimateData.total_amount,
            notes: estimateData.notes,
            valid_until: estimateData.valid_until ? new Date(estimateData.valid_until) : undefined,
            contingency_percent: estimateData.contingency_percent,
            contingency_used: 0, // Keep for type compatibility, but set to 0 for new versions
            updated_at: new Date(estimateData.updated_at),
            lineItems: validLineItems,
            version_number: estimateData.version_number,
            is_current_version: true,
            status: 'draft'
          };

          onSave(newVersionEstimate);
          
          toast({
            title: "New Version Created",
            description: `New estimate version v${estimateData.version_number} created successfully.`
          });

        } else {
          // Regular editing for non-approved estimates
          const { data: estimateData, error: estimateError } = await supabase
            .from('estimates')
            .update({
              date_created: date.toISOString().split('T')[0],
              total_amount: totalAmount,
              total_cost: calculateTotalCost(),
              notes: notes.trim() || null,
              valid_until: validUntil?.toISOString().split('T')[0],
              contingency_percent: contingencyPercent,
              updated_at: new Date().toISOString()
            })
            .eq('id', initialEstimate.id)
            .select()
            .single();

          if (estimateError) throw estimateError;

          // Delete existing line items and recreate them
          await supabase
            .from('estimate_line_items')
            .delete()
            .eq('estimate_id', initialEstimate.id);

          // Create new line items
          const lineItemsData = validLineItems.map((item, index) => ({
            estimate_id: initialEstimate.id,
            category: item.category,
            description: item.description.trim(),
            quantity: item.quantity,
            rate: item.pricePerUnit, // For backward compatibility
            unit: item.unit || null,
            sort_order: index,
            cost_per_unit: item.costPerUnit || 0,
            markup_percent: item.markupPercent,
            markup_amount: item.markupAmount
          }));

          const { error: lineItemsError } = await supabase
            .from('estimate_line_items')
            .insert(lineItemsData)
            .select('id, estimate_id, category, description, quantity, rate, unit, sort_order, cost_per_unit, markup_percent, markup_amount, created_at');

          if (lineItemsError) throw lineItemsError;

          const updatedEstimate: Estimate = {
            ...initialEstimate,
            date_created: new Date(estimateData.date_created),
            total_amount: estimateData.total_amount,
            notes: estimateData.notes,
            valid_until: estimateData.valid_until ? new Date(estimateData.valid_until) : undefined,
            contingency_percent: estimateData.contingency_percent,
            contingency_used: estimateData.contingency_used,
            updated_at: new Date(estimateData.updated_at),
            lineItems: validLineItems,
          };

          onSave(updatedEstimate);
          
          toast({
            title: "Estimate Updated",
            description: `Estimate has been updated successfully.`
          });
        }

      } else {
        // Create new estimate - check if project already has estimates
        console.log('Checking if project has existing estimates:', projectId);
        
        const { data: existingEstimates, error: checkError } = await supabase
          .from('estimates')
          .select('id, parent_estimate_id, version_number')
          .eq('project_id', projectId)
          .order('version_number', { ascending: true });

        if (checkError) throw checkError;

        if (existingEstimates && existingEstimates.length > 0) {
          // Project has existing estimates - create new version
          console.log('Project has existing estimates, creating new version');
          
          // Find the root estimate (parent_estimate_id is null)
          const rootEstimate = existingEstimates.find(e => e.parent_estimate_id === null);
          if (!rootEstimate) {
            throw new Error('Could not find root estimate for version creation');
          }

          // Create new version using RPC function
          const { data: newVersionId, error: versionError } = await supabase
            .rpc('create_estimate_version', {
              source_estimate_id: rootEstimate.id
            });

          if (versionError) throw versionError;

          // Update the new version with our data
          const { data: estimateData, error: updateError } = await supabase
            .from('estimates')
            .update({
              date_created: date.toISOString().split('T')[0],
              total_amount: totalAmount,
              total_cost: calculateTotalCost(),
              notes: notes.trim() || null,
              valid_until: validUntil?.toISOString().split('T')[0],
              contingency_percent: contingencyPercent,
              is_current_version: true,
              status: 'draft',
              updated_at: new Date().toISOString()
            })
            .eq('id', newVersionId)
            .select()
            .single();

          if (updateError) throw updateError;

          // Delete default line items from new version and add our line items
          await supabase
            .from('estimate_line_items')
            .delete()
            .eq('estimate_id', newVersionId);

          const lineItemsData = validLineItems.map((item, index) => ({
            estimate_id: newVersionId,
            category: item.category,
            description: item.description.trim(),
            quantity: item.quantity,
            rate: item.pricePerUnit,
            unit: item.unit || null,
            sort_order: index,
            cost_per_unit: item.costPerUnit || 0,
            markup_percent: item.markupPercent,
            markup_amount: item.markupAmount
          }));

          const { error: lineItemsError } = await supabase
            .from('estimate_line_items')
            .insert(lineItemsData)
            .select('id, estimate_id, category, description, quantity, rate, price_per_unit, unit, sort_order, cost_per_unit, markup_percent, markup_amount, created_at');

          if (lineItemsError) throw lineItemsError;

          const newEstimate: Estimate = {
            id: newVersionId,
            project_id: projectId,
            estimate_number: estimateData.estimate_number,
            date_created: new Date(estimateData.date_created),
            total_amount: estimateData.total_amount,
            status: 'draft',
            notes: estimateData.notes,
            valid_until: estimateData.valid_until ? new Date(estimateData.valid_until) : undefined,
            revision_number: estimateData.revision_number,
            lineItems: validLineItems,
            created_at: new Date(estimateData.created_at),
            updated_at: new Date(estimateData.updated_at),
            project_name: projectName,
            client_name: clientName,
            contingency_percent: estimateData.contingency_percent,
            contingency_amount: estimateData.contingency_amount,
            contingency_used: 0, // Keep for type compatibility, but set to 0 for new versions
            version_number: estimateData.version_number,
            parent_estimate_id: estimateData.parent_estimate_id,
            is_current_version: true,
            valid_for_days: estimateData.valid_for_days,
            defaultMarkupPercent: 15,
            targetMarginPercent: 20
          };

          onSave(newEstimate);
          
          toast({
            title: "New Version Created",
            description: `New estimate version v${estimateData.version_number} created successfully.`
          });

        } else {
          // Project has no estimates - create first estimate
          console.log('Project has no estimates, creating first estimate');
          
          const contingencyAmount = calculateContingencyAmount();
          const estimateData = {
            project_id: projectId,
            estimate_number: estimateNumber,
            date_created: date.toISOString().split('T')[0],
            total_amount: totalAmount,
            total_cost: calculateTotalCost(),
            status: 'draft' as const,
            is_draft: true,
            notes: notes.trim() || null,
            valid_until: validUntil?.toISOString().split('T')[0],
            contingency_percent: contingencyPercent,
            contingency_amount: contingencyAmount,
            revision_number: 1,
            version_number: 1,
            parent_estimate_id: null,
            is_current_version: true,
            valid_for_days: 30
          };

          console.log('Creating estimate with data:', estimateData);
          console.log('Valid line items count:', validLineItems.length);

          const { data: createdEstimate, error: estimateError } = await supabase
            .from('estimates')
            .insert(estimateData)
            .select()
            .single();

          if (estimateError) {
            console.error('Database error creating estimate:', estimateError);
            throw estimateError;
          }

          console.log('Estimate created successfully:', createdEstimate);

          // Create line items
          const lineItemsData = validLineItems.map((item, index) => ({
            estimate_id: createdEstimate.id,
            category: item.category,
            description: item.description.trim(),
            quantity: item.quantity,
            rate: item.pricePerUnit, // For backward compatibility
            unit: item.unit || null,
            sort_order: index,
            cost_per_unit: item.costPerUnit || 0,
            markup_percent: item.markupPercent,
            markup_amount: item.markupAmount
          }));

          console.log('Creating line items:', lineItemsData);

          const { error: lineItemsError } = await supabase
            .from('estimate_line_items')
            .insert(lineItemsData)
            .select('id, estimate_id, category, description, quantity, rate, price_per_unit, unit, sort_order, cost_per_unit, markup_percent, markup_amount, created_at');

          if (lineItemsError) {
            console.error('Database error creating line items:', lineItemsError);
            throw lineItemsError;
          }

          console.log('Line items created successfully');

          const newEstimate: Estimate = {
            id: createdEstimate.id,
            project_id: createdEstimate.project_id,
            estimate_number: createdEstimate.estimate_number,
            defaultMarkupPercent: 15,
            targetMarginPercent: 20,
            date_created: new Date(createdEstimate.date_created),
            total_amount: createdEstimate.total_amount,
            status: createdEstimate.status as any,
            notes: createdEstimate.notes,
            valid_until: createdEstimate.valid_until ? new Date(createdEstimate.valid_until) : undefined,
            revision_number: createdEstimate.revision_number,
            contingency_percent: createdEstimate.contingency_percent,
            contingency_amount: createdEstimate.contingency_amount,
            contingency_used: 0, // Default to 0 for new estimates (only used during project execution)
            version_number: createdEstimate.version_number || 1,
            parent_estimate_id: createdEstimate.parent_estimate_id || undefined,
            is_current_version: createdEstimate.is_current_version ?? true,
            valid_for_days: createdEstimate.valid_for_days || 30,
            lineItems: validLineItems,
            created_at: new Date(createdEstimate.created_at),
            updated_at: new Date(createdEstimate.updated_at),
            project_name: projectName,
            client_name: clientName
          };

          console.log('Final estimate object:', newEstimate);

          onSave(newEstimate);
          
          toast({
            title: "First Estimate Created",
            description: `Estimate ${estimateNumber} has been created successfully.`
          });
        }
      }

    } catch (error) {
      console.error('Error saving estimate - Full error object:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        projectId,
        estimateNumber,
        lineItemsCount: validLineItems.length
      });
      
      toast({
        title: "Error",
        description: `Failed to save estimate: ${error?.message || 'Unknown error'}. Please check the console for details.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If still loading projects, show loading state
  if (projectsLoading && !preselectedProjectId && !initialEstimate) {
    return (
      <div className="form-dense space-y-2">
        <Card>
          <CardContent className="py-6">
            <div className="text-center">Loading projects...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="form-dense space-y-2">
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base">
            {initialEstimate ? 'Edit Estimate' : 'Create Estimate'}
            {projectName && (
              <div className="text-xs font-normal text-muted-foreground mt-1">
                Project: {projectName} • Client: {clientName}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {/* Project Selection - Show if no project is preselected */}
          {!preselectedProjectId && !initialEstimate && (
            <div className="space-y-2">
              <RequiredLabel>Select Project</RequiredLabel>
              {!projectsLoading && availableProjects.length > 0 && (
                <ProjectSelectorNew
                  projects={availableProjects}
                  selectedProject={selectedProject}
                  onSelect={handleProjectSelect}
                  onCreateNew={handleCreateNewProject}
                  placeholder="Choose a project for this estimate..."
                />
              )}
            </div>
          )}

          {/* Estimate Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <RequiredLabel>Estimate Date</RequiredLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
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
                      "w-full justify-start text-left font-normal h-9",
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
          </div>

          {/* Notes - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for this estimate..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b">
              <RequiredLabel className="text-sm font-semibold">Line Items</RequiredLabel>
              <Button onClick={addLineItem} variant="default" size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Line Item
              </Button>
            </div>

            <LineItemTable
              lineItems={lineItems}
              onUpdateLineItem={updateLineItem}
              onRemoveLineItem={removeLineItem}
              onAddLineItem={addLineItem}
              onEditDetails={(lineItem) => {
                setSelectedLineItemForEdit(lineItem);
                setIsDetailModalOpen(true);
              }}
              onDuplicateLineItem={duplicateLineItem}
            />
          </div>


          {/* Estimate Summary Section */}
          <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-4 mt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Estimate Summary</h3>
            
            {/* Calculated Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              <CalculatedField
                label="Subtotal"
                value={calculateTotal()}
                formula="Sum of all line item totals"
                tooltip="Total of all line items before contingency"
                variant="default"
                prefix="$"
              />
              
              <CalculatedField
                label="Estimated Gross Profit"
                value={calculateGrossProfit()}
                formula="Subtotal - Total Cost"
                tooltip="Expected profit: Subtotal minus total costs"
                variant={calculateGrossProfit() < 0 ? "destructive" : "success"}
                prefix="$"
              />
              
              <CalculatedField
                label="Estimated Gross Margin"
                value={`${calculateGrossMarginPercent().toFixed(1)}%`}
                formula="(Gross Profit / Subtotal) × 100"
                tooltip="Profit margin percentage"
                variant={
                  calculateGrossMarginPercent() < 0 
                    ? "destructive" 
                    : calculateGrossMarginPercent() < 20 
                      ? "warning" 
                      : "success"
                }
              />
              
              <div className="relative">
                <CalculatedField
                  label={`Contingency (${contingencyPercent}%)`}
                  value={calculateContingencyAmount()}
                  formula={`${contingencyPercent}% of Subtotal`}
                  tooltip="Click to edit contingency percentage"
                  variant="default"
                  prefix="$"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={contingencyPercent}
                  onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)}
                  className="absolute top-1 right-1 w-12 h-5 px-1 text-xs border rounded text-right bg-white/90 hover:bg-white focus:bg-white focus:ring-1 focus:ring-primary"
                  title="Edit contingency percentage"
                />
              </div>
            </div>

            {/* Final Total */}
            <div className="border-t-2 border-slate-300 pt-3">
              <CalculatedField
                label="Total with Contingency"
                value={calculateTotal() + calculateContingencyAmount()}
                formula="Subtotal + Contingency Amount"
                tooltip="Final estimate total including contingency"
                variant="success"
                className="text-center"
                prefix="$"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : (initialEstimate ? "Update Estimate" : "Create Estimate")}
            </Button>
            <Button onClick={onCancel} variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </div>

          {/* Status Actions - Only show for existing estimates */}
          {initialEstimate && (
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-center">
                <EstimateStatusActions
                  estimateId={initialEstimate.id}
                  currentStatus={status}
                  onStatusUpdate={(newStatus) => setStatus(newStatus)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Item Detail Modal */}
      <LineItemDetailModal
        lineItem={selectedLineItemForEdit}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLineItemForEdit(null);
        }}
        onSave={(updatedLineItem) => {
          // Update the line item in the list
          setLineItems(prev => prev.map(item => 
            item.id === updatedLineItem.id ? updatedLineItem : item
          ));
        }}
      />
    </div>
  );
};