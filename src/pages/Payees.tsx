import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Building, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { PayeeForm } from "@/components/PayeeForm";
import { PayeesList } from "@/components/PayeesList";
import { PayeeImportModal } from "@/components/PayeeImportModal";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Payee } from "@/types/payee";

const Payees = () => {
  const isMobile = useIsMobile();
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<Payee | undefined>(undefined);
  const [refreshList, setRefreshList] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleAddNew = () => {
    setSelectedPayee(undefined);
    setShowEditSheet(true);
  };

  const handleEdit = (payee: Payee) => {
    setSelectedPayee(payee);
    setShowEditSheet(true);
  };

  const handleFormSuccess = () => {
    setShowEditSheet(false);
    setSelectedPayee(undefined);
    setRefreshList(true);
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    setRefreshList(true);
  };

  const handleFormCancel = () => {
    setShowEditSheet(false);
    setSelectedPayee(undefined);
  };

  const handleRefreshComplete = () => {
    setRefreshList(false);
  };

  return (
    <MobilePageWrapper className="space-y-4">
      <PageHeader
        icon={Users}
        title="Payees"
        description="Manage vendors, subcontractors, and payees"
        actions={
          <>
            <div className="hidden sm:flex">
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
            <Button onClick={handleAddNew} className="hidden sm:flex">
              <Plus className="h-4 w-4 mr-2" />
              Add Payee
            </Button>
          </>
        }
      />

      <PayeesList
        onEdit={handleEdit}
        refresh={refreshList}
        onRefreshComplete={handleRefreshComplete}
      />

      {/* Edit/Add Payee Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
          <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
            <SheetTitle>{selectedPayee ? 'Edit Payee' : 'Add New Payee'}</SheetTitle>
            <SheetDescription>
              {selectedPayee 
                ? 'Update payee information and save changes' 
                : 'Create a new payee for expenses, invoices, and payments'}
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <PayeeForm
              payee={selectedPayee}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              isSubmittingRef={isSubmittingRef}
            />
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={handleFormCancel}
              disabled={isSubmittingRef.current}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="payee-form"
              disabled={isSubmittingRef.current}
            >
              {isSubmittingRef.current ? "Saving..." : (selectedPayee ? "Update Payee" : "Add Payee")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <PayeeImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Mobile FAB */}
      {isMobile && (
        <Button
          variant="default"
          onClick={handleAddNew}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </MobilePageWrapper>
  );
};

export default Payees;