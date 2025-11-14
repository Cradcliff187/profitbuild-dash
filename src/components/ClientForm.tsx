import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableField } from "@/components/ui/field-types";
import { supabase } from "@/integrations/supabase/client";
import { Client, ClientType, CLIENT_TYPES, CreateClientRequest, PAYMENT_TERMS } from "@/types/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientFormProps {
  client?: Client | null;
  onSave: (createdClient?: Client) => void;
  onCancel: () => void;
}

export const ClientForm = ({ client, onSave, onCancel }: ClientFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: client?.client_name || "",
    company_name: client?.company_name || "",
    contact_person: client?.contact_person || "",
    email: client?.email || "",
    phone: client?.phone || "",
    billing_address: client?.billing_address || "",
    mailing_address: client?.mailing_address || "",
    client_type: client?.client_type || ("residential" as ClientType),
    payment_terms: client?.payment_terms || "Net 30",
    tax_exempt: client?.tax_exempt || false,
    is_active: client?.is_active ?? true,
    notes: client?.notes || "",
  });
  
  const { toast } = useToast();
  const isEditing = !!client;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Client name is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("clients")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", client.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Client updated successfully",
        });
      } else {
        const { data: createdClient, error } = await supabase
          .from("clients")
          .insert([formData as CreateClientRequest])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Client created successfully",
        });

        onSave(createdClient as Client);
        return;
      }

      onSave();
    } catch (error) {
      console.error("Error saving client:", error);
      toast({
        title: "Error",
        description: "Failed to save client",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open onOpenChange={onCancel}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
          <SheetTitle>{isEditing ? "Edit Client" : "Add New Client"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update client information" : "Enter the client details below"}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4" id="client-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client_name">Client Name *</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Enter client name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Enter company name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Enter contact person"
              />
            </div>
            
            <div>
              <Label htmlFor="client_type">Client Type</Label>
              <Select value={formData.client_type} onValueChange={(value: ClientType) => setFormData({ ...formData, client_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client type" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="billing_address">Billing Address</Label>
            <Textarea
              id="billing_address"
              value={formData.billing_address}
              onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
              placeholder="Enter billing address"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="mailing_address">Mailing Address</Label>
            <Textarea
              id="mailing_address"
              value={formData.mailing_address}
              onChange={(e) => setFormData({ ...formData, mailing_address: e.target.value })}
              placeholder="Enter mailing address (if different from billing)"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Select value={formData.payment_terms} onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((terms) => (
                    <SelectItem key={terms} value={terms}>
                      {terms}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tax_exempt"
                  checked={formData.tax_exempt}
                  onCheckedChange={(checked) => setFormData({ ...formData, tax_exempt: checked as boolean })}
                />
                <Label htmlFor="tax_exempt">Tax Exempt</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this client"
              rows={3}
            />
          </div>

          </form>
        </div>
        
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" form="client-form" disabled={isLoading}>
            {isLoading ? "Saving..." : (isEditing ? "Update Client" : "Create Client")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};