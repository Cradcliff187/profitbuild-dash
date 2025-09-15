import { useState } from "react";
import { Calculator } from "lucide-react";
import { EstimateForm } from "@/components/EstimateForm";
import { EstimatesList } from "@/components/EstimatesList";
import { Estimate } from "@/types/estimate";

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const Estimates = () => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);

  const handleSaveEstimate = (estimate: Estimate) => {
    if (selectedEstimate) {
      // Editing existing estimate
      setEstimates(prev => prev.map(e => e.id === estimate.id ? estimate : e));
    } else {
      // Creating new estimate
      setEstimates(prev => [...prev, estimate]);
    }
    setViewMode('list');
    setSelectedEstimate(null);
  };

  const handleCreateNew = () => {
    setSelectedEstimate(null);
    setViewMode('create');
  };

  const handleEdit = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setViewMode('edit');
  };

  const handleView = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setViewMode('view');
  };

  const handleDelete = (id: string) => {
    setEstimates(prev => prev.filter(e => e.id !== id));
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedEstimate(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estimates</h1>
          <p className="text-muted-foreground">Create and manage project estimates</p>
        </div>
      </div>

      {viewMode === 'list' && (
        <EstimatesList
          estimates={estimates}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <EstimateForm
          onSave={handleSaveEstimate}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default Estimates;