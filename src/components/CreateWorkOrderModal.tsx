import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, FileText } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QuickWorkOrderForm from "./QuickWorkOrderForm";

interface CreateWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateWorkOrderModal = ({ open, onOpenChange }: CreateWorkOrderModalProps) => {
  const [selectedOption, setSelectedOption] = useState<'quick' | 'estimate' | null>(null);
  const navigate = useNavigate();

  const handleClose = () => {
    setSelectedOption(null);
    onOpenChange(false);
  };

  const handleSuccess = () => {
    handleClose();
  };

  const handleEstimateOption = () => {
    handleClose();
    // Navigate to estimates page to create a new project with estimate
    navigate('/estimates?create=work_order');
  };

  if (selectedOption === 'quick') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Work Order</DialogTitle>
            <DialogDescription>
              Create a work order and start tracking expenses immediately
            </DialogDescription>
          </DialogHeader>
          <QuickWorkOrderForm onSuccess={handleSuccess} onCancel={handleClose} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Work Order</DialogTitle>
          <DialogDescription>
            Choose how you'd like to create your work order
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">Quick Work Order</CardTitle>
              </div>
              <CardDescription>
                Skip estimates and start working immediately
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Auto-generated project number</li>
                <li>• Basic project details</li>
                <li>• Optional estimated amount</li>
                <li>• Starts as "In Progress"</li>
              </ul>
              <Button className="w-full mt-4" onClick={() => setSelectedOption('quick')}>
                Create Quick Work Order
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Work Order with Estimate</CardTitle>
              </div>
              <CardDescription>
                Create detailed estimates before starting work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Detailed line item estimates</li>
                <li>• Client approval process</li>
                <li>• Professional documentation</li>
                <li>• Better cost control</li>
              </ul>
              <Button variant="outline" className="w-full mt-4" onClick={handleEstimateOption}>
                Create with Estimate
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkOrderModal;