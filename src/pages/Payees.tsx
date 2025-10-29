import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { PayeeForm } from "@/components/PayeeForm";
import { PayeesList } from "@/components/PayeesList";
import { PayeeImportModal } from "@/components/PayeeImportModal";
import type { Payee } from "@/types/payee";

const Payees = () => {
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<Payee | undefined>(undefined);
  const [refreshList, setRefreshList] = useState(false);

  const handleAddNew = () => {
    setSelectedPayee(undefined);
    setShowForm(true);
  };

  const handleEdit = (payee: Payee) => {
    setSelectedPayee(payee);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedPayee(undefined);
    setRefreshList(true);
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    setRefreshList(true);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedPayee(undefined);
  };

  const handleRefreshComplete = () => {
    setRefreshList(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Payees</h1>
          <p className="text-muted-foreground">Manage your construction payees</p>
        </div>
        {!showForm && (
          <div className="flex space-x-2">
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payee
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </div>
        )}
      </div>

      {showForm ? (
        <PayeeForm
          payee={selectedPayee}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      ) : (
        <PayeesList
          onEdit={handleEdit}
          refresh={refreshList}
          onRefreshComplete={handleRefreshComplete}
        />
      )}

      <PayeeImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default Payees;