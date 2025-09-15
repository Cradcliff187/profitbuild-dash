import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { VendorForm } from "@/components/VendorForm";
import { VendorsList } from "@/components/VendorsList";
import { VendorImportModal } from "@/components/VendorImportModal";
import type { Vendor } from "@/types/vendor";

const Vendors = () => {
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | undefined>(undefined);
  const [refreshList, setRefreshList] = useState(false);

  const handleAddNew = () => {
    setSelectedVendor(undefined);
    setShowForm(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedVendor(undefined);
    setRefreshList(true);
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    setRefreshList(true);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedVendor(undefined);
  };

  const handleRefreshComplete = () => {
    setRefreshList(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendors</h1>
          <p className="text-muted-foreground">Manage your construction vendors</p>
        </div>
        {!showForm && (
          <div className="flex space-x-2">
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </div>
        )}
      </div>

      {showForm ? (
        <VendorForm
          vendor={selectedVendor}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      ) : (
        <VendorsList
          onEdit={handleEdit}
          refresh={refreshList}
          onRefreshComplete={handleRefreshComplete}
        />
      )}

      <VendorImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default Vendors;