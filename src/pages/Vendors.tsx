import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { VendorForm } from "@/components/VendorForm";
import { VendorsList } from "@/components/VendorsList";
import type { Vendor } from "@/types/vendor";

const Vendors = () => {
  const [showForm, setShowForm] = useState(false);
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
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
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
    </div>
  );
};

export default Vendors;