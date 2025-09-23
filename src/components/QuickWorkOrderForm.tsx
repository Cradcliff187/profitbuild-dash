import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateProjectNumber } from "@/types/project";
import { useToast } from "@/hooks/use-toast";

interface QuickWorkOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const QuickWorkOrderForm = ({ onSuccess, onCancel }: QuickWorkOrderFormProps) => {
  const [formData, setFormData] = useState({
    projectNumber: '',  // Will be set async
    clientName: '',
    projectName: '',
    estimatedAmount: '',
    startDate: new Date(),
  });

  // Initialize project number on mount
  useEffect(() => {
    const initProjectNumber = async () => {
      const number = await generateProjectNumber();
      setFormData(prev => ({ ...prev, projectNumber: number }));
    };
    initProjectNumber();
  }, []);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName.trim() || !formData.projectName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create the work order project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          project_number: formData.projectNumber,
          project_name: formData.projectName,
          client_name: formData.clientName,
          project_type: 'work_order',
          status: 'in_progress',
          start_date: formData.startDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (projectError) {
        throw new Error('Failed to create work order');
      }

      // If there's an estimated amount, create a simple estimate
      if (formData.estimatedAmount && parseFloat(formData.estimatedAmount) > 0) {
        const { error: estimateError } = await supabase
          .from('estimates')
          .insert({
            project_id: project.id,
            estimate_number: `EST-${formData.projectNumber}`,
            total_amount: parseFloat(formData.estimatedAmount),
            status: 'approved',
            date_created: new Date().toISOString().split('T')[0],
          });

        if (estimateError) {
          console.warn('Failed to create estimate, but work order was created successfully');
        }
      }

      toast({
        title: "Success",
        description: "Work order created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating work order:', error);
      toast({
        title: "Error",
        description: "Failed to create work order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateProjectNumber = async () => {
    const number = await generateProjectNumber();
    setFormData(prev => ({
      ...prev,
      projectNumber: number
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="projectNumber">Project Number</Label>
        <div className="flex gap-2">
          <Input
            id="projectNumber"
            value={formData.projectNumber}
            readOnly
            className="bg-muted"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={regenerateProjectNumber}
          >
            Regenerate
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientName">Client Name *</Label>
        <Input
          id="clientName"
          value={formData.clientName}
          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
          placeholder="Enter client name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectName">Description/Project Name *</Label>
        <Textarea
          id="projectName"
          value={formData.projectName}
          onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
          placeholder="Describe the work to be done"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimatedAmount">Estimated Amount (Optional)</Label>
        <Input
          id="estimatedAmount"
          type="number"
          step="0.01"
          min="0"
          value={formData.estimatedAmount}
          onChange={(e) => setFormData(prev => ({ ...prev, estimatedAmount: e.target.value }))}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label>Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.startDate}
              onSelect={(date) => date && setFormData(prev => ({ ...prev, startDate: date }))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Work Order
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default QuickWorkOrderForm;