import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ClientForm } from '@/components/ClientForm';
import { Client } from '@/types/client';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [showClientForm, setShowClientForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
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

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.client_name.toLowerCase().includes(query) ||
      client.company_name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const selectedClient = clients.find(client => client.id === value);

  const handleValueChange = (val: string) => {
    const client = clients.find(c => c.id === val);
    onValueChange(val, client?.client_name);
  };

  const handleClientCreated = (newClient: Client) => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    setShowClientForm(false);
    // Auto-select the newly created client
    setTimeout(() => {
      onValueChange(newClient.id, newClient.client_name);
    }, 100);
  };

  return (
    <div className={cn(showLabel && "space-y-2")}>
      {showLabel && (
        <Label className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          Client
        </Label>
      )}
      
      <div className="flex gap-2">
        <Select
          value={value}
          onValueChange={handleValueChange}
        >
          <SelectTrigger 
            className={cn(
              "flex-1",
              error && "border-destructive"
            )}
            onBlur={onBlur}
          >
            <SelectValue placeholder={placeholder}>
              {selectedClient && (
                <span className="truncate">
                  {selectedClient.client_name}
                  {selectedClient.company_name && ` (${selectedClient.company_name})`}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {/* Search Input */}
            <div className="flex items-center border-b border-border px-3 pb-2 pt-2 focus-within:border-2 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/20 focus-within:ring-offset-0 transition-colors">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>

            {isLoading ? (
              <SelectItem value="__loading__" disabled>Loading clients...</SelectItem>
            ) : filteredClients.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No clients match your search' : 'No clients found'}
              </div>
            ) : (
              <>
                {filteredClients.map((client) => (
                  <SelectItem 
                    key={client.id} 
                    value={client.id}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{client.client_name}</span>
                      {client.company_name && (
                        <span className="text-xs text-muted-foreground">{client.company_name}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowClientForm(true)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">New Client</span>
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
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
