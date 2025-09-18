import { useState, useEffect } from "react";
import { Calculator, Building2, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Project, ProjectType, generateProjectNumber } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [clientName, setClientName] = useState("");
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
  const [isLoading, setIsLoading] = useState(false);

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
    } else {
      setProjectNumber(generateProjectNumber());
    }
    loadExistingProjects();
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
        rate: item.rate,
        total: item.total,
        unit: item.unit,
        sort_order: item.sort_order
      })) || [];

      setLineItems(items as LineItem[]); // Cast the database result to our interface
    } catch (error) {
      console.error('Error loading line items:', error);
    }
  };

  const generateEstimateNumber = (projectNum: string) => {
    return `EST-${projectNum}-${Date.now().toString().slice(-4)}`;
  };

  const createNewLineItem = (category: LineItemCategory = LineItemCategory.LABOR): LineItem => ({
    id: Date.now().toString() + Math.random(),
    category,
    description: '',
    quantity: 1,
    rate: 0,
    total: 0,
    unit: '',
    sort_order: lineItems.length
  });

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
          if (field === 'quantity' || field === 'rate') {
            updated.total = updated.quantity * updated.rate;
          }
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
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const calculateContingencyAmount = () => {
    const total = calculateTotal();
    return total * (contingencyPercent / 100);
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

    if (projectMode === 'new') {
      if (!projectName.trim() || !clientName.trim()) {
        toast({
          title: "Missing Project Information",
          description: "Please fill in project name and client name.",
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
            notes: notes.trim() || undefined,
            valid_until: validUntil?.toISOString().split('T')[0],
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
          rate: item.rate,
          total: item.quantity * item.rate,
          unit: item.unit || undefined,
          sort_order: index
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
            client_name: clientName.trim(),
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
          status: 'draft' as const,
          notes: notes.trim() || undefined,
          valid_until: validUntil?.toISOString().split('T')[0],
          contingency_percent: contingencyPercent,
          contingency_used: contingencyUsed,
          revision_number: 1
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
        rate: item.rate,
        total: item.quantity * item.rate,
        unit: item.unit || undefined,
        sort_order: index
      }));

      const { error: lineItemsError } = await supabase
        .from('estimate_line_items')
        .insert(lineItemsData);

      if (lineItemsError) throw lineItemsError;

      const newEstimate: Estimate = {
        id: estimateData.id,
        project_id: estimateData.project_id,
        estimate_number: estimateData.estimate_number,
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

  const regenerateProjectNumber = () => {
    setProjectNumber(generateProjectNumber());
  };

  const selectedProject = existingProjects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {initialEstimate ? 'Edit Estimate' : 'Create New Estimate'}
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
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter client name"
                    />
                  </div>
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
                    <Input
                      id="jobType"
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      placeholder="e.g., Residential, Commercial"
                    />
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
                <Label>Estimate Date</Label>
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

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <Button onClick={addLineItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
            </div>

            {/* Line Items Header */}
            <div className="grid grid-cols-12 gap-4 p-2 text-sm font-medium text-muted-foreground border-b">
              <div className="col-span-2">Category</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Rate</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1"></div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              {lineItems.map(lineItem => (
                <div key={lineItem.id} className="grid grid-cols-12 gap-4 items-center">
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
                  
                  <div className="col-span-4">
                    <Input
                      value={lineItem.description}
                      onChange={(e) => updateLineItem(lineItem.id, 'description', e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  
                  <div className="col-span-2">
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
                      value={lineItem.rate}
                      onChange={(e) => updateLineItem(lineItem.id, 'rate', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="col-span-1 text-right font-medium">
                    ${(lineItem.quantity * lineItem.rate).toFixed(2)}
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
              ))}
            </div>
          </div>

          {/* Contingency and Total */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contingency-percent">Contingency %</Label>
                <Input
                  id="contingency-percent"
                  type="number"
                  step="0.1"
                  value={contingencyPercent}
                  onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)}
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
                <div className="text-2xl font-bold">
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
              {isLoading ? "Creating..." : "Create Estimate"}
            </Button>
            <Button onClick={onCancel} variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
