import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const markVendorAsSynced = async (vendorId: string) => {
  const { error } = await supabase
    .from('vendors')
    .update({
      sync_status: 'success',
      last_synced_at: new Date().toISOString()
    })
    .eq('id', vendorId);
  
  return { error };
};

export const markProjectAsSynced = async (projectId: string) => {
  const { error } = await supabase
    .from('projects')
    .update({
      sync_status: 'success',
      last_synced_at: new Date().toISOString()
    })
    .eq('id', projectId);
  
  return { error };
};

export const resetVendorSyncStatus = async (vendorId: string) => {
  const { error } = await supabase
    .from('vendors')
    .update({
      sync_status: null,
      last_synced_at: null
    })
    .eq('id', vendorId);
  
  return { error };
};

export const resetProjectSyncStatus = async (projectId: string) => {
  const { error } = await supabase
    .from('projects')
    .update({
      sync_status: null,
      last_synced_at: null
    })
    .eq('id', projectId);
  
  return { error };
};