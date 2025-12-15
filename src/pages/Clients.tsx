import { useState, useRef } from "react";
import { ClientsList, ClientsListRef } from "@/components/ClientsList";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { Button } from "@/components/ui/button";
import { UserCheck, Plus, Upload } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Clients = () => {
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const clientsListRef = useRef<ClientsListRef>(null);
  const isMobile = useIsMobile();

  return (
    <MobilePageWrapper className="space-y-4">
      <PageHeader
        icon={UserCheck}
        title="Clients"
        description="Manage client information and contacts"
        actions={
          <>
            <Button 
              onClick={() => clientsListRef.current?.openNewForm()} 
              size="sm" 
              className="h-btn-compact text-label text-white hidden sm:flex"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Client
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
      <ClientsList 
        ref={clientsListRef}
        showForm={showForm}
        setShowForm={setShowForm}
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
      />

      {/* Mobile FAB */}
      {isMobile && (
        <Button
          variant="default"
          onClick={() => clientsListRef.current?.openNewForm()}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Plus className="h-6 w-6 !text-white" />
        </Button>
      )}
    </MobilePageWrapper>
  );
};

export default Clients;