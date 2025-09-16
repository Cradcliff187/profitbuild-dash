import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, AlertCircle } from "lucide-react";
import type { QuickBooksAccountMapping, ExpenseCategory } from "@/types/quickbooks";

export const AccountMappingsManager = () => {
  const [mappings, setMappings] = useState<QuickBooksAccountMapping[]>([]);
  const [editingMappings, setEditingMappings] = useState<Record<string, { qb_account_name: string; qb_account_full_path: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const categoryLabels: Record<ExpenseCategory, string> = {
    labor_internal: "Labor (Internal)",
    materials: "Materials & Supplies", 
    equipment: "Equipment Rental",
    subcontractors: "Subcontractor Costs",
    other: "Other Project Expenses"
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('quickbooks_account_mappings')
        .select('*')
        .eq('is_active', true)
        .order('app_category');

      if (error) throw error;
      setMappings(data || []);
    } catch (error) {
      console.error('Error fetching account mappings:', error);
      toast({
        title: "Error",
        description: "Failed to load account mappings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (mapping: QuickBooksAccountMapping) => {
    setEditingMappings({
      ...editingMappings,
      [mapping.id]: {
        qb_account_name: mapping.qb_account_name,
        qb_account_full_path: mapping.qb_account_full_path
      }
    });
  };

  const handleSave = async (mappingId: string) => {
    if (!editingMappings[mappingId]) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('quickbooks_account_mappings')
        .update({
          qb_account_name: editingMappings[mappingId].qb_account_name,
          qb_account_full_path: editingMappings[mappingId].qb_account_full_path,
        })
        .eq('id', mappingId);

      if (error) throw error;

      // Update local state
      setMappings(mappings.map(m => 
        m.id === mappingId 
          ? { ...m, ...editingMappings[mappingId] }
          : m
      ));

      // Remove from editing
      const newEditingMappings = { ...editingMappings };
      delete newEditingMappings[mappingId];
      setEditingMappings(newEditingMappings);

      toast({
        title: "Success",
        description: "Account mapping updated successfully",
      });
    } catch (error) {
      console.error('Error updating account mapping:', error);
      toast({
        title: "Error",
        description: "Failed to update account mapping",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (mappingId: string) => {
    const newEditingMappings = { ...editingMappings };
    delete newEditingMappings[mappingId];
    setEditingMappings(newEditingMappings);
  };

  if (isLoading) {
    return <div>Loading account mappings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          QuickBooks Account Mappings
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          Map your expense categories to QuickBooks accounts for proper sync
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mappings.map((mapping) => (
          <div key={mapping.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{categoryLabels[mapping.app_category]}</Badge>
                <span className="text-sm text-muted-foreground">→</span>
              </div>
              {!editingMappings[mapping.id] && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleEdit(mapping)}
                >
                  Edit
                </Button>
              )}
            </div>

            {editingMappings[mapping.id] ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>QuickBooks Account Name</Label>
                    <Input
                      value={editingMappings[mapping.id].qb_account_name}
                      onChange={(e) => setEditingMappings({
                        ...editingMappings,
                        [mapping.id]: {
                          ...editingMappings[mapping.id],
                          qb_account_name: e.target.value
                        }
                      })}
                      placeholder="Account name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>QuickBooks Account Path</Label>
                    <Input
                      value={editingMappings[mapping.id].qb_account_full_path}
                      onChange={(e) => setEditingMappings({
                        ...editingMappings,
                        [mapping.id]: {
                          ...editingMappings[mapping.id],
                          qb_account_full_path: e.target.value
                        }
                      })}
                      placeholder="e.g., Expenses:Job Expenses:Materials"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleSave(mapping.id)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCancel(mapping.id)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="font-medium">{mapping.qb_account_name}</div>
                <div className="text-sm text-muted-foreground">{mapping.qb_account_full_path}</div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};