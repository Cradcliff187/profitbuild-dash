import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { PayeesList, PayeesListRef } from "@/components/PayeesList";
import { useIsMobile } from "@/hooks/use-mobile";

const Payees = () => {
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const payeesListRef = useRef<PayeesListRef>(null);
  const isMobile = useIsMobile();

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={Users}
        title="Payees"
        description="Manage vendors, subcontractors, and payees"
        actions={
          <>
            <Button 
              onClick={() => payeesListRef.current?.openNewForm()} 
              size="sm" 
              className="h-btn-compact text-label text-white hidden sm:flex"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Payee
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="h-btn-compact text-label hidden sm:flex"
            >
              <Upload className="h-3 w-3 mr-1" />
              Import CSV
            </Button>
          </>
        }
      />
      <PayeesList 
        ref={payeesListRef}
        showForm={showForm}
        setShowForm={setShowForm}
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
      />

      {/* Mobile FAB */}
      {isMobile && (
        <Button
          variant="default"
          onClick={() => payeesListRef.current?.openNewForm()}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Plus className="h-6 w-6 !text-white" />
        </Button>
      )}
    </MobilePageWrapper>
  );
};

export default Payees;