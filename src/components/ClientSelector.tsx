import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";
import { useQuery } from "@tanstack/react-query";
import { ClientForm } from "./ClientForm";

interface ClientSelectorProps {
  value?: string;
  onValueChange: (clientId: string, clientName?: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  showLabel?: boolean;
}

export const ClientSelector = ({ 
  value, 
  onValueChange,
  onBlur,
  placeholder = "Select client...",
  required = false,
  error = "",
  showLabel = true
}: ClientSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: clients = [], refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)
        .order("client_name");
      
      if (error) throw error;
      return data as Client[];
    },
  });

  const selectedClient = clients.find(client => client.id === value);

  // Enhanced search across multiple fields
  const filteredClients = clients.filter(client => {
    const search = searchValue.toLowerCase();
    return (
      client.client_name.toLowerCase().includes(search) ||
      client.company_name?.toLowerCase().includes(search) ||
      client.contact_person?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search)
    );
  });

  // Auto-focus search when opened
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
      setSearchValue("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredClients.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredClients.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const client = filteredClients[selectedIndex];
      if (client) {
        onValueChange(client.id, client.client_name);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const handleSelect = (client: Client) => {
    onValueChange(client.id, client.client_name);
    setOpen(false);
  };

  const handleClientCreated = (createdClient?: Client) => {
    setShowClientForm(false);
    
    // Add delay to ensure database transaction is committed
    setTimeout(() => {
      refetch();
      
      // Auto-select the newly created client
      if (createdClient) {
        onValueChange(createdClient.id, createdClient.client_name);
      }
    }, 150);
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          Client
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            onBlur={onBlur}
            className={cn(
              "w-full justify-between h-8 text-xs",
              error && "border-destructive"
            )}
          >
            {selectedClient ? (
              <span className="truncate">
                {selectedClient.client_name}
                {selectedClient.company_name && ` (${selectedClient.company_name})`}
              </span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popper-anchor-width] p-0 z-[100]">
          <div className="flex flex-col h-[280px]">
            {/* Search Input */}
            <div className="p-2 border-b">
              <Input
                ref={searchInputRef}
                placeholder="Search clients..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="h-7 text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* Client List */}
            {filteredClients.length > 0 ? (
              <>
                <ScrollArea className="flex-1 pointer-events-auto">
                  <div className="p-1">
                    {filteredClients.map((client, index) => (
                      <div
                        key={client.id}
                        onClick={() => handleSelect(client)}
                        className={cn(
                          "px-2 py-1.5 cursor-pointer rounded text-xs transition-colors",
                          value === client.id && "bg-accent/50",
                          selectedIndex === index && "bg-accent",
                          "hover:bg-accent"
                        )}
                      >
                        <div className="font-medium">{client.client_name}</div>
                        {client.company_name && (
                          <div className="text-muted-foreground">{client.company_name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Footer with Add Button */}
                <div className="p-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                      setShowClientForm(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add New Client
                  </Button>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">No clients found</p>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowClientForm(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add New Client
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      {showClientForm && (
        <ClientForm
          onSave={handleClientCreated}
          onCancel={() => setShowClientForm(false)}
        />
      )}
    </div>
  );
};