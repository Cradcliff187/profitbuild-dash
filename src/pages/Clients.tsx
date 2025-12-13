import { ClientsList } from "@/components/ClientsList";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { UserCheck } from "lucide-react";

const Clients = () => {
  return (
    <MobilePageWrapper className="space-y-4">
      <PageHeader
        icon={UserCheck}
        title="Clients"
        description="Manage client information and contacts"
      />
      <ClientsList />
    </MobilePageWrapper>
  );
};

export default Clients;