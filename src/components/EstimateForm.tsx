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
import { Estimate, LineItem, LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { Project } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProjectSelectorNew } from "@/components/ProjectSelectorNew";
import { LineItemRow } from "@/components/LineItemRow";
import { LineItemTable } from "@/components/LineItemTable";
import { LineItemDetailModal } from "@/components/LineItemDetailModal";



interface EstimateFormProps {
  initialEstimate?: Estimate; // For editing mode
  preselectedProjectId?: string; // For linking from project page
  onSave: (estimate: Estimate) => void;
  onCancel: () => void;
}

export const EstimateForm = ({ initialEstimate, preselectedProjectId, onSave, onCancel }: EstimateFormProps) => {
  const { toast } = useToast();
  
  
  // Form state
  const [projectId, setProjectId] = useState(preselectedProjectId || initialEstimate?.project_id || "");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState<Date>(initialEstimate?.date_created || new Date());
  const [validUntil, setValidUntil] = useState<Date | undefined>(initialEstimate?.valid_until);
  const [notes, setNotes] = useState(initialEstimate?.notes || "");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [contingencyPercent, setContingencyPercent] = useState(initialEstimate?.contingency_percent || 10.0);
  const [contingencyUsed, setContingencyUsed] = useState(initialEstimate?.contingency_used || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [showProjectCreationFirst, setShowProjectCreationFirst] = useState(false);
  
  // View state for line items
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  const [selectedLineItemForEdit, setSelectedLineItemForEdit] = useState<LineItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [createdProjectFromFlow, setCreatedProjectFromFlow] = useState(false);
  const [projectSelectedFromStep1, setProjectSelectedFromStep1] = useState(false);
  
  // Ref for smooth scrolling to Step 2
  const step2Ref = useRef<HTMLDivElement>(null);

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
  // If a project is preselected via URL, ensure we don't show the project creation step
  if (preselectedProjectId && !projectId) {
    setProjectId(preselectedProjectId);
    setShowProjectCreationFirst(false);
  }
}, [preselectedProjectId]);

  const loadAvailableProjects = async () => {
    setProjectsLoading(true);
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
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
      
      // Show project step only when no project is already chosen or preselected
      if (!initialEstimate && !preselectedProjectId && !projectId && !createdProjectFromFlow && !projectSelectedFromStep1) {
        setShowProjectCreationFirst(true);
      }
    } catch (error) {
      console.error('Error loading available projects:', error);
      toast({
        title: "Error",
        description: "Failed to load available projects",
        variant: "destructive"
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
    // Auto-select the new project and transition to estimate form
    handleProjectSelect(newProject);
    setShowProjectCreationFirst(false);
    setCreatedProjectFromFlow(true);
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

  const generateEstimateNumber = () => {
    const timestamp = Date.now().toString().slice(-4);
    return `EST-${timestamp}`;
  };

  const createNewLineItem = (category: LineItemCategory = LineItemCategory.LABOR): LineItem => ({
    id: Date.now().toString() + Math.random(),
    category,
    description: '',
    quantity: 1,
    pricePerUnit: 0,
    total: 0,
    unit: '',
    sort_order: lineItems.length,
    costPerUnit: 0,
    markupPercent: 15, // Default 15% markup
    markupAmount: null,
    totalCost: 0,
    totalMarkup: 0
  });

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          
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
    
    const estimateNumber = generateEstimateNumber();
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
        // Update existing estimate
        const { data: estimateData, error: estimateError } = await supabase
          .from('estimates')
          .update({
            date_created: date.toISOString().split('T')[0],
            total_amount: totalAmount,
            total_cost: calculateTotalCost(),
            notes: notes.trim() || null,
            valid_until: validUntil?.toISOString().split('T')[0],
            contingency_percent: contingencyPercent,
            contingency_used: contingencyUsed,
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
          price_per_unit: item.pricePerUnit,
          unit: item.unit || null,
          sort_order: index,
          cost_per_unit: item.costPerUnit || 0,
          markup_percent: item.markupPercent,
          markup_amount: item.markupAmount
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
          contingency_used: estimateData.contingency_used,
          updated_at: new Date(estimateData.updated_at),
          lineItems: validLineItems,
        };

        onSave(updatedEstimate);
        
        toast({
          title: "Estimate Updated",
          description: `Estimate has been updated successfully.`
        });

      } else {
        // Create new estimate
        const contingencyAmount = calculateContingencyAmount();
        const estimateData = {
          project_id: projectId,
          estimate_number: estimateNumber,
          date_created: date.toISOString().split('T')[0],
          total_amount: totalAmount,
          total_cost: calculateTotalCost(),
          status: 'draft' as const,
          is_draft: true, // Fixed: draft status should have is_draft: true
          notes: notes.trim() || null,
          valid_until: validUntil?.toISOString().split('T')[0],
          contingency_percent: contingencyPercent,
          contingency_amount: contingencyAmount,
          contingency_used: contingencyUsed,
          revision_number: 1,
          version_number: 1,
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
          price_per_unit: item.pricePerUnit,
          unit: item.unit || null,
          sort_order: index,
          cost_per_unit: item.costPerUnit || 0,
          markup_percent: item.markupPercent,
          markup_amount: item.markupAmount
        }));

        console.log('Creating line items:', lineItemsData);

        const { error: lineItemsError } = await supabase
          .from('estimate_line_items')
          .insert(lineItemsData);

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
          contingency_used: createdEstimate.contingency_used,
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
          title: "Estimate Created",
          description: `Estimate ${estimateNumber} has been created successfully.`
        });
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

  // Debug logging
  console.log('EstimateForm Debug:', {
    showProjectCreationFirst,
    projectsLoading,
    availableProjects: availableProjects.length,
    preselectedProjectId,
    initialEstimate: !!initialEstimate
  });

  // Show project selection/creation step first for new estimates
  if (showProjectCreationFirst && !projectsLoading && !projectId && !preselectedProjectId && !initialEstimate) {
    console.log('Showing project step first');
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">1</span>
              Project Selection
              <span className="text-muted-foreground">→</span>
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-medium">2</span>
              <span className="text-muted-foreground">Create Estimate</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a project for this estimate. You can select an existing project or create a new one.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProjectSelectorNew
              projects={availableProjects}
              selectedProject={selectedProject}
              onSelect={(project) => {
                handleProjectSelect(project);
                setShowProjectCreationFirst(false);
                setProjectSelectedFromStep1(true);
                
                // Show success toast
                toast({
                  title: "Project Selected",
                  description: `Selected "${project.project_name}" for this estimate.`
                });
                
                // Smooth scroll to Step 2 after a brief delay
                setTimeout(() => {
                  step2Ref.current?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }, 100);
              }}
              onCreateNew={handleCreateNewProject}
              placeholder="Select a project or create a new one..."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If still loading projects, show loading state
  if (projectsLoading && !preselectedProjectId && !initialEstimate) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">Loading projects...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card ref={step2Ref}>
        <CardHeader>
          <CardTitle>
            {initialEstimate ? 'Edit Estimate' : (
              createdProjectFromFlow ? 'Create Estimate' : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-medium">1</span>
                  <span className="text-muted-foreground line-through">Create Project</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">2</span>
                  Create Estimate
                </div>
              )
            )}
            {projectName && (
              <div className="text-sm font-normal text-muted-foreground mt-1">
                Project: {projectName} • Client: {clientName}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selected Project Summary - Show when coming from Step 1 */}
          {projectSelectedFromStep1 && selectedProject && (
            <div className="bg-accent/50 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Selected Project</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProject.project_name} • {selectedProject.client_name}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setShowProjectCreationFirst(true);
                    setProjectSelectedFromStep1(false);
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          )}
          
          {/* Project Selection - Only show if no project is preselected and we didn't just create one or select one from Step 1 */}
          {!preselectedProjectId && !initialEstimate && !createdProjectFromFlow && !projectSelectedFromStep1 && (
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
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
                rows={1}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <RequiredLabel className="text-lg font-semibold">Line Items</RequiredLabel>
              <div className="flex items-center space-x-2">
                {/* View Toggle */}
                <div className="flex rounded-md border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode('compact')}
                    className={`px-3 py-1 text-sm ${
                      viewMode === 'compact'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('detailed')}
                    className={`px-3 py-1 text-sm ${
                      viewMode === 'detailed'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    Detailed
                  </button>
                </div>
                <Button onClick={addLineItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>
            </div>

            {/* Line Items - Conditional Rendering */}
            {viewMode === 'compact' ? (
              <LineItemTable
                lineItems={lineItems}
                onUpdateLineItem={updateLineItem}
                onRemoveLineItem={removeLineItem}
                onAddLineItem={addLineItem}
                onEditDetails={(lineItem) => {
                  setSelectedLineItemForEdit(lineItem);
                  setIsDetailModalOpen(true);
                }}
              />
            ) : (
              <div className="space-y-4">
                {lineItems.map(lineItem => (
                  <LineItemRow
                    key={lineItem.id}
                    lineItem={lineItem}
                    onUpdate={updateLineItem}
                    onRemove={removeLineItem}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Contingency Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contingency-percent">Contingency %</Label>
              <Input
                id="contingency-percent"
                type="number"
                step="0.1"
                value={contingencyPercent}
                onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contingency-used">Contingency Used</Label>
              <Input
                id="contingency-used"
                type="number"
                step="0.01"
                value={contingencyUsed}
                onChange={(e) => setContingencyUsed(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Total */}
          <div className="space-y-4">
            <div className="text-right space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-lg font-semibold">
                  ${calculateTotal().toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Estimated Gross Profit</div>
                <div className={`text-lg font-semibold ${calculateGrossProfit() < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  ${calculateGrossProfit().toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Estimated Gross Margin %</div>
                <div className={`text-lg font-semibold ${calculateGrossMarginPercent() < 0 ? 'text-destructive' : calculateGrossMarginPercent() < 20 ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {calculateGrossMarginPercent().toFixed(1)}%
                </div>
              </div>
              <div className="border-t pt-2">
                <div className="text-sm text-muted-foreground">Contingency ({contingencyPercent}%)</div>
                <div className="text-lg font-semibold">
                  ${calculateContingencyAmount().toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
              <div className="border-t pt-2">
                <div className="text-sm text-muted-foreground">Total with Contingency</div>
                <div className="text-2xl font-bold text-primary">
                  ${(calculateTotal() + calculateContingencyAmount()).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
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