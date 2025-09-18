import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";
import { useQuery } from "@tanstack/react-query";
import { ClientForm } from "./ClientForm";

interface ClientSelectorProps {
  value?: string;
  onValueChange: (clientId: string, clientName?: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const ClientSelector = ({ 
  value, 
  onValueChange, 
  placeholder = "Select client...",
  required = false 
}: ClientSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [searchValue, setSearchValue] = useState("");

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

  const filteredClients = clients.filter(client =>
    client.client_name.toLowerCase().includes(searchValue.toLowerCase()) ||
    client.company_name?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleClientCreated = () => {
    setShowClientForm(false);
    refetch();
  };

  return (
    <div className="space-y-2">
      <Label className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
        Client
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedClient ? (
              <span className="truncate">
                {selectedClient.client_name}
                {selectedClient.company_name && ` (${selectedClient.company_name})`}
              </span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput 
              placeholder="Search clients..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2">
                  <p className="text-sm text-muted-foreground mb-2">No clients found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowClientForm(true);
                      setOpen(false);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Client
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setShowClientForm(true);
                    setOpen(false);
                  }}
                  className="font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Client
                </CommandItem>
                {filteredClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={() => {
                      onValueChange(client.id, client.client_name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 truncate">
                      <div className="font-medium">{client.client_name}</div>
                      {client.company_name && (
                        <div className="text-sm text-muted-foreground">{client.company_name}</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showClientForm && (
        <ClientForm
          onSave={handleClientCreated}
          onCancel={() => setShowClientForm(false)}
        />
      )}
    </div>
  );
};