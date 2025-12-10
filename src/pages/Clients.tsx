import { ClientsList } from "@/components/ClientsList";
import { PageHeader } from "@/components/ui/page-header";
import { UserCheck } from "lucide-react";

const Clients = () => {
  return (
    <div className="space-y-4">
      <PageHeader
        icon={UserCheck}
        title="Clients"
        description="Manage client information and contacts"
      />
      <ClientsList />
    </div>
  );
};

export default Clients;